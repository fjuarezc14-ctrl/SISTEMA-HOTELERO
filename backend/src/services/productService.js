import { productRepository } from '../repositories/productRepository.js';
import { stayRepository } from '../repositories/stayRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { kardexRepository } from '../repositories/kardexRepository.js';
import { withTransaction } from '../config/db.js';

function operationalError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

// Valida productos, cantidades y stock; agrupa productos repetidos
async function resolveSaleItems(items) {
  const merged = new Map();
  for (const item of items) {
    const qty = Number(item?.quantity);
    if (!item?.product_id || !Number.isInteger(qty) || qty < 1) {
      throw operationalError('Cada producto debe tener una cantidad entera mayor a cero.', 400);
    }
    merged.set(item.product_id, (merged.get(item.product_id) || 0) + qty);
  }

  const lines = [];
  for (const [productId, qty] of merged) {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw operationalError('Producto no encontrado.', 404);
    }
    if (product.stock < qty) {
      throw operationalError(`Stock insuficiente de "${product.name}". Disponible: ${product.stock}, Solicitado: ${qty}`, 400);
    }
    const unitPrice = Number(product.sale_price_pen);
    lines.push({ product, qty, unitPrice, totalPrice: unitPrice * qty });
  }
  return lines;
}

// Descuenta stock dentro de una transacción, fallando si otro usuario lo agotó antes
async function decrementStockTx(txQuery, line) {
  const res = await txQuery(
    `UPDATE products SET stock = stock - $2, updated_at = NOW() WHERE id = $1 AND stock >= $2 RETURNING id`,
    [line.product.id, line.qty]
  );
  if (res.rowCount === 0) {
    throw operationalError(`Stock insuficiente de "${line.product.name}".`, 400);
  }
}

export const productService = {
  async getAllProducts(onlyActive = true) {
    return await productRepository.findAll({ onlyActive });
  },

  async createProduct(productData) {
    if (!productData.name || !productData.sale_price_pen) {
      const error = new Error('El nombre y el precio de venta son obligatorios.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    return await productRepository.create(productData);
  },

  async updateProduct(id, productData) {
    return await productRepository.update(id, productData);
  },

  // Cargar consumo a la habitación (TRANSACCIÓN ATÓMICA, uno o varios productos)
  async chargeToRoom({ stay_id, items = null, product_id, quantity = 1 }) {
    const stay = await stayRepository.findById(stay_id);
    if (!stay || stay.status !== 'active') {
      throw operationalError('Estadía activa no encontrada para esta habitación.', 404);
    }

    // Compatibilidad: carga de un solo producto
    const chargeItems = Array.isArray(items) && items.length > 0 ? items : [{ product_id, quantity }];
    const lines = await resolveSaleItems(chargeItems);
    const chargeTotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);

    // Operaciones atómicas: consumos + stock + estadía
    const consumptions = await withTransaction(async (txQuery) => {
      const created = [];
      for (const l of lines) {
        // 1. Registrar consumo
        const consumeRes = await txQuery(
          `INSERT INTO room_consumptions (stay_id, product_id, quantity, unit_price_pen, total_price_pen)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [stay.id, l.product.id, l.qty, l.unitPrice, l.totalPrice]
        );
        created.push(consumeRes.rows[0]);

        // 2. Descontar stock
        await decrementStockTx(txQuery, l);
      }

      // 3. Actualizar total consumos en estadía
      await txQuery(
        `UPDATE stays SET total_consumptions_price_pen = total_consumptions_price_pen + $2, updated_at = NOW() WHERE id = $1`,
        [stay.id, chargeTotal]
      );

      return created;
    });

    return consumptions.length === 1 ? consumptions[0] : consumptions;
  },

  // Venta directa en recepción / mostrador (varios productos, Pago Mixto y Vínculo a Habitación)
  async directSale({ items = null, product_id, quantity = 1, payment_method = 'CASH', reference_number = '', split_payments = null, stay_id = null, user_id }) {
    // Compatibilidad: venta de un solo producto
    const saleItems = Array.isArray(items) && items.length > 0 ? items : [{ product_id, quantity }];
    const lines = await resolveSaleItems(saleItems);

    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) {
      activeShift = await shiftRepository.findAnyActiveShift();
    }
    if (!activeShift) {
      throw operationalError('No hay un turno de caja abierto para registrar la venta.', 400);
    }

    const totalAmount = lines.reduce((sum, l) => sum + l.totalPrice, 0);

    // Verificar si viene una habitación vinculada
    let stayInfo = null;
    if (stay_id) {
      stayInfo = await stayRepository.findById(stay_id);
    }

    // Descontar stock de todos los productos (todo o nada)
    await withTransaction(async (txQuery) => {
      for (const l of lines) {
        await decrementStockTx(txQuery, l);
      }
    });

    const itemsLabel = lines.map((l) => `${l.product.name} (x${l.qty})`).join(', ');
    const conceptLabel = truncate(
      stayInfo ? `Venta Tienda Hab. ${stayInfo.room_number}: ${itemsLabel}` : `Venta Mostrador Tienda: ${itemsLabel}`,
      150
    );

    // Registrar en caja (soporte Pago Mixto)
    if (payment_method === 'MIXED' && Array.isArray(split_payments) && split_payments.length > 0) {
      let lastRes = null;
      for (const item of split_payments) {
        const itemAmt = Number(item.amount || 0);
        if (itemAmt > 0) {
          const methodLabel = item.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : item.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
          lastRes = await cashRepository.create({
            work_shift_id: activeShift.id,
            stay_id: stayInfo ? stayInfo.id : null,
            user_id,
            transaction_type: 'income',
            concept: truncate(`${conceptLabel} (${methodLabel})`, 150),
            category: 'store',
            amount_pen: itemAmt,
            payment_method: item.payment_method,
            reference_number: item.reference_number || reference_number || ''
          });
        }
      }
      return lastRes;
    } else {
      return await cashRepository.create({
        work_shift_id: activeShift.id,
        stay_id: stayInfo ? stayInfo.id : null,
        user_id,
        transaction_type: 'income',
        concept: conceptLabel,
        category: 'store',
        amount_pen: totalAmount,
        payment_method: payment_method || 'CASH',
        reference_number: reference_number || ''
      });
    }
  },

  // Registrar compra de mercadería (Aumento de stock en Almacén)
  async registerPurchase({ product_id, quantity = 1, unit_cost_pen, supplier_name, user_id }) {
    const product = await productRepository.findById(product_id);
    if (!product) {
      const error = new Error('Producto no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const qty = Number(quantity);
    const unitCost = Number(unit_cost_pen);
    const totalCost = qty * unitCost;

    // Incrementar stock en productos
    const currentStock = Number(product.stock || 0);
    await productRepository.update(product.id, { stock: currentStock + qty });

    // Registrar compra en kardex
    return await kardexRepository.addPurchase({
      product_id: product.id,
      user_id,
      quantity: qty,
      unit_cost_pen: unitCost,
      total_cost_pen: totalCost,
      supplier_name: supplier_name ? supplier_name.trim() : 'Proveedor General'
    });
  },

  async getPurchases() {
    return await kardexRepository.findAllPurchases();
  },

  async getKardexSummary() {
    return await kardexRepository.getKardexSummary();
  }
};

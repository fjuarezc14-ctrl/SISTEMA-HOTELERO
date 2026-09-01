import { productRepository } from '../repositories/productRepository.js';
import { stayRepository } from '../repositories/stayRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { kardexRepository } from '../repositories/kardexRepository.js';
import { withTransaction } from '../config/db.js';

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

  // Cargar consumo a la habitación (TRANSACCIÓN ATÓMICA)
  async chargeToRoom({ stay_id, product_id, quantity = 1 }) {
    const stay = await stayRepository.findById(stay_id);
    if (!stay || stay.status !== 'active') {
      const error = new Error('Estadía activa no encontrada para esta habitación.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const product = await productRepository.findById(product_id);
    if (!product) {
      const error = new Error('Producto no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const qty = Number(quantity);
    const unitPrice = Number(product.sale_price_pen);
    const totalPrice = unitPrice * qty;

    // Validar stock suficiente
    if (product.stock < qty) {
      const error = new Error(`Stock insuficiente de "${product.name}". Disponible: ${product.stock}, Solicitado: ${qty}`);
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Operaciones atómicas: consumo + stock + estadía
    const consumption = await withTransaction(async (txQuery) => {
      // 1. Registrar consumo
      const consumeRes = await txQuery(
        `INSERT INTO room_consumptions (stay_id, product_id, quantity, unit_price_pen, total_price_pen)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [stay.id, product.id, qty, unitPrice, totalPrice]
      );

      // 2. Descontar stock
      await txQuery(
        `UPDATE products SET stock = GREATEST(0, stock - $2), updated_at = NOW() WHERE id = $1`,
        [product.id, qty]
      );

      // 3. Actualizar total consumos en estadía
      const updatedConsumptionsTotal = Number(stay.total_consumptions_price_pen || 0) + totalPrice;
      await txQuery(
        `UPDATE stays SET total_consumptions_price_pen = $2, updated_at = NOW() WHERE id = $1`,
        [stay.id, updatedConsumptionsTotal]
      );

      return consumeRes.rows[0];
    });

    return consumption;
  },

  // Venta directa en recepción / mostrador (con soporte a Pago Mixto y Vínculo a Habitación)
  async directSale({ product_id, quantity = 1, payment_method = 'CASH', reference_number = '', split_payments = null, stay_id = null, user_id }) {
    const product = await productRepository.findById(product_id);
    if (!product) {
      const error = new Error('Producto no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) {
      activeShift = await shiftRepository.findAnyActiveShift();
    }
    if (!activeShift) {
      const error = new Error('No hay un turno de caja abierto para registrar la venta.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const qty = Number(quantity);
    const unitPrice = Number(product.sale_price_pen);
    const totalAmount = unitPrice * qty;

    // Validar stock suficiente
    if (product.stock < qty) {
      const error = new Error(`Stock insuficiente de "${product.name}". Disponible: ${product.stock}, Solicitado: ${qty}`);
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Verificar si viene una habitación vinculada
    let stayInfo = null;
    if (stay_id) {
      stayInfo = await stayRepository.findById(stay_id);
    }

    // Descontar stock
    await productRepository.decrementStock(product.id, qty);

    const conceptLabel = stayInfo
      ? `Venta Tienda Hab. ${stayInfo.room_number}: ${product.name} (x${qty})`
      : `Venta Mostrador Tienda: ${product.name} (x${qty})`;

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
            concept: `${conceptLabel} (${methodLabel})`,
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

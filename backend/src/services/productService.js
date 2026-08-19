import { productRepository } from '../repositories/productRepository.js';
import { stayRepository } from '../repositories/stayRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';

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

  // Cargar consumo a la habitación
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

    // Registrar consumo
    const consumption = await productRepository.addRoomConsumption({
      stay_id: stay.id,
      product_id: product.id,
      quantity: qty,
      unit_price_pen: unitPrice,
      total_price_pen: totalPrice
    });

    // Descontar stock
    await productRepository.decrementStock(product.id, qty);

    // Actualizar total_consumptions_price_pen en la estadía
    const updatedConsumptionsTotal = Number(stay.total_consumptions_price_pen || 0) + totalPrice;
    await stayRepository.updateStayPrices(stay.id, {
      total_consumptions_price_pen: updatedConsumptionsTotal
    });

    return consumption;
  },

  // Venta directa en recepción / mostrador
  async directSale({ product_id, quantity = 1, payment_method, user_id }) {
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

    // Descontar stock
    await productRepository.decrementStock(product.id, qty);

    // Registrar en caja
    return await cashRepository.create({
      work_shift_id: activeShift.id,
      user_id,
      transaction_type: 'income',
      concept: `Venta Mostrador: ${product.name} (x${qty})`,
      category: 'store',
      amount_pen: totalAmount,
      payment_method
    });
  }
};

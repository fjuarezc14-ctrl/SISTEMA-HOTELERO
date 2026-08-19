import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { stayRepository } from '../repositories/stayRepository.js';
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '../constants/index.js';

export const cashService = {
  async createTransaction({
    stay_id = null,
    user_id,
    transaction_type = 'income',
    concept,
    category = 'other',
    amount_pen,
    payment_method,
    reference_number = ''
  }) {
    if (!concept || !amount_pen || !payment_method) {
      const error = new Error('Concepto, monto y medio de pago son obligatorios.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    if (!Object.values(PAYMENT_METHODS).includes(payment_method)) {
      const error = new Error(`Medio de pago no válido. Permitidos: ${Object.values(PAYMENT_METHODS).join(', ')}`);
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) {
      activeShift = await shiftRepository.findAnyActiveShift();
    }
    if (!activeShift) {
      const error = new Error('No hay un turno de caja abierto para registrar esta transacción.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const transaction = await cashRepository.create({
      work_shift_id: activeShift.id,
      stay_id,
      user_id,
      transaction_type,
      concept: concept.trim(),
      category,
      amount_pen: Number(amount_pen),
      payment_method,
      reference_number: reference_number.trim()
    });

    // Si está vinculada a una estadía y es ingreso, sumar a total_paid_pen
    if (stay_id && transaction_type === TRANSACTION_TYPES.INCOME) {
      const stay = await stayRepository.findById(stay_id);
      if (stay) {
        const newPaid = Number(stay.total_paid_pen) + Number(amount_pen);
        await stayRepository.updateStayPrices(stay.id, { total_paid_pen: newPaid });
      }
    }

    return transaction;
  },

  async getTransactions({ limit, offset, dateFrom, dateTo }) {
    return await cashRepository.findAll({ limit, offset, dateFrom, dateTo });
  }
};

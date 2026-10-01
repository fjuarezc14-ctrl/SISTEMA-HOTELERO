import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { stayRepository } from '../repositories/stayRepository.js';
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '../constants/index.js';
import { requireAdminAuthorization } from './adminAuthorizationService.js';
import { issueVoucher } from './voucherService.js';

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

    const amount = Number(amount_pen);
    if (!Number.isFinite(amount) || amount <= 0) {
      const error = new Error('El monto debe ser mayor a cero.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    if (!Object.values(TRANSACTION_TYPES).includes(transaction_type)) {
      const error = new Error('Tipo de movimiento no válido.');
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
      concept: String(concept).trim().slice(0, 150),
      category,
      amount_pen: amount,
      payment_method,
      reference_number: String(reference_number || '').trim().slice(0, 50)
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

  async getTransactions({ limit, offset, dateFrom, dateTo, shiftId }) {
    return await cashRepository.findAll({ limit, offset, dateFrom, dateTo, shiftId });
  },

  async cancelTransaction(id, { reason = '', requester, admin_username, admin_password, ipAddress = '' }) {
    const transaction = await cashRepository.findById(id);
    if (!transaction) {
      const error = new Error('Transacción de caja no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (transaction.is_cancelled) {
      const error = new Error('Esta transacción ya fue anulada anteriormente.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Anular un movimiento requiere autorización de un administrador
    await requireAdminAuthorization({
      requester,
      adminUsername: admin_username,
      adminPassword: admin_password,
      action: 'CASH_CANCEL_AUTHORIZED',
      details: `Anulación de "${transaction.concept}" por S/ ${Number(transaction.amount_pen).toFixed(2)}. Motivo: ${reason || 'Sin motivo'}.`,
      ipAddress
    });

    // Revertir pago de estadía si estaba vinculada
    if (transaction.stay_id && transaction.transaction_type === TRANSACTION_TYPES.INCOME) {
      const stay = await stayRepository.findById(transaction.stay_id);
      if (stay) {
        const newPaid = Math.max(0, Number(stay.total_paid_pen) - Number(transaction.amount_pen));
        await stayRepository.updateStayPrices(stay.id, { total_paid_pen: newPaid });
      }
    }

    return await cashRepository.cancelTransaction(id, { reason });
  },

  async updateVoucher(id, voucherData) {
    const transaction = await cashRepository.findById(id);
    if (!transaction) {
      const error = new Error('Transacción de caja no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    if (transaction.is_cancelled) {
      const error = new Error('No se puede emitir comprobante de un movimiento anulado.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    if (transaction.transaction_type !== 'income') {
      const error = new Error('Solo se emiten comprobantes para ingresos.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    if (transaction.voucher_type === 'BOLETA' || transaction.voucher_type === 'FACTURA') {
      const error = new Error(`Este movimiento ya tiene ${transaction.voucher_type.toLowerCase()} ${transaction.voucher_number}.`);
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    const type = String(voucherData.voucher_type || '').toUpperCase();
    if (type !== 'BOLETA' && type !== 'FACTURA') {
      const error = new Error('Tipo de comprobante no válido (BOLETA o FACTURA).');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    // El número lo asigna el servidor (correlativo), nunca el cliente
    const voucher = await issueVoucher({
      voucher_type: type,
      customer_ruc: voucherData.customer_ruc,
      customer_business_name: voucherData.customer_business_name
    });
    return await cashRepository.updateVoucher(id, voucher);
  }
};

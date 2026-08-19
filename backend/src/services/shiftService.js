import { shiftRepository } from '../repositories/shiftRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';

export const shiftService = {
  async getActiveShift(userId = null) {
    let shift = null;
    if (userId) {
      shift = await shiftRepository.findActiveShiftByUserId(userId);
    }
    if (!shift) {
      shift = await shiftRepository.findAnyActiveShift();
    }

    if (!shift) {
      return null;
    }

    // Calcular totales en tiempo real
    const totals = await shiftRepository.calculateShiftTotals(shift.id);
    const initialCash = Number(shift.initial_cash_pen || 0);
    const cashNet = Number(totals.cash_net || 0);
    const expectedCash = initialCash + cashNet;

    return {
      ...shift,
      live_expected_cash_pen: expectedCash,
      live_total_yape_plin_pen: Number(totals.total_yape_plin || 0),
      live_total_card_pen: Number(totals.total_card || 0),
      live_total_revenue_pen: Number(totals.total_income || 0)
    };
  },

  async openShift({ user_id, initial_cash_pen = 0, shift_notes = '' }) {
    const existing = await shiftRepository.findActiveShiftByUserId(user_id);
    if (existing) {
      const error = new Error('Ya tienes un turno activo abierto. Debes cerrarlo antes de abrir uno nuevo.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    return await shiftRepository.openShift({
      user_id,
      initial_cash_pen: Number(initial_cash_pen || 0),
      shift_notes: shift_notes.trim()
    });
  },

  async closeShift(shiftId, { actual_cash_pen, shift_notes = '' }) {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift) {
      const error = new Error('Turno de trabajo no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (shift.status === 'closed') {
      const error = new Error('Este turno ya fue cerrado previamente.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const totals = await shiftRepository.calculateShiftTotals(shift.id);
    const initialCash = Number(shift.initial_cash_pen || 0);
    const cashNet = Number(totals.cash_net || 0);
    const expectedCash = initialCash + cashNet;
    const actualCash = Number(actual_cash_pen || 0);
    const difference = actualCash - expectedCash;

    return await shiftRepository.closeShift(shift.id, {
      actual_cash_pen: actualCash,
      difference_cash_pen: difference,
      expected_cash_pen: expectedCash,
      total_yape_plin_pen: Number(totals.total_yape_plin || 0),
      total_card_pen: Number(totals.total_card || 0),
      total_revenue_pen: Number(totals.total_income || 0),
      shift_notes: shift_notes.trim()
    });
  },

  async getShiftHistory({ limit = 50, offset = 0 } = {}) {
    return await shiftRepository.findAll({ limit, offset });
  },

  async getShiftTransactions(shiftId) {
    return await cashRepository.findByShiftId(shiftId);
  }
};

import { shiftRepository } from '../repositories/shiftRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { requireAdminAuthorization } from './adminAuthorizationService.js';
import { isAdminRole } from '../middlewares/authMiddleware.js';

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
      live_total_revenue_pen: Number(totals.total_income || 0),
      live_revenue_stay: Number(totals.revenue_stay || 0),
      live_revenue_store: Number(totals.revenue_store || 0),
      live_revenue_incidents: Number(totals.revenue_incidents || 0),
      live_total_expenses: Number(totals.total_expense || 0)
    };
  },

  async getActiveShiftTransactions(shiftId) {
    return await shiftRepository.findShiftTransactions(shiftId);
  },

  async openShift({ requester, initial_cash_pen = 0, shift_notes = '', admin_username, admin_password, ipAddress = '' }) {
    // Una sola caja: no se permite abrir otro turno mientras haya uno abierto
    const existing = await shiftRepository.findAnyActiveShift();
    if (existing) {
      const error = new Error('Ya hay un turno de caja abierto. Debe cerrarse antes de abrir uno nuevo.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const initialCash = Number(initial_cash_pen || 0);
    if (!Number.isFinite(initialCash) || initialCash < 0) {
      const error = new Error('El fondo inicial debe ser un monto válido.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Solo un administrador puede abrir caja (o autorizarlo con sus credenciales)
    await requireAdminAuthorization({
      requester,
      adminUsername: admin_username,
      adminPassword: admin_password,
      action: 'SHIFT_OPEN_AUTHORIZED',
      details: `Apertura de turno de ${requester.full_name} con fondo S/ ${initialCash.toFixed(2)}.`,
      ipAddress
    });

    return await shiftRepository.openShift({
      user_id: requester.id,
      initial_cash_pen: initialCash,
      shift_notes: String(shift_notes || '').trim()
    });
  },

  async closeShift(shiftId, { requester, actual_cash_pen, shift_notes = '' }) {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift) {
      const error = new Error('Turno de trabajo no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    // Solo quien abrió el turno o un administrador puede cerrarlo
    if (shift.user_id !== requester.id && !isAdminRole(requester.role)) {
      const error = new Error('Solo el cajero que abrió el turno o un administrador puede cerrarlo.');
      error.statusCode = 403;
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
      shift_notes: String(shift_notes || '').trim()
    });
  },

  async getShiftHistory({ limit = 50, offset = 0 } = {}) {
    return await shiftRepository.findAll({ limit, offset });
  },

  async getShiftTransactions(shiftId) {
    return await cashRepository.findByShiftId(shiftId);
  }
};

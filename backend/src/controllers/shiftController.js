import { shiftService } from '../services/shiftService.js';

export const shiftController = {
  async getActiveShift(req, res, next) {
    try {
      const shift = await shiftService.getActiveShift(req.user.id);
      res.json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  },

  async openShift(req, res, next) {
    try {
      const { initial_cash_pen, shift_notes } = req.body;
      const shift = await shiftService.openShift({
        user_id: req.user.id,
        initial_cash_pen,
        shift_notes
      });
      res.status(201).json({
        success: true,
        message: 'Turno de caja abierto correctamente.',
        data: shift
      });
    } catch (error) {
      next(error);
    }
  },

  async closeShift(req, res, next) {
    try {
      const { id } = req.params;
      const { actual_cash_pen, shift_notes } = req.body;
      const closedShift = await shiftService.closeShift(id, {
        actual_cash_pen,
        shift_notes
      });
      res.json({
        success: true,
        message: 'Turno cerrado y arqueo guardado correctamente.',
        data: closedShift
      });
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const shifts = await shiftService.getShiftHistory({ limit, offset });
      res.json({
        success: true,
        data: shifts
      });
    } catch (error) {
      next(error);
    }
  },

  async getShiftTransactions(req, res, next) {
    try {
      const transactions = await shiftService.getShiftTransactions(req.params.id);
      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      next(error);
    }
  }
};

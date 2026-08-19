import { cashService } from '../services/cashService.js';

export const cashController = {
  async createTransaction(req, res, next) {
    try {
      const transaction = await cashService.createTransaction({
        ...req.body,
        user_id: req.user.id
      });
      res.status(201).json({
        success: true,
        message: 'Movimiento de caja registrado correctamente.',
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const { limit, offset, dateFrom, dateTo } = req.query;
      const transactions = await cashService.getTransactions({ limit, offset, dateFrom, dateTo });
      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      next(error);
    }
  }
};

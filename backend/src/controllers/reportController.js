import { reportService } from '../services/reportService.js';

export const reportController = {
  async getKPIs(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const data = await reportService.getKPIs({ startDate, endDate });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getMincetur(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const data = await reportService.getMinceturReport({ startDate, endDate });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};

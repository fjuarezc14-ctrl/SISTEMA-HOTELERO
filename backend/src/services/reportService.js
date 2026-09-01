import { reportRepository } from '../repositories/reportRepository.js';

export const reportService = {
  async getKPIs({ startDate, endDate }) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));
    return await reportRepository.getKPIs({ startDate: start.toISOString(), endDate: end.toISOString() });
  },

  async getMinceturReport({ startDate, endDate }) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));
    return await reportRepository.getMinceturReport({ startDate: start.toISOString(), endDate: end.toISOString() });
  }
};

import { maintenanceService } from '../services/maintenanceService.js';

export const maintenanceController = {
  async getAll(req, res, next) {
    try {
      const { status, roomId } = req.query;
      const tickets = await maintenanceService.getTickets({ status, roomId });
      res.json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const ticket = await maintenanceService.createTicket({
        ...req.body,
        user_creator_id: req.user.id
      });
      res.status(201).json({
        success: true,
        message: 'Ticket de mantenimiento creado. Habitación puesta en mantenimiento.',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  },

  async resolve(req, res, next) {
    try {
      const ticket = await maintenanceService.resolveTicket(req.params.id);
      res.json({
        success: true,
        message: 'Ticket resuelto correctamente. Habitación restablecida a disponible.',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }
};

import { reservationService } from '../services/reservationService.js';

export const reservationController = {
  async getAll(req, res, next) {
    try {
      const { status } = req.query;
      const reservations = await reservationService.getAllReservations(status);
      res.json({ success: true, data: reservations });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const reservation = await reservationService.createReservation({
        ...req.body,
        user_id: req.user.id
      });
      res.status(201).json({
        success: true,
        message: 'Reserva registrada exitosamente.',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  },

  async convertToCheckIn(req, res, next) {
    try {
      const { id } = req.params;
      const { stay_type, hours_count } = req.body;
      const stay = await reservationService.convertToCheckIn(id, {
        user_id: req.user.id,
        stay_type,
        hours_count
      });
      res.json({
        success: true,
        message: 'Reserva convertida a Check-in activo.',
        data: stay
      });
    } catch (error) {
      next(error);
    }
  },

  async cancel(req, res, next) {
    try {
      const reservation = await reservationService.cancelReservation(req.params.id);
      res.json({
        success: true,
        message: 'Reserva cancelada.',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }
};

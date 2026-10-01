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
      const {
        room_id, customer_data, start_date, end_date, stay_type, units, deposit_amount_pen, payment_method,
        reference_number, split_payments, notes, voucher_type, customer_ruc, customer_business_name
      } = req.body;
      const reservation = await reservationService.createReservation({
        room_id, customer_data, start_date, end_date, stay_type, units, deposit_amount_pen, payment_method,
        reference_number, split_payments, notes, voucher_type, customer_ruc, customer_business_name,
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
      const { initial_payment, companion_name } = req.body;
      const stay = await reservationService.convertToCheckIn(id, {
        user_id: req.user.id,
        initial_payment,
        companion_name
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
  },

  async quote(req, res, next) {
    try {
      const { room_id, start_date, stay_type, units, end_date, exclude_reservation_id } = req.query;
      const quote = await reservationService.quoteReservation({
        room_id,
        start_date,
        stay_type: stay_type || undefined,
        units: units !== undefined && units !== '' ? Number(units) : undefined,
        end_date: end_date || undefined,
        exclude_reservation_id: exclude_reservation_id || null
      });
      res.json({ success: true, data: quote });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { room_id, start_date, stay_type, units, end_date, notes } = req.body;
      const reservation = await reservationService.updateReservation(req.params.id, { room_id, start_date, stay_type, units, end_date, notes });
      res.json({
        success: true,
        message: 'Reserva actualizada exitosamente.',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  },

  async noShow(req, res, next) {
    try {
      const reservation = await reservationService.noShowReservation(req.params.id);
      res.json({
        success: true,
        message: 'Reserva marcada como No-Show (Inasistencia).',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }
};

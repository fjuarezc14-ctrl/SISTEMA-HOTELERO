import { stayService } from '../services/stayService.js';

export const stayController = {
  async getAllActive(req, res, next) {
    try {
      const stays = await stayService.getAllActiveStays();
      res.json({ success: true, data: stays });
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req, res, next) {
    try {
      const { limit = 100, offset = 0, dateFrom, dateTo } = req.query;
      const stays = await stayService.getStayHistory({ limit: Number(limit), offset: Number(offset), dateFrom, dateTo });
      res.json({ success: true, data: stays });
    } catch (error) {
      next(error);
    }
  },

  async getByRoom(req, res, next) {
    try {
      const stay = await stayService.getActiveStayByRoom(req.params.roomId);
      res.json({ success: true, data: stay });
    } catch (error) {
      next(error);
    }
  },

  async quoteCheckIn(req, res, next) {
    try {
      const { room_id, stay_type, units, hours_count, reservation_id } = req.query;
      const quote = await stayService.quoteCheckIn({
        room_id,
        stay_type,
        units: units !== undefined && units !== '' ? Number(units) : undefined,
        hours_count: hours_count !== undefined ? Number(hours_count) : undefined,
        reservation_id: reservation_id || null
      });
      res.json({ success: true, data: quote });
    } catch (error) {
      next(error);
    }
  },

  async checkIn(req, res, next) {
    try {
      // Solo campos permitidos (el precio lo calcula el servidor)
      const { room_id, customer_data, stay_type, units, hours_count, companion_name, companions, initial_payment } = req.body;
      const stay = await stayService.checkIn({
        room_id,
        customer_data,
        stay_type,
        units,
        hours_count,
        companion_name,
        companions,
        initial_payment,
        user_id: req.user.id
      });
      res.status(201).json({
        success: true,
        message: 'Check-in realizado exitosamente.',
        data: stay
      });
    } catch (error) {
      next(error);
    }
  },

  async quoteCheckOut(req, res, next) {
    try {
      const quote = await stayService.quoteCheckOut(req.params.id, {
        penalty_amount_pen: req.query.penalty_amount_pen !== undefined ? Number(req.query.penalty_amount_pen) : 0
      });
      res.json({ success: true, data: quote });
    } catch (error) {
      next(error);
    }
  },

  async checkOut(req, res, next) {
    try {
      const { stay_id, final_payment, incident_data } = req.body;
      const completedStay = await stayService.checkOut({
        stay_id: stay_id || req.params.id,
        user_id: req.user.id,
        final_payment,
        incident_data
      });
      res.json({
        success: true,
        message: 'Check-out realizado exitosamente. Habitación enviada a limpieza.',
        data: completedStay
      });
    } catch (error) {
      next(error);
    }
  },

  async addExtraHours(req, res, next) {
    try {
      const stay = await stayService.addExtraHours({
        stay_id: req.params.id,
        hours_count: req.body.hours_count,
        payment_method: req.body.payment_method,
        reference_number: req.body.reference_number,
        split_payments: req.body.split_payments || null,
        voucher_type: req.body.voucher_type,
        customer_ruc: req.body.customer_ruc,
        customer_business_name: req.body.customer_business_name,
        user_id: req.user.id
      });
      res.json({
        success: true,
        message: 'Horas extras agregadas e ingresadas en caja chica exitosamente.',
        data: stay
      });
    } catch (error) {
      next(error);
    }
  }
};

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

  async checkIn(req, res, next) {
    try {
      const stay = await stayService.checkIn({
        ...req.body,
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

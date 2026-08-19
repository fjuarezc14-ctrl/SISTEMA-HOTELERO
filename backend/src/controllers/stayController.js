import { stayService } from '../services/stayService.js';

export const stayController = {
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
      const { stay_id, final_payment } = req.body;
      const completedStay = await stayService.checkOut({
        stay_id: stay_id || req.params.id,
        user_id: req.user.id,
        final_payment
      });
      res.json({
        success: true,
        message: 'Check-out realizado exitosamente. Habitación enviada a limpieza.',
        data: completedStay
      });
    } catch (error) {
      next(error);
    }
  }
};

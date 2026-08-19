import { settingsService, userService } from '../services/settingsService.js';

export const settingsController = {
  async getHotelInfo(req, res, next) {
    try {
      const info = await settingsService.getHotelInfo();
      res.json({ success: true, data: info });
    } catch (error) {
      next(error);
    }
  },

  async updateHotelInfo(req, res, next) {
    try {
      const info = await settingsService.updateHotelInfo(req.body);
      res.json({
        success: true,
        message: 'Información del hotel actualizada correctamente.',
        data: info
      });
    } catch (error) {
      next(error);
    }
  },

  async getAuditLogs(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const logs = await settingsService.getAuditLogs({ limit, offset });
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
};

export const userController = {
  async getAll(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente.',
        data: user
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Usuario actualizado.',
        data: user
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { password } = req.body;
      await userService.resetPassword(req.params.id, password);
      res.json({
        success: true,
        message: 'Contraseña actualizada correctamente.'
      });
    } catch (error) {
      next(error);
    }
  }
};

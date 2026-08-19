import { authService } from '../services/authService.js';

export const authController = {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await authService.login({ username, password, ipAddress });
      res.json({
        success: true,
        message: 'Sesión iniciada correctamente.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

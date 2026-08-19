import bcrypt from 'bcryptjs';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { userRepository } from '../repositories/userRepository.js';

export const settingsService = {
  async getHotelInfo() {
    return await settingsRepository.getHotelInfo();
  },

  async updateHotelInfo(infoData) {
    return await settingsRepository.updateHotelInfo(infoData);
  },

  async getAuditLogs({ limit, offset }) {
    return await settingsRepository.getAuditLogs({ limit, offset });
  }
};

export const userService = {
  async getAllUsers() {
    return await userRepository.findAll();
  },

  async createUser({ username, password, full_name, role = 'receptionist', is_active = true }) {
    if (!username || !password || !full_name) {
      const error = new Error('Nombre de usuario, contraseña y nombre completo son requeridos.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    return await userRepository.create({
      username: username.trim().toLowerCase(),
      password_hash,
      full_name: full_name.trim(),
      role,
      is_active
    });
  },

  async updateUser(id, userData) {
    return await userRepository.update(id, userData);
  },

  async resetPassword(id, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      const error = new Error('La contraseña debe tener al menos 6 caracteres.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    return await userRepository.updatePassword(id, password_hash);
  }
};

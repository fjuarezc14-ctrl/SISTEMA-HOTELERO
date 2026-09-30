import bcrypt from 'bcryptjs';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { ROLES, ASSIGNABLE_MODULES } from '../constants/index.js';

// Administradores: siempre todos los módulos (NULL). Resto: solo módulos asignables válidos.
function normalizeModules(role, modules) {
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return null;
  if (modules === undefined) return undefined;
  if (!Array.isArray(modules)) return null;
  return modules.filter((m) => ASSIGNABLE_MODULES.includes(m));
}

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

  async createUser({ username, password, full_name, role = 'receptionist', is_active = true, allowed_modules }) {
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
      plain_password: password,
      full_name: full_name.trim(),
      role,
      is_active,
      allowed_modules: normalizeModules(role, allowed_modules) ?? null
    });
  },

  async updateUser(id, userData) {
    const current = await userRepository.findById(id);
    if (!current) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    const role = userData.role || current.role;
    return await userRepository.update(id, {
      ...userData,
      allowed_modules: normalizeModules(role, userData.allowed_modules)
    });
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
    return await userRepository.updatePassword(id, password_hash, newPassword);
  }
};

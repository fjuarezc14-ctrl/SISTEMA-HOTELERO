import bcrypt from 'bcryptjs';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { ROLES, ASSIGNABLE_MODULES } from '../constants/index.js';

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.isOperational = true;
  return error;
}

// Reglas de jerarquía: solo un super_admin puede crear, editar o asignar super_admin
function assertCanManage(requester, targetRole, newRole) {
  const touchesSuperAdmin = targetRole === ROLES.SUPER_ADMIN || newRole === ROLES.SUPER_ADMIN;
  if (touchesSuperAdmin && requester.role !== ROLES.SUPER_ADMIN) {
    throw forbidden('Solo un Super Administrador puede gestionar cuentas de Super Administrador.');
  }
}

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
    const checkRange = (value, field, min, max) => {
      if (value === undefined || value === null || value === '') return undefined;
      const n = Number(value);
      if (!Number.isInteger(n) || n < min || n > max) {
        const error = new Error(`${field} debe ser un número entero entre ${min} y ${max}.`);
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }
      return n;
    };
    return await settingsRepository.updateHotelInfo({
      ...infoData,
      grace_period_minutes: checkRange(infoData.grace_period_minutes, 'La tolerancia de salida (minutos)', 0, 240),
      cleaning_buffer_minutes: checkRange(infoData.cleaning_buffer_minutes, 'El margen de limpieza (minutos)', 0, 720)
    });
  },

  async getAuditLogs({ limit, offset }) {
    return await settingsRepository.getAuditLogs({ limit, offset });
  }
};

export const userService = {
  async getAllUsers() {
    return await userRepository.findAll();
  },

  async createUser({ username, password, full_name, role = 'receptionist', is_active = true, allowed_modules }, requester) {
    if (!username || !password || !full_name) {
      const error = new Error('Nombre de usuario, contraseña y nombre completo son requeridos.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    if (!Object.values(ROLES).includes(role)) {
      const error = new Error('Rol no válido.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    if (String(password).length < 6) {
      const error = new Error('La contraseña debe tener al menos 6 caracteres.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    assertCanManage(requester, null, role);

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

  async updateUser(id, userData, requester) {
    const current = await userRepository.findById(id);
    if (!current) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    if (userData.role && !Object.values(ROLES).includes(userData.role)) {
      const error = new Error('Rol no válido.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    assertCanManage(requester, current.role, userData.role);

    // Evitar que un usuario se bloquee a sí mismo
    if (current.id === requester.id) {
      if (userData.is_active === false) throw forbidden('No puedes desactivar tu propia cuenta.');
      if (userData.role && userData.role !== current.role) throw forbidden('No puedes cambiar tu propio rol.');
    }

    const role = userData.role || current.role;
    return await userRepository.update(id, {
      username: userData.username,
      full_name: userData.full_name,
      role: userData.role,
      is_active: userData.is_active,
      allowed_modules: normalizeModules(role, userData.allowed_modules)
    });
  },

  async resetPassword(id, newPassword, requester) {
    const target = await userRepository.findById(id);
    if (!target) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    assertCanManage(requester, target.role, null);

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

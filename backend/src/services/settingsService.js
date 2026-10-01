import bcrypt from 'bcryptjs';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { ROLES, ASSIGNABLE_MODULES } from '../constants/index.js';
import * as v from '../utils/validate.js';

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
    const opt = (value, field, opts) => (value === undefined || value === null ? undefined : v.text(value, field, opts));
    const ruc = opt(infoData.ruc, 'El RUC', { required: false, max: 11 });
    if (ruc && !/^(10|15|17|20)\d{9}$/.test(ruc)) throw v.badRequest('El RUC del hotel debe tener 11 dígitos.');
    const time = (value, field) => {
      const t = opt(value, field, { max: 5 });
      if (t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw v.badRequest(`${field} debe tener formato HH:MM.`);
      return t;
    };
    const checkout = time(infoData.overnight_checkout_time, 'La hora de salida de la estadía por días');
    const pernocteStart = time(infoData.pernocte_start_time, 'La hora desde la que se vende el pernocte');
    const pernocteCheckout = time(infoData.pernocte_checkout_time, 'La hora de salida del pernocte');
    const standardCheckin = time(infoData.standard_checkin_time, 'La hora de ingreso');

    // Logo: URL http(s) o imagen subida (png, jpg, webp o gif) de hasta ~500 KB
    let logo = infoData.logo_url;
    if (logo !== undefined && logo !== null) {
      logo = String(logo).trim();
      const isUrl = /^https?:\/\/\S+$/i.test(logo) && logo.length <= 1000;
      const isImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(logo) && logo.length <= 700000;
      if (logo && !isUrl && !isImage) {
        throw v.badRequest('El logo debe ser una URL http(s) o una imagen PNG, JPG, WEBP o GIF de hasta 500 KB.');
      }
    }

    // Regla del abono mínimo para reservar
    let depositType;
    let depositValue;
    if (infoData.reservation_deposit_type !== undefined || infoData.reservation_deposit_value !== undefined) {
      const current = await settingsRepository.getHotelInfo();
      depositType = v.oneOf(infoData.reservation_deposit_type ?? current.reservation_deposit_type, 'El tipo de abono mínimo', ['percent', 'fixed']);
      depositValue =
        depositType === 'percent'
          ? v.money(infoData.reservation_deposit_value ?? current.reservation_deposit_value, 'El porcentaje de abono', { min: 0, max: 100 })
          : v.money(infoData.reservation_deposit_value ?? current.reservation_deposit_value, 'El abono mínimo fijo', { min: 0, max: 10000 });
    }

    return await settingsRepository.updateHotelInfo({
      reservation_deposit_type: depositType,
      reservation_deposit_value: depositValue,
      business_name: opt(infoData.business_name, 'La razón social', { min: 2, max: 150 }),
      trade_name: opt(infoData.trade_name, 'El nombre comercial', { min: 2, max: 150 }),
      ruc,
      address: opt(infoData.address, 'La dirección', { max: 255, required: false }),
      phone: opt(infoData.phone, 'El teléfono', { max: 30, required: false }),
      email: opt(infoData.email, 'El correo', { max: 100, required: false }),
      overnight_checkout_time: checkout,
      pernocte_start_time: pernocteStart,
      pernocte_checkout_time: pernocteCheckout,
      standard_checkin_time: standardCheckin,
      ticket_footer_legend: opt(infoData.ticket_footer_legend, 'La leyenda del ticket', { max: 500, required: false }),
      logo_url: logo,
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

import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { ROLES, ASSIGNABLE_MODULES } from '../constants/index.js';
import { JWT_SECRET } from '../config/jwt.js';

export const isAdminRole = (role) => role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

/**
 * Middleware para validar el token JWT en las solicitudes protegidas.
 * Carga el usuario desde la base de datos en cada solicitud para que la desactivación
 * o el cambio de rol/permisos surtan efecto de inmediato (sin esperar a que expire el token).
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: Token de autenticación no proporcionado.'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado: Token inválido o expirado.'
    });
  }

  try {
    const result = await query(
      'SELECT id, username, full_name, role, is_active, allowed_modules FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado: Usuario desactivado o inexistente.'
      });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware para autorizar roles específicos
 * @param {Array<string>} allowedRoles Lista de roles permitidos
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes los permisos necesarios para realizar esta acción.'
      });
    }

    next();
  };
}

/** ¿El usuario tiene acceso a alguno de los módulos? (allowed_modules NULL = todos los operativos) */
export function hasModuleAccess(user, modules) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  const allowed = Array.isArray(user.allowed_modules) ? user.allowed_modules : ASSIGNABLE_MODULES;
  return modules.some((m) => allowed.includes(m));
}

/**
 * Middleware para exigir acceso a al menos uno de los módulos indicados.
 * Los administradores siempre tienen acceso.
 */
export function requireModule(...modules) {
  return (req, res, next) => {
    if (!hasModuleAccess(req.user, modules)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este módulo. Solicita el permiso al administrador.'
      });
    }
    next();
  };
}

/** Atajo: solo administradores */
export const requireAdmin = authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN);

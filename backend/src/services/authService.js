import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { loginGuard } from '../utils/loginGuard.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

export const authService = {
  async login({ username, password, ipAddress = '' }) {
    if (!username || !password) {
      const error = new Error('Por favor ingresa usuario y contraseña.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const guardKey = loginGuard.key(ipAddress, username);
    loginGuard.assertNotLocked(guardKey);

    const user = await userRepository.findByUsername(username.trim());
    if (!user) {
      loginGuard.registerFailure(guardKey);
      const error = new Error('Credenciales incorrectas.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      loginGuard.registerFailure(guardKey);
      const error = new Error('Credenciales incorrectas.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    loginGuard.registerSuccess(guardKey);

    if (!user.is_active) {
      const error = new Error('Este usuario se encuentra desactivado. Contacta al administrador.');
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Registro de auditoría
    await settingsRepository.addAuditLog({
      user_id: user.id,
      user_name: user.full_name,
      role: user.role,
      action: 'LOGIN',
      details: `Inicio de sesión exitoso de ${user.username}`,
      ip_address: ipAddress
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        allowed_modules: user.allowed_modules ?? null
      }
    };
  },

  // Perfil actualizado desde la base de datos (permisos vigentes)
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user || !user.is_active) {
      const error = new Error('Usuario no encontrado o desactivado.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      allowed_modules: user.allowed_modules ?? null
    };
  }
};

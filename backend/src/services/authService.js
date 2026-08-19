import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'valetec_hotel_peru_jwt_secret_key_2026_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const authService = {
  async login({ username, password, ipAddress = '' }) {
    if (!username || !password) {
      const error = new Error('Por favor ingresa usuario y contraseña.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const user = await userRepository.findByUsername(username.trim());
    if (!user) {
      const error = new Error('Credenciales incorrectas.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Este usuario se encuentra desactivado. Contacta al administrador.');
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const error = new Error('Credenciales incorrectas.');
      error.statusCode = 401;
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
        role: user.role
      }
    };
  }
};

import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: La variable de entorno JWT_SECRET es obligatoria en modo producción.');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'valetec_hotel_peru_jwt_secret_key_2026_secure';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'valetec_hotel_peru_jwt_secret_key_2026_secure';

/**
 * Middleware para validar el token JWT en las solicitudes protegidas
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: Token de autenticación no proporcionado.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: Token inválido o expirado.'
    });
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

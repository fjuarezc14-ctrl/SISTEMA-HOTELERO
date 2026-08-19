/**
 * Middleware centralizado para captura y manejo de errores globales
 * Cumple con la directriz de VT VALETEC: logs estructurados sin exponer detalles internos al cliente.
 */

export function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const errorContext = {
    timestamp,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? { id: req.user.id, username: req.user.username } : 'Anónimo',
    errorMessage: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  // Registro de log estructurado en el servidor
  console.error('🚨 [ERROR ESTRUCTURADO EN SERVIDOR]:', JSON.stringify(errorContext, null, 2));

  // Manejo de errores conocidos de PostgreSQL
  let statusCode = err.statusCode || 500;
  let userFriendlyMessage = 'Ocurrió un error interno en el servidor. Por favor, intenta de nuevo más tarde.';

  if (err.code === '23505') {
    // Violación de unicidad en PostgreSQL
    statusCode = 409;
    userFriendlyMessage = 'El registro ya existe en el sistema (código o documento duplicado).';
  } else if (err.code === '23503') {
    // Violación de clave foránea
    statusCode = 400;
    userFriendlyMessage = 'No se puede completar la operación debido a dependencias con otros registros.';
  } else if (err.isOperational) {
    userFriendlyMessage = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message: userFriendlyMessage,
    errorId: Date.now()
  });
}

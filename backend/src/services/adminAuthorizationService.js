import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { isAdminRole } from '../middlewares/authMiddleware.js';
import { loginGuard } from '../utils/loginGuard.js';

function operationalError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

/**
 * Autorización de un administrador para acciones sensibles (abrir turno, anular movimientos).
 * - Si quien solicita ya es administrador, se autoriza directamente.
 * - Si no, se exigen usuario y contraseña de un administrador activo.
 * Devuelve el administrador que autorizó y registra la acción en auditoría.
 */
export async function requireAdminAuthorization({ requester, adminUsername, adminPassword, action, details = '', ipAddress = '' }) {
  if (isAdminRole(requester.role)) {
    return requester;
  }

  if (!adminUsername || !adminPassword) {
    throw operationalError('Esta acción requiere la autorización de un administrador (usuario y contraseña).', 403);
  }

  const guardKey = loginGuard.key(ipAddress, `auth:${adminUsername}`);
  loginGuard.assertNotLocked(guardKey);

  const admin = await userRepository.findByUsername(String(adminUsername).trim().toLowerCase());
  const valid =
    admin && admin.is_active && isAdminRole(admin.role) && (await bcrypt.compare(String(adminPassword), admin.password_hash));

  if (!valid) {
    loginGuard.registerFailure(guardKey);
    await settingsRepository.addAuditLog({
      user_id: requester.id,
      user_name: requester.full_name,
      role: requester.role,
      action: `${action}_DENIED`,
      details: `Autorización de administrador rechazada (usuario: ${adminUsername}). ${details}`,
      ip_address: ipAddress
    });
    throw operationalError('Credenciales de administrador incorrectas.', 403);
  }

  loginGuard.registerSuccess(guardKey);
  await settingsRepository.addAuditLog({
    user_id: requester.id,
    user_name: requester.full_name,
    role: requester.role,
    action,
    details: `Autorizado por administrador ${admin.full_name} (@${admin.username}). ${details}`,
    ip_address: ipAddress
  });

  return { id: admin.id, username: admin.username, full_name: admin.full_name, role: admin.role };
}

// Módulos que se pueden asignar al personal (debe coincidir con ASSIGNABLE_MODULES del backend)
export const ASSIGNABLE_MODULES = [
  { id: 'reception', label: 'Recepción' },
  { id: 'reservations', label: 'Reservaciones' },
  { id: 'store', label: 'Tienda & Consumos' },
  { id: 'cash', label: 'Caja & Movimientos' },
  { id: 'customers', label: 'Clientes / DNI' },
  { id: 'incidents', label: 'Incidentes' },
  { id: 'textiles', label: 'Gestión Textiles' }
];

// Módulos de administración: dependen del rol, no se asignan
export const ADMIN_MODULES = ['settings', 'users', 'reports'];

export const isAdminRole = (role) => role === 'super_admin' || role === 'admin';

/** ¿Puede el usuario entrar al módulo? allowed_modules NULL = todos los operativos */
export function canAccessModule(user, moduleId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (ADMIN_MODULES.includes(moduleId)) return false;
  if (!Array.isArray(user.allowed_modules)) return true;
  return user.allowed_modules.includes(moduleId);
}

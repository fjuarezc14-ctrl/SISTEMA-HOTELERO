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

// Módulos de administración: dependen del rol, no se asignan a roles operativos
export const ADMIN_MODULES = ['settings', 'users', 'reports'];

// Módulos completos del sistema con detalles para la matriz de roles
export const ALL_SYSTEM_MODULES = [
  { id: 'reception', label: 'Recepción & Habitaciones', category: 'Operativo', description: 'Rack de habitaciones, check-in, check-out, estado de cuartos' },
  { id: 'reservations', label: 'Reservaciones', category: 'Operativo', description: 'Línea de tiempo, cotización, bloqueo de fechas y abonos' },
  { id: 'store', label: 'Tienda & Frigobar', category: 'Operativo', description: 'Venta directa en mostrador y consumos a habitación' },
  { id: 'cash', label: 'Caja & Movimientos', category: 'Finanzas', description: 'Apertura y cierre de turnos, arqueo y libro de movimientos' },
  { id: 'customers', label: 'Clientes & Huéspedes', category: 'Operativo', description: 'Directorio de clientes, consulta DNI/RUC y lista negra/vetos' },
  { id: 'incidents', label: 'Incidentes & Penalidades', category: 'Operativo', description: 'Reportes de roturas, daños o pérdidas con cobro' },
  { id: 'textiles', label: 'Gestión Textiles & Lavandería', category: 'Operativo', description: 'Control de sábanas/toallas, lavandería externa y descartes' },
  { id: 'reports', label: 'Reportes & KPIs', category: 'Administración', description: 'Ingresos, ADR, RevPAR, exportación contable a Excel' },
  { id: 'users', label: 'Usuarios & Permisos', category: 'Administración', description: 'Gestión de personal, asignación de roles y claves' },
  { id: 'settings', label: 'Configuración del Hotel', category: 'Administración', description: 'Tarifas, habitaciones, horarios de salida y datos SUNAT' }
];

// Matriz de módulos por defecto según el rol del usuario
export const ROLE_DEFAULT_MODULES = {
  super_admin: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles', 'reports', 'users', 'settings'],
  admin: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles', 'reports', 'users', 'settings'],
  receptionist: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles'],
  housekeeper: ['reception', 'incidents', 'textiles']
};

export const ROLE_DEFINITIONS = [
  {
    role: 'super_admin',
    name: 'Super Administrador',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    description: 'Control total de la plataforma, configuración global, usuarios, auditoría y reportes.',
    allowed: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles', 'reports', 'users', 'settings']
  },
  {
    role: 'admin',
    name: 'Administrador General',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    description: 'Gestión hotelera completa, turnos de caja, reportes financieros y personal.',
    allowed: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles', 'reports', 'users', 'settings']
  },
  {
    role: 'receptionist',
    name: 'Recepcionista / Cajero',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Atención al huésped, check-in, check-out, caja, cobros, tienda, reservas y registro.',
    allowed: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles']
  },
  {
    role: 'housekeeper',
    name: 'Personal Limpieza / Camarera',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Estado de habitaciones (limpieza a disponible), reporte de incidentes y control de textiles.',
    allowed: ['reception', 'incidents', 'textiles']
  }
];

export const isAdminRole = (role) => role === 'super_admin' || role === 'admin';

/** ¿Puede el usuario entrar al módulo? Si allowed_modules es null, usa la matriz predeterminada del rol */
export function canAccessModule(user, moduleId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (ADMIN_MODULES.includes(moduleId)) return false;
  
  // Si tiene módulos personalizados explícitos en su perfil
  if (Array.isArray(user.allowed_modules)) {
    return user.allowed_modules.includes(moduleId);
  }
  
  // Por defecto según su rol en la matriz
  const defaultModules = ROLE_DEFAULT_MODULES[user.role] || ROLE_DEFAULT_MODULES.receptionist;
  return defaultModules.includes(moduleId);
}

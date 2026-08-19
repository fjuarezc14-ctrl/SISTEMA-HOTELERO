/**
 * Constantes globales del dominio del Sistema Hotelero Perú
 * Cumplimiento: Nombres en inglés, comentarios en español.
 */

// Medios de pago autorizados exclusivamente para Perú
export const PAYMENT_METHODS = {
  YAPE_PLIN: 'YAPE_PLIN',
  CASH: 'CASH',
  CARD: 'CARD'
};

// Roles de usuario
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  RECEPTIONIST: 'receptionist',
  HOUSEKEEPER: 'housekeeper'
};

// Estados de habitación
export const ROOM_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance'
};

// Modalidades de estadía
export const STAY_TYPES = {
  HOURS: 'hours',
  OVERNIGHT: 'overnight',
  FULL_DAY: 'full_day'
};

// Estados de estadía
export const STAY_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Estados de turno de trabajo
export const SHIFT_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed'
};

// Tipos de transacciones de caja
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
};

// Categorías de transacciones
export const TRANSACTION_CATEGORIES = {
  STAY: 'stay',
  STORE: 'store',
  SERVICE: 'service',
  OTHER: 'other'
};

// Tipos de documentos de identidad permitidos en Perú
export const DOCUMENT_TYPES = {
  DNI: 'DNI',
  CE: 'CE',
  PASSPORT: 'PASSPORT',
  RUC: 'RUC'
};

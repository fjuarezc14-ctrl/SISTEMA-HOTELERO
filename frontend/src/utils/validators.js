/**
 * validators.js
 * Validaciones centralizadas del Sistema Hotelero Perú
 * Se valida al intentar guardar (on submit), no en tiempo real.
 * 
 * Reglas para documentos de identidad según legislación peruana:
 *   DNI        → 8 dígitos exactos, solo números
 *   RUC        → 11 dígitos exactos, solo números, empieza con 10/15/17/20
 *   CE         → 9 dígitos (nuevas) o hasta 12 alfanumérico (antiguas emisión MIGRACIONES)
 *   PASSPORT   → 6 a 9 caracteres alfanuméricos (estándar ICAO)
 */

// ─────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────
const SOLO_NUMEROS = /^\d+$/;
const SOLO_LETRAS_PERU = /^[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s'-]+$/;
const ALFANUMERICO = /^[a-zA-Z0-9]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUC_PREFIJOS_VALIDOS = ['10', '15', '17', '20'];

// ─────────────────────────────────────────────────────────────
// Validadores de Documentos de Identidad Perú
// ─────────────────────────────────────────────────────────────
export function validateDocument(docType, docNumber) {
  const val = (docNumber || '').trim();

  if (!val) return 'El número de documento es obligatorio.';

  switch (docType) {
    case 'DNI':
      if (!SOLO_NUMEROS.test(val)) return 'El DNI solo debe contener números.';
      if (val.length !== 8) return `El DNI debe tener exactamente 8 dígitos (ingresaste ${val.length}).`;
      return null;

    case 'RUC':
      if (!SOLO_NUMEROS.test(val)) return 'El RUC solo debe contener números.';
      if (val.length !== 11) return `El RUC debe tener exactamente 11 dígitos (ingresaste ${val.length}).`;
      if (!RUC_PREFIJOS_VALIDOS.some(p => val.startsWith(p))) {
        return 'El RUC en Perú debe comenzar con 10, 15, 17 o 20.';
      }
      return null;

    case 'CE':
      if (val.length < 9 || val.length > 12) {
        return `El Carné de Extranjería debe tener entre 9 y 12 caracteres (ingresaste ${val.length}).`;
      }
      if (!ALFANUMERICO.test(val)) return 'El Carné de Extranjería solo acepta letras y números.';
      return null;

    case 'PASSPORT':
      if (val.length < 6 || val.length > 9) {
        return `El Pasaporte debe tener entre 6 y 9 caracteres (ingresaste ${val.length}).`;
      }
      if (!ALFANUMERICO.test(val)) return 'El Pasaporte solo acepta letras y números (sin espacios ni símbolos).';
      return null;

    default:
      if (!val) return 'El número de documento es obligatorio.';
      return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Validadores de Campos Comunes
// ─────────────────────────────────────────────────────────────

/** Nombre completo / Razón Social — solo letras, espacios, tildes, ñ, apóstrofes */
export function validateFullName(name) {
  const val = (name || '').trim();
  if (!val) return 'El nombre completo es obligatorio.';
  if (val.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (val.length > 150) return 'El nombre no puede superar los 150 caracteres.';
  // Permitir nombres con números solo si es Razón Social (contiene S.A.C., E.I.R.L., etc.)
  const isRazonSocial = /S\.A\.C\.|E\.I\.R\.L\.|S\.A\.|LTDA\.|S\.R\.L\./i.test(val);
  if (!isRazonSocial && !/^[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s'.,-]+$/.test(val)) {
    return 'El nombre solo debe contener letras, espacios y caracteres válidos (tildes, ñ).';
  }
  return null;
}

/** Teléfono / Celular — solo dígitos, 7 a 9 caracteres (estándar Perú) */
export function validatePhone(phone, required = false) {
  const val = (phone || '').trim();
  if (!val && !required) return null; // Opcional
  if (!val && required) return 'El teléfono es obligatorio.';
  if (!SOLO_NUMEROS.test(val)) return 'El teléfono solo debe contener números (sin guiones ni espacios).';
  if (val.length < 7 || val.length > 9) return `El número debe tener entre 7 y 9 dígitos (ingresaste ${val.length}).`;
  return null;
}

/** Email — formato válido RFC */
export function validateEmail(email, required = false) {
  const val = (email || '').trim();
  if (!val && !required) return null; // Opcional
  if (!val && required) return 'El correo electrónico es obligatorio.';
  if (!EMAIL_REGEX.test(val)) return 'Ingresa un correo electrónico válido (ej: ejemplo@dominio.com).';
  return null;
}

/** Monto en Soles — número > 0, máx 2 decimales */
export function validateAmount(amount, fieldName = 'Monto', required = true, min = 0.01) {
  const val = parseFloat(amount);
  if (isNaN(val) || amount === '' || amount === null || amount === undefined) {
    return required ? `El ${fieldName} es obligatorio.` : null;
  }
  if (val < min) return `El ${fieldName} debe ser mayor a S/ ${min.toFixed(2)}.`;
  if (val > 999999.99) return `El ${fieldName} es demasiado alto.`;
  // Verificar máximo 2 decimales
  const str = String(amount);
  if (str.includes('.') && str.split('.')[1].length > 2) {
    return `El ${fieldName} solo puede tener hasta 2 decimales.`;
  }
  return null;
}

/** Stock / Cantidad — entero positivo */
export function validateQuantity(quantity, fieldName = 'Cantidad', min = 1, max = 9999) {
  const val = Number(quantity);
  if (!quantity && quantity !== 0) return `La ${fieldName} es obligatoria.`;
  if (!Number.isInteger(val) || val < min) return `La ${fieldName} debe ser un número entero de al menos ${min}.`;
  if (val > max) return `La ${fieldName} no puede superar ${max.toLocaleString()}.`;
  return null;
}

/** Precio de producto — número positivo */
export function validatePrice(price, fieldName = 'Precio') {
  return validateAmount(price, fieldName, true, 0.01);
}

/** Username / Nombre de usuario — alfanumérico, sin espacios, 3-50 chars */
export function validateUsername(username) {
  const val = (username || '').trim();
  if (!val) return 'El nombre de usuario es obligatorio.';
  if (val.length < 3) return 'El usuario debe tener al menos 3 caracteres.';
  if (val.length > 50) return 'El usuario no puede superar los 50 caracteres.';
  if (!/^[a-zA-Z0-9._-]+$/.test(val)) return 'El usuario solo acepta letras, números, puntos, guiones y guiones bajos.';
  return null;
}

/** Contraseña — mínimo 6 caracteres */
export function validatePassword(password, fieldName = 'Contraseña') {
  const val = (password || '');
  if (!val) return `La ${fieldName} es obligatoria.`;
  if (val.length < 6) return `La ${fieldName} debe tener al menos 6 caracteres.`;
  if (val.length > 100) return `La ${fieldName} es demasiado larga.`;
  return null;
}

/** Texto libre no vacío — concepto, notas, etc. */
export function validateText(text, fieldName = 'Campo', min = 2, max = 200, required = true) {
  const val = (text || '').trim();
  if (!val && !required) return null;
  if (!val && required) return `El campo "${fieldName}" es obligatorio.`;
  if (val.length < min) return `"${fieldName}" debe tener al menos ${min} caracteres.`;
  if (val.length > max) return `"${fieldName}" no puede superar los ${max} caracteres.`;
  return null;
}

/** Nombre de proveedor / empresa — letras, números, espacios, puntuación básica */
export function validateSupplierName(name) {
  const val = (name || '').trim();
  if (!val) return null; // Proveedor es opcional
  if (val.length < 2) return 'El nombre del proveedor debe tener al menos 2 caracteres.';
  if (val.length > 150) return 'El nombre del proveedor no puede superar 150 caracteres.';
  return null;
}

/** Fecha — que no sea nula y sea válida */
export function validateDate(dateStr, fieldName = 'Fecha', allowPast = true) {
  if (!dateStr) return `La ${fieldName} es obligatoria.`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return `La ${fieldName} no es una fecha válida.`;
  if (!allowPast) {
    const now = new Date();
    now.setSeconds(0, 0);
    if (d < now) return `La ${fieldName} no puede ser en el pasado.`;
  }
  return null;
}

/** Rango de fechas — que start_date < end_date */
export function validateDateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Las fechas no son válidas.';
  if (start >= end) return 'La fecha de salida debe ser posterior a la fecha de llegada.';
  return null;
}

// ─────────────────────────────────────────────────────────────
// Restricciones de teclado (maxLength dinámico por tipo doc)
// ─────────────────────────────────────────────────────────────
export function getDocumentConstraints(docType) {
  switch (docType) {
    case 'DNI':        return { maxLength: 8,  inputMode: 'numeric', pattern: '[0-9]*',   placeholder: 'Ej: 72345678' };
    case 'RUC':        return { maxLength: 11, inputMode: 'numeric', pattern: '[0-9]*',   placeholder: 'Ej: 20123456789' };
    case 'CE':         return { maxLength: 12, inputMode: 'text',    pattern: '[A-Za-z0-9]*', placeholder: 'Ej: 000123456' };
    case 'PASSPORT':   return { maxLength: 9,  inputMode: 'text',    pattern: '[A-Za-z0-9]*', placeholder: 'Ej: AB123456' };
    default:           return { maxLength: 20, inputMode: 'text',    pattern: undefined,  placeholder: 'Número de documento' };
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers para acumular errores de formulario
// ─────────────────────────────────────────────────────────────

/**
 * Recibe un array de [ resultado_de_validacion, ...] y retorna el primer error encontrado,
 * o null si todos son válidos.
 * @param {Array<string|null>} validations
 * @returns {string|null}
 */
export function firstError(...validations) {
  return validations.find(v => v !== null) || null;
}

/**
 * Recibe un objeto { campo: error_o_null } y retorna todos los errores como string,
 * o null si no hay errores.
 * @param {Object} errorsMap
 * @returns {string|null}
 */
export function collectErrors(errorsMap) {
  const errors = Object.values(errorsMap).filter(Boolean);
  return errors.length > 0 ? errors.join('\n') : null;
}

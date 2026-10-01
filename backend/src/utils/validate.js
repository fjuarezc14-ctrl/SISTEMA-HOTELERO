/**
 * Validaciones de datos de entrada en el servidor (lo que se valida solo en pantalla se puede saltar).
 * Cada función lanza un error 400 con un mensaje claro, o devuelve el valor normalizado.
 */

export function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
}

/** Texto obligatorio (o opcional con required=false) con longitud mínima/máxima */
export function text(value, field, { min = 1, max = 255, required = true } = {}) {
  const v = String(value ?? '').trim();
  if (!v) {
    if (required) throw badRequest(`${field} es obligatorio.`);
    return '';
  }
  if (v.length < min) throw badRequest(`${field} debe tener al menos ${min} caracteres.`);
  if (v.length > max) throw badRequest(`${field} no puede superar ${max} caracteres.`);
  return v;
}

/** Monto en soles con 2 decimales */
export function money(value, field, { min = 0, max = 100000, allowZero = true } = {}) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) throw badRequest(`${field} debe ser un monto válido.`);
  if (n < min || (!allowZero && n === 0)) throw badRequest(`${field} debe ser ${allowZero ? `mayor o igual a ${min}` : 'mayor a 0'}.`);
  if (n > max) throw badRequest(`${field} no puede superar S/ ${max}.`);
  return Math.round(n * 100) / 100;
}

/** Número entero en un rango */
export function integer(value, field, { min = 0, max = 1000000 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw badRequest(`${field} debe ser un número entero entre ${min} y ${max}.`);
  return n;
}

/** Valor dentro de una lista permitida */
export function oneOf(value, field, allowed) {
  if (!allowed.includes(value)) throw badRequest(`${field} no es válido.`);
  return value;
}

const DOC_RULES = {
  DNI: { re: /^\d{8}$/, msg: 'El DNI debe tener 8 dígitos.' },
  RUC: { re: /^(10|15|17|20)\d{9}$/, msg: 'El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20.' },
  CE: { re: /^[A-Za-z0-9]{9,12}$/, msg: 'El carné de extranjería debe tener entre 9 y 12 caracteres alfanuméricos.' },
  PASSPORT: { re: /^[A-Za-z0-9]{6,9}$/, msg: 'El pasaporte debe tener entre 6 y 9 caracteres alfanuméricos.' }
};

/** Datos de cliente: tipo y número de documento, nombre y teléfono (opcional) */
export function customerData(data = {}) {
  const document_type = oneOf(String(data.document_type || 'DNI').toUpperCase(), 'El tipo de documento', Object.keys(DOC_RULES));
  const document_number = String(data.document_number ?? '').trim().toUpperCase();
  if (!DOC_RULES[document_type].re.test(document_number)) throw badRequest(DOC_RULES[document_type].msg);
  const full_name = text(data.full_name, 'El nombre del cliente', { min: 3, max: 150 });
  const phone = String(data.phone ?? '').replace(/\s/g, '');
  if (phone && !/^\d{7,9}$/.test(phone)) throw badRequest('El teléfono debe tener entre 7 y 9 dígitos (solo números).');
  const email = String(data.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('El correo electrónico no es válido.');
  return { document_type, document_number, full_name, phone, email };
}

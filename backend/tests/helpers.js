/**
 * Utilidades para las pruebas de flujos contra la API.
 * IMPORTANTE: ejecutar contra una base de datos de PRUEBAS (ver tests/README.md), nunca contra producción.
 */
import assert from 'node:assert/strict';

export const API_URL = process.env.TEST_API_URL || 'http://localhost:4021/api/v1';
export const ADMIN = { username: process.env.TEST_ADMIN_USER || 'admin', password: process.env.TEST_ADMIN_PASSWORD || 'admin123' };

/** Cliente HTTP mínimo. Devuelve { status, body }. */
export async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, body: data };
}

/** Igual que request pero exige un código HTTP y devuelve body.data */
export async function expectOk(method, path, opts = {}, expectedStatus = [200, 201]) {
  const res = await request(method, path, opts);
  const ok = Array.isArray(expectedStatus) ? expectedStatus.includes(res.status) : res.status === expectedStatus;
  assert.ok(ok, `${method} ${path} -> ${res.status}: ${res.body?.message || JSON.stringify(res.body)}`);
  return res.body?.data;
}

/** Exige un error con el código indicado. Devuelve el mensaje. */
export async function expectError(method, path, opts, expectedStatus) {
  const res = await request(method, path, opts);
  assert.equal(res.status, expectedStatus, `${method} ${path} esperaba ${expectedStatus} y obtuvo ${res.status}: ${res.body?.message}`);
  return res.body?.message || '';
}

export async function login(username = ADMIN.username, password = ADMIN.password) {
  const data = await expectOk('POST', '/auth/login', { body: { username, password } });
  return data.token;
}

/** Documento DNI aleatorio (8 dígitos) para no chocar entre ejecuciones */
export const randomDni = () => String(10000000 + Math.floor(Math.random() * 89999999));

/** Fecha base lejana y aleatoria para que cada ejecución use su propio rango de fechas */
export function randomFutureBase() {
  const d = new Date();
  d.setDate(d.getDate() + 400 + Math.floor(Math.random() * 3000));
  d.setHours(14, 0, 0, 0);
  return d;
}

export const addHours = (date, hours) => new Date(new Date(date).getTime() + hours * 3600000);
export const addDays = (date, days) => addHours(date, days * 24);
export const iso = (date) => new Date(date).toISOString();

/** Redondeo a céntimos para comparar montos */
export const money = (n) => Math.round(Number(n) * 100) / 100;

/** Asegura que haya un turno abierto (lo abre como admin si no existe). Devuelve el turno. */
export async function ensureOpenShift(token) {
  const active = await expectOk('GET', '/shifts/active', { token });
  if (active) return active;
  await expectOk('POST', '/shifts/open', { token, body: { initial_cash_pen: 100, shift_notes: 'Turno de pruebas automáticas' } });
  return await expectOk('GET', '/shifts/active', { token });
}

/** Cierra el turno abierto (si hay) cuadrando la caja con el efectivo esperado */
export async function closeOpenShift(token) {
  const active = await expectOk('GET', '/shifts/active', { token });
  if (!active) return null;
  return await expectOk('POST', `/shifts/${active.id}/close`, {
    token,
    body: { actual_cash_pen: active.live_expected_cash_pen, shift_notes: 'Cierre de pruebas automáticas' }
  });
}

/** Primera habitación disponible (estado 'available') */
export async function getAvailableRoom(token, exceptIds = []) {
  const rooms = await expectOk('GET', '/rooms', { token });
  const room = rooms.find((r) => r.status === 'available' && !exceptIds.includes(r.id));
  assert.ok(room, 'No hay habitaciones disponibles en la base de pruebas');
  return room;
}

export { assert };

/**
 * Acceso directo a la base de PRUEBAS (para simular el paso del tiempo, ej. salida tardía).
 * Exige que DB_NAME contenga "test" para no tocar nunca la base real.
 */
export async function testDb(sql, params = []) {
  if (!/test/i.test(process.env.DB_NAME || '')) {
    throw new Error('testDb() solo se puede usar con una base de datos de pruebas (DB_NAME=hotel_test).');
  }
  const { query } = await import('../src/config/db.js');
  return (await query(sql, params)).rows;
}

/** Hace check-out cobrando exactamente el saldo (para limpiar estadías de prueba) */
export async function checkoutSettled(token, stayId) {
  const quote = await expectOk('GET', `/stays/${stayId}/checkout-quote`, { token });
  return await expectOk('POST', '/stays/checkout', {
    token,
    body: { stay_id: stayId, final_payment: quote.amount_due > 0 ? { amount: quote.amount_due, payment_method: 'CASH' } : null }
  });
}

/** Deja la habitación disponible (tras un check-out queda en limpieza) */
export async function markRoomAvailable(token, roomId) {
  return await expectOk('PATCH', `/rooms/${roomId}/status`, { token, body: { status: 'available' } });
}

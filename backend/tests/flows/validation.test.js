import { test, before, after } from 'node:test';
import { assert, login, expectOk, expectError, ensureOpenShift, getAvailableRoom, checkoutSettled, markRoomAvailable, randomDni, testDb } from '../helpers.js';

let token;
let receptionToken;
let receptionId;
const cleanups = [];

before(async () => {
  token = await login();
  await ensureOpenShift(token);
  // Usuario recepcionista de prueba (se crea si no existe)
  const users = await expectOk('GET', '/users', { token });
  let rec = users.find((u) => u.username === 'recepcion_test');
  if (!rec) {
    rec = await expectOk('POST', '/users', { token, body: { username: 'recepcion_test', password: 'test1234', full_name: 'Recepción Pruebas', role: 'receptionist' } });
  }
  receptionId = rec.id;
  await expectOk('PUT', `/users/${receptionId}`, { token, body: { is_active: true, allowed_modules: null } });
  await expectOk('POST', `/users/${receptionId}/reset-password`, { token, body: { password: 'test1234' } });
  receptionToken = await login('recepcion_test', 'test1234');
});

after(async () => {
  for (const fn of cleanups) await fn().catch(() => {});
  await expectOk('PUT', `/users/${receptionId}`, { token, body: { allowed_modules: null } }).catch(() => {});
});

test('productos: precio y stock válidos', async () => {
  await expectError('POST', '/products', { token, body: { name: 'Producto malo', sale_price_pen: -3, stock: 5 } }, 400);
  await expectError('POST', '/products', { token, body: { name: 'Producto malo', sale_price_pen: 3, stock: 2.5 } }, 400);
  const [p] = await expectOk('GET', '/products', { token });
  await expectError('PUT', `/products/${p.id}`, { token, body: { sale_price_pen: 0 } }, 400);
});

test('tarifas de habitación: deben ser mayores a 0', async () => {
  const [type] = await expectOk('GET', '/rooms/types', { token });
  await expectError('PUT', `/rooms/types/${type.id}/rates`, { token, body: { price_overnight_default: 0 } }, 400);
  await expectError('PUT', `/rooms/types/${type.id}/rates`, { token, body: { hours_quantity_default: 0 } }, 400);
});

test('clientes: documento según su tipo', async () => {
  await expectError('POST', '/customers', { token, body: { document_type: 'DNI', document_number: '123', full_name: 'Cliente Malo' } }, 400);
  await expectError('POST', '/customers', { token, body: { document_type: 'RUC', document_number: '12345678901', full_name: 'Empresa Mala' } }, 400);
  await expectOk('POST', '/customers', { token, body: { document_type: 'DNI', document_number: randomDni(), full_name: 'Cliente Bueno', phone: '987654321' } });
});

test('clientes: el veto no se puede quitar re-registrando al cliente', async () => {
  const dni = randomDni();
  const c = await expectOk('POST', '/customers', { token, body: { document_type: 'DNI', document_number: dni, full_name: 'Cliente Vetado Prueba' } });
  await expectOk('PATCH', `/customers/${c.id}/toggle-blacklist`, { token, body: { is_blacklisted: true, blacklist_reason: 'Prueba' } });
  await expectOk('POST', '/customers', { token: receptionToken, body: { document_type: 'DNI', document_number: dni, full_name: 'Cliente Vetado Prueba', is_blacklisted: false } });
  const [row] = await testDb('SELECT is_blacklisted FROM customers WHERE id = $1', [c.id]);
  assert.equal(row.is_blacklisted, true);
});

test('habitaciones: no se libera a mano una habitación con huésped', async () => {
  const room = await getAvailableRoom(token, [], { freeDays: 2 });
  await expectError('PATCH', `/rooms/${room.id}/status`, { token, body: { status: 'occupied' } }, 400);
  const stay = await expectOk('POST', '/stays/checkin', {
    token,
    body: { room_id: room.id, customer_data: { document_type: 'DNI', document_number: randomDni(), full_name: 'Huésped Validación' }, stay_type: 'full_day' }
  });
  cleanups.push(async () => {
    await checkoutSettled(token, stay.id);
    await markRoomAvailable(token, room.id);
  });
  await expectError('PATCH', `/rooms/${room.id}/status`, { token, body: { status: 'available' } }, 400);
});

test('incidentes y configuración: montos y formatos', async () => {
  const [room] = await expectOk('GET', '/rooms', { token });
  await expectError('POST', '/incidents', { token, body: { room_id: room.id, description: 'Prueba', penalty_amount_pen: -5 } }, 400);
  await expectError('PUT', '/settings/hotel-info', { token, body: { ruc: '123' } }, 400);
  await expectError('PUT', '/settings/hotel-info', { token, body: { logo_url: 'javascript:alert(1)' } }, 400);
  await expectError('PUT', '/settings/hotel-info', { token, body: { overnight_checkout_time: '25:00' } }, 400);
});

test('permisos: recepcionista sin módulo y acciones que exigen administrador', async () => {
  // Abrir caja y anular movimientos requieren credenciales de administrador
  const shift = await expectOk('GET', '/shifts/active', { token });
  const txs = await expectOk('GET', `/cash/transactions?shiftId=${shift.id}&limit=5`, { token });
  const income = txs.find((t) => t.transaction_type === 'income' && !t.is_cancelled);
  if (income) {
    await expectError('PATCH', `/cash/transactions/${income.id}/cancel`, { token: receptionToken, body: { reason: 'prueba' } }, 403);
  }
  await expectError('GET', '/shifts/history', { token: receptionToken }, 403);
  await expectError('GET', '/users', { token: receptionToken }, 403);

  // Sin el módulo Caja no entra a la API de caja
  await expectOk('PUT', `/users/${receptionId}`, { token, body: { allowed_modules: ['reception'] } });
  await expectError('GET', '/cash/transactions', { token: receptionToken }, 403);
  await expectError('POST', '/products/direct-sale', { token: receptionToken, body: { items: [] } }, 403);
});

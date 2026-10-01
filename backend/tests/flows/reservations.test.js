import { test, before, after } from 'node:test';
import {
  assert, login, expectOk, expectError, ensureOpenShift, getAvailableRoom,
  randomDni, randomFutureBase, addHours, addDays, iso, money
, setDepositRule
} from '../helpers.js';

let token;
let previousRule;
let room;
let buffer;
const created = [];
const base = randomFutureBase();

const customer = () => ({ document_type: 'DNI', document_number: randomDni(), full_name: 'Huésped Prueba Reserva', phone: '987654321' });

async function createReservation(start, end, extra = {}) {
  const r = await expectOk('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: iso(start), end_date: iso(end), deposit_amount_pen: 0, ...extra }
  });
  created.push(r.id);
  return r;
}

before(async () => {
  token = await login();
  previousRule = await setDepositRule(token, 'percent', 0); // estas pruebas reservan sin abono
  await ensureOpenShift(token);
  room = await getAvailableRoom(token);
  const info = await expectOk('GET', '/settings/hotel-info', { token });
  buffer = Number(info.cleaning_buffer_minutes ?? 60);
});

after(async () => {
  if (previousRule) await setDepositRule(token, previousRule.type, previousRule.value);
  for (const id of created) {
    await expectOk('PATCH', `/reservations/${id}/cancel`, { token }).catch(() => {});
  }
});

test('crea una reserva con abono y el abono entra a caja', async () => {
  const r = await createReservation(base, addDays(base, 2), { deposit_amount_pen: 45.5, payment_method: 'CASH' });
  assert.equal(money(r.deposit_amount_pen), 45.5);
  assert.equal(r.status, 'confirmed');

  const shift = await expectOk('GET', '/shifts/active', { token });
  const txs = await expectOk('GET', `/cash/transactions?shiftId=${shift.id}&limit=50`, { token });
  const abono = txs.find((t) => t.concept.includes('Abono de Reserva') && t.concept.includes(room.room_number) && money(t.amount_pen) === 45.5);
  assert.ok(abono, 'El abono de la reserva no se registró en caja');
});

test('rechaza una reserva que se cruza con otra en la misma habitación', async () => {
  const msg = await expectError('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: iso(addDays(base, 1)), end_date: iso(addDays(base, 3)) }
  }, 409);
  assert.match(msg, /reservada/);
});

test('respeta el margen de limpieza después de la salida', async () => {
  const firstEnd = addDays(base, 2);
  // Dentro del margen: rechazada
  await expectError('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: iso(addHours(firstEnd, buffer / 60 / 2)), end_date: iso(addDays(firstEnd, 1)) }
  }, 409);
  // Justo después del margen: aceptada
  await createReservation(addHours(firstEnd, buffer / 60 + 0.05), addDays(firstEnd, 1));
});

test('respeta el margen de limpieza antes de la llegada', async () => {
  // Termina dentro del margen previo a la primera reserva: rechazada
  await expectError('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: iso(addDays(base, -1)), end_date: iso(addHours(base, -(buffer / 60 / 2))) }
  }, 409);
});

test('valida fechas: pasado, salida antes de llegada y abono negativo', async () => {
  const yesterday = addDays(new Date(), -1);
  await expectError('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: iso(yesterday), end_date: iso(addDays(yesterday, 1)) }
  }, 400);
  await expectError('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: iso(addDays(base, 20)), end_date: iso(addDays(base, 19)) }
  }, 400);
  await expectError('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: iso(addDays(base, 20)), end_date: iso(addDays(base, 21)), deposit_amount_pen: -10 }
  }, 400);
});

test('reprogramar no permite cambiar el abono ni chocar con otra reserva', async () => {
  const r = await createReservation(addDays(base, 10), addDays(base, 11), { deposit_amount_pen: 20, payment_method: 'CASH' });
  const updated = await expectOk('PUT', `/reservations/${r.id}`, {
    token,
    body: { deposit_amount_pen: 999, notes: 'intento de cambiar abono', status: 'checked_in' }
  });
  assert.equal(money(updated.deposit_amount_pen), 20, 'El abono no debe poder modificarse');
  assert.equal(updated.status, 'confirmed', 'El estado no debe cambiar al reprogramar');

  await expectError('PUT', `/reservations/${r.id}`, {
    token,
    body: { start_date: iso(addDays(base, 1)), end_date: iso(addDays(base, 2)) }
  }, 409);
});

test('la fecha guardada es exactamente la enviada (sin desfase de zona horaria)', async () => {
  const start = addDays(base, 30);
  const r = await createReservation(start, addDays(start, 1));
  assert.equal(new Date(r.start_date).toISOString(), start.toISOString());

  // Fecha sin zona horaria (como la envía un <input type="datetime-local">) se interpreta en hora de Lima (UTC-5)
  const day = addDays(base, 40).toISOString().slice(0, 10);
  const next = addDays(base, 41).toISOString().slice(0, 10);
  const naive = await expectOk('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer(), start_date: `${day}T14:00`, end_date: `${next}T12:00` }
  });
  created.push(naive.id);
  assert.equal(new Date(naive.start_date).toISOString(), `${day}T19:00:00.000Z`);
});

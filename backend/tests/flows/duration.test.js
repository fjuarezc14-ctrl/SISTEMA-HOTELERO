import { test, before, after } from 'node:test';
import {
  assert, login, expectOk, expectError, ensureOpenShift, getAvailableRoom, setDepositRule,
  checkoutSettled, markRoomAvailable, randomDni, randomFutureBase, addDays, iso, money
} from '../helpers.js';

let token;
let previousRule;
let room;
let type;
const reservations = [];
const cleanups = [];

const customer = () => ({ document_type: 'DNI', document_number: randomDni(), full_name: 'Huésped Duración' });

before(async () => {
  token = await login();
  await ensureOpenShift(token);
  previousRule = await setDepositRule(token, 'percent', 30);
  room = await getAvailableRoom(token, [], { freeDays: 8 });
  type = (await expectOk('GET', '/rooms/types', { token })).find((t) => t.id === room.room_type_id);
});

after(async () => {
  for (const id of reservations) await expectOk('PATCH', `/reservations/${id}/cancel`, { token }).catch(() => {});
  for (const fn of cleanups) await fn().catch(() => {});
  await setDepositRule(token, previousRule.type, previousRule.value);
});

test('check-in de varias noches: precio y salida según la cantidad', async () => {
  const info = await expectOk('GET', '/settings/hotel-info', { token });
  const quote = await expectOk('GET', `/stays/quote?room_id=${room.id}&stay_type=overnight&units=3`, { token });
  assert.equal(quote.breakdown.nights, 3);
  assert.equal(money(quote.price), money(3 * Number(type.price_overnight_default)));
  const end = new Date(quote.expected_end_time);
  const days = Math.round((new Date(end.toDateString()) - new Date(new Date().toDateString())) / 86400000);
  assert.equal(days, 3, 'Sale 3 días después');
  const limaTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(end);
  assert.equal(limaTime, String(info.overnight_checkout_time).slice(0, 5));

  await expectError('GET', `/stays/quote?room_id=${room.id}&stay_type=overnight&units=0`, { token }, 400);
  await expectError('GET', `/stays/quote?room_id=${room.id}&stay_type=full_day&units=61`, { token }, 400);
});

test('reserva con el mismo selector: cotización con total y abono mínimo', async () => {
  const start = randomFutureBase();
  const q = await expectOk('GET', `/reservations/quote?room_id=${room.id}&start_date=${encodeURIComponent(iso(start))}&stay_type=overnight&units=4`, { token });
  const total = money(4 * Number(type.price_overnight_default));
  assert.equal(money(q.price), total);
  assert.equal(money(q.min_deposit), money(total * 0.3));
  assert.equal(Math.round((new Date(q.end_date) - start) / 86400000 + 0.5), 4, 'Sale a los 4 días');
  assert.equal(q.conflict, null);

  // Abono menor al mínimo: rechazado; mayor al total: rechazado
  const base = { room_id: room.id, customer_data: customer(), start_date: iso(start), stay_type: 'overnight', units: 4, payment_method: 'CASH' };
  await expectError('POST', '/reservations', { token, body: { ...base, deposit_amount_pen: money(q.min_deposit - 1) } }, 400);
  await expectError('POST', '/reservations', { token, body: { ...base, deposit_amount_pen: total + 1 } }, 400);

  // Abono completo: permitido y el precio queda guardado
  const r = await expectOk('POST', '/reservations', { token, body: { ...base, deposit_amount_pen: total } });
  reservations.push(r.id);
  assert.equal(money(r.quoted_price_pen), total);
  assert.equal(r.stay_type, 'overnight');
  assert.equal(r.stay_units, 4);
  assert.equal(new Date(r.end_date).toISOString(), new Date(q.end_date).toISOString());
});

test('abono mínimo fijo (sin superar el total)', async () => {
  await setDepositRule(token, 'fixed', 50);
  const start = addDays(randomFutureBase(), 20);
  const q = await expectOk('GET', `/reservations/quote?room_id=${room.id}&start_date=${encodeURIComponent(iso(start))}&stay_type=overnight&units=1`, { token });
  assert.equal(money(q.min_deposit), money(Math.min(50, Number(type.price_overnight_default))));
  await setDepositRule(token, 'percent', 30);
});

test('el check-in respeta el precio reservado aunque cambien las tarifas', async () => {
  const roomNow = await getAvailableRoom(token, [room.id], { freeDays: 3 });
  const typeNow = (await expectOk('GET', '/rooms/types', { token })).find((t) => t.id === roomNow.room_type_id);
  const oldRate = Number(typeNow.price_overnight_default);
  const start = new Date(Date.now() + 30 * 60000);

  const q = await expectOk('GET', `/reservations/quote?room_id=${roomNow.id}&start_date=${encodeURIComponent(iso(start))}&stay_type=overnight&units=2`, { token });
  const r = await expectOk('POST', '/reservations', {
    token,
    body: { room_id: roomNow.id, customer_data: customer(), start_date: iso(start), stay_type: 'overnight', units: 2, deposit_amount_pen: q.min_deposit, payment_method: 'CASH' }
  });

  // Sube la tarifa después de reservar
  await expectOk('PUT', `/rooms/types/${typeNow.id}/rates`, { token, body: { price_overnight_default: oldRate + 25 } });
  cleanups.push(() => expectOk('PUT', `/rooms/types/${typeNow.id}/rates`, { token, body: { price_overnight_default: oldRate } }));

  const ci = await expectOk('GET', `/stays/quote?room_id=${roomNow.id}&reservation_id=${r.id}`, { token });
  assert.equal(money(ci.price), money(2 * oldRate), 'Se cobra el precio dicho al reservar');
  assert.equal(money(ci.amount_due), money(2 * oldRate - q.min_deposit));

  const stay = await expectOk('POST', `/reservations/${r.id}/checkin`, { token, body: { initial_payment: { amount: ci.amount_due, payment_method: 'CASH' } } });
  cleanups.unshift(async () => {
    await checkoutSettled(token, stay.id);
    await markRoomAvailable(token, roomNow.id);
  });
  assert.equal(money(stay.total_stay_price_pen), money(2 * oldRate));
});

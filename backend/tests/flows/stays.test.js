import { test, before, after } from 'node:test';
import {
  assert, login, expectOk, expectError, ensureOpenShift, getAvailableRoom, testDb,
  checkoutSettled, markRoomAvailable, randomDni, addHours, addDays, iso, money
, setDepositRule
} from '../helpers.js';

let token;
let previousRule;
let rooms = [];
const openStays = [];

const customer = (name = 'Huésped Prueba Estadía') => ({ document_type: 'DNI', document_number: randomDni(), full_name: name, phone: '' });

async function roomType(room) {
  const types = await expectOk('GET', '/rooms/types', { token });
  return types.find((t) => t.id === room.room_type_id) || types.find((t) => t.name === room.room_type_name);
}

async function cashForStay(stayId) {
  const shift = await expectOk('GET', '/shifts/active', { token });
  const txs = await expectOk('GET', `/cash/transactions?shiftId=${shift.id}&limit=500`, { token });
  return txs.filter((t) => t.stay_id === stayId && !t.is_cancelled);
}

async function freeRoom() {
  const room = await getAvailableRoom(token, rooms.map((r) => r.id), { freeDays: 4 });
  rooms.push(room);
  return room;
}

before(async () => {
  token = await login();
  previousRule = await setDepositRule(token, 'percent', 0); // estas pruebas reservan sin abono
  await ensureOpenShift(token);
});

after(async () => {
  if (previousRule) await setDepositRule(token, previousRule.type, previousRule.value);
  for (const stayId of openStays) await checkoutSettled(token, stayId).catch(() => {});
  for (const room of rooms) await markRoomAvailable(token, room.id).catch(() => {});
});

test('cotización por horas: base + horas extra a la tarifa de la habitación', async () => {
  const room = await freeRoom();
  const type = await roomType(room);
  const base = Number(type.hours_quantity_default);
  const quote = await expectOk('GET', `/stays/quote?room_id=${room.id}&stay_type=hours&hours_count=${base + 2}`, { token });
  assert.equal(money(quote.price), money(Number(type.price_hours_default) + 2 * Number(type.price_extra_hour_default)));
  const hours = (new Date(quote.expected_end_time) - Date.now()) / 3600000;
  assert.ok(Math.abs(hours - (base + 2)) < 0.05, `La salida debería ser en ${base + 2} h`);
  await expectError('GET', `/stays/quote?room_id=${room.id}&stay_type=hours&hours_count=${base - 1}`, { token }, 400);
});

test('cotización por noche: sale al día siguiente a la hora configurada', async () => {
  const room = rooms[0];
  const type = await roomType(room);
  const info = await expectOk('GET', '/settings/hotel-info', { token });
  const quote = await expectOk('GET', `/stays/quote?room_id=${room.id}&stay_type=overnight`, { token });
  assert.equal(money(quote.price), money(type.price_overnight_default));
  const end = new Date(quote.expected_end_time);
  const limaTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(end);
  assert.equal(limaTime, String(info.overnight_checkout_time).slice(0, 5));
});

test('check-in sin reserva: el precio lo pone el servidor y no se puede cobrar de más', async () => {
  const room = rooms[0];
  const quote = await expectOk('GET', `/stays/quote?room_id=${room.id}&stay_type=overnight`, { token });

  await expectError('POST', '/stays/checkin', {
    token,
    body: { room_id: room.id, customer_data: customer(), stay_type: 'overnight', initial_payment: { amount: quote.price + 5, payment_method: 'CASH' } }
  }, 400);

  const stay = await expectOk('POST', '/stays/checkin', {
    token,
    body: {
      room_id: room.id,
      customer_data: customer(),
      stay_type: 'overnight',
      custom_price: 1, // debe ignorarse
      initial_payment: { amount: quote.price, payment_method: 'YAPE_PLIN', reference_number: 'OP-123' }
    }
  });
  openStays.push(stay.id);
  assert.equal(money(stay.total_stay_price_pen), money(quote.price), 'El precio enviado por el cliente debe ignorarse');
  assert.equal(money(stay.total_paid_pen), money(quote.price));

  const txs = await cashForStay(stay.id);
  assert.equal(txs.length, 1);
  assert.equal(money(txs[0].amount_pen), money(quote.price));
  assert.equal(txs[0].payment_method, 'YAPE_PLIN');
  assert.equal(txs[0].reference_number, 'OP-123');
});

test('consumos + horas extra + salida tardía + penalidad: el checkout cobra el saldo exacto', async () => {
  const stayId = openStays[0];
  const room = rooms[0];
  const type = await roomType(room);
  const products = await expectOk('GET', '/products', { token });
  const product = products.find((p) => p.stock >= 3);
  assert.ok(product, 'Se necesita un producto con stock en la base de pruebas');

  // Consumo cargado a la habitación (no pagado aún)
  await expectOk('POST', '/products/charge-room', { token, body: { stay_id: stayId, items: [{ product_id: product.id, quantity: 2 }] } });
  const consumption = money(2 * Number(product.sale_price_pen));

  // Horas extra pagadas al momento: no cambian el saldo
  await expectError('POST', `/stays/${stayId}/extra-hours`, { token, body: { hours_count: -2, payment_method: 'CASH' } }, 400);
  await expectOk('POST', `/stays/${stayId}/extra-hours`, { token, body: { hours_count: 1, payment_method: 'CASH' } });

  // Simular salida tardía: 2 h 30 min después de la hora prevista (más la tolerancia)
  const info = await expectOk('GET', '/settings/hotel-info', { token });
  const grace = Number(info.grace_period_minutes);
  await testDb(`UPDATE stays SET expected_end_time = NOW() - ($2 || ' minutes')::interval WHERE id = $1`, [stayId, String(grace + 150)]);

  const penalty = 15.5;
  const quote = await expectOk('GET', `/stays/${stayId}/checkout-quote?penalty_amount_pen=${penalty}`, { token });
  const overstay = money(3 * Number(type.price_extra_hour_default)); // 2h30 -> 3 horas
  assert.equal(quote.overstay_hours, 3);
  assert.equal(money(quote.overstay_cost), overstay);
  assert.equal(money(quote.consumptions), consumption);
  assert.equal(money(quote.amount_due), money(consumption + overstay + penalty), 'Saldo = consumos + sobrestadía + penalidad');

  // Pagar menos o más que el saldo: rechazado
  await expectError('POST', '/stays/checkout', {
    token,
    body: { stay_id: stayId, final_payment: { amount: quote.amount_due - 1, payment_method: 'CASH' }, incident_data: { description: 'Toalla manchada', penalty_amount_pen: penalty } }
  }, 400);

  const done = await expectOk('POST', '/stays/checkout', {
    token,
    body: {
      stay_id: stayId,
      final_payment: {
        amount: quote.amount_due,
        payment_method: 'MIXED',
        split_payments: [
          { payment_method: 'CASH', amount: money(quote.amount_due - 10) },
          { payment_method: 'CARD', amount: 10 }
        ]
      },
      incident_data: { description: 'Toalla manchada', penalty_amount_pen: penalty }
    }
  });
  openStays.shift();
  assert.equal(done.status, 'completed');

  // Caja: penalidad como incidente y el resto como estadía
  const txs = await cashForStay(stayId);
  const penaltyTx = txs.filter((t) => t.category === 'incident').reduce((s, t) => s + Number(t.amount_pen), 0);
  assert.equal(money(penaltyTx), penalty);

  // El incidente queda cobrado (no se puede volver a cobrar desde Incidentes)
  const incidents = await testDb(`SELECT status, penalty_amount_pen FROM stay_incidents WHERE stay_id = $1`, [stayId]);
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].status, 'resolved');

  // Estadía: pagado = precio + horas extra + consumos + sobrestadía
  const [stay] = await testDb(`SELECT * FROM stays WHERE id = $1`, [stayId]);
  assert.equal(money(stay.total_paid_pen), money(Number(stay.total_stay_price_pen) + Number(stay.total_consumptions_price_pen)));
});

test('check-in desde reserva: respeta la salida reservada y cobra total − abono', async () => {
  const room = await freeRoom();
  const type = await roomType(room);
  const start = addHours(new Date(), 0.5);
  const end = addDays(start, 2);
  end.setHours(12, 0, 0, 0);
  const deposit = 30;

  const reservation = await expectOk('POST', '/reservations', {
    token,
    body: { room_id: room.id, customer_data: customer('Huésped con Reserva'), start_date: iso(start), end_date: iso(end), deposit_amount_pen: deposit, payment_method: 'CASH' }
  });

  // Un walk-in no puede ocupar la habitación encima de la reserva
  const walkInQuote = await expectOk('GET', `/stays/quote?room_id=${room.id}&stay_type=overnight`, { token });
  assert.ok(walkInQuote.conflict, 'La cotización debe avisar del conflicto con la reserva');
  await expectError('POST', '/stays/checkin', { token, body: { room_id: room.id, customer_data: customer(), stay_type: 'overnight' } }, 409);

  const quote = await expectOk('GET', `/stays/quote?room_id=${room.id}&reservation_id=${reservation.id}`, { token });
  assert.equal(quote.conflict, null);
  assert.equal(quote.breakdown.nights, 2);
  assert.equal(money(quote.price), money(2 * Number(type.price_overnight_default)));
  assert.equal(money(quote.deposit), deposit);
  assert.equal(money(quote.amount_due), money(quote.price - deposit));

  await expectError('POST', `/reservations/${reservation.id}/checkin`, {
    token,
    body: { initial_payment: { amount: quote.price, payment_method: 'CASH' } } // cobra el total sin descontar el abono
  }, 400);

  const stay = await expectOk('POST', `/reservations/${reservation.id}/checkin`, {
    token,
    body: { initial_payment: { amount: quote.amount_due, payment_method: 'CASH' } }
  });
  openStays.push(stay.id);
  assert.equal(new Date(stay.expected_end_time).toISOString(), end.toISOString(), 'Debe salir en la fecha de la reserva');
  assert.equal(money(stay.total_stay_price_pen), money(quote.price));
  assert.equal(money(stay.total_paid_pen), money(quote.price), 'Pagado = abono + diferencia');

  const txs = await cashForStay(stay.id);
  assert.equal(txs.length, 1, 'Solo se registra la diferencia (el abono ya estaba en caja)');
  assert.equal(money(txs[0].amount_pen), money(quote.amount_due));

  const final = await expectOk('GET', `/stays/${stay.id}/checkout-quote`, { token });
  assert.equal(money(final.amount_due), 0, 'Sin consumos, no debe quedar saldo');
});

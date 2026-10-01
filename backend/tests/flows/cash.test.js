import { test, before, after } from 'node:test';
import {
  assert, login, expectOk, expectError, ensureOpenShift, closeOpenShift, getAvailableRoom,
  checkoutSettled, markRoomAvailable, randomDni, testDb, money
} from '../helpers.js';

let token;
const cleanups = [];

before(async () => {
  token = await login();
  await ensureOpenShift(token);
});

after(async () => {
  for (const fn of cleanups) await fn().catch(() => {});
  await ensureOpenShift(token);
});

test('el efectivo esperado del turno = fondo + ingresos en efectivo − egresos en efectivo', async () => {
  const before = await expectOk('GET', '/shifts/active', { token });
  await expectOk('POST', '/cash/transaction', { token, body: { transaction_type: 'income', concept: 'Ingreso efectivo prueba', amount_pen: 50, payment_method: 'CASH' } });
  await expectOk('POST', '/cash/transaction', { token, body: { transaction_type: 'expense', concept: 'Egreso efectivo prueba', amount_pen: 20, payment_method: 'CASH' } });
  await expectOk('POST', '/cash/transaction', { token, body: { transaction_type: 'income', concept: 'Ingreso yape prueba', amount_pen: 30, payment_method: 'YAPE_PLIN' } });
  const after = await expectOk('GET', '/shifts/active', { token });
  assert.equal(money(after.live_expected_cash_pen - before.live_expected_cash_pen), 30, 'Efectivo: +50 −20');
  assert.equal(money(after.live_total_yape_plin_pen - before.live_total_yape_plin_pen), 30, 'Yape: +30');
});

test('anular un cobro de estadía revierte lo pagado y vuelve a quedar saldo', async () => {
  const room = await getAvailableRoom(token, [], { freeDays: 2 });
  const quote = await expectOk('GET', `/stays/quote?room_id=${room.id}&stay_type=overnight`, { token });
  const stay = await expectOk('POST', '/stays/checkin', {
    token,
    body: {
      room_id: room.id,
      customer_data: { document_type: 'DNI', document_number: randomDni(), full_name: 'Huésped Anulación' },
      stay_type: 'overnight',
      initial_payment: { amount: quote.price, payment_method: 'CASH' }
    }
  });
  cleanups.push(async () => {
    await checkoutSettled(token, stay.id);
    await markRoomAvailable(token, room.id);
  });

  const [tx] = await testDb(`SELECT id FROM cash_transactions WHERE stay_id = $1`, [stay.id]);
  await expectOk('PATCH', `/cash/transactions/${tx.id}/cancel`, { token, body: { reason: 'Prueba de anulación' } });
  await expectError('PATCH', `/cash/transactions/${tx.id}/cancel`, { token, body: { reason: 'Otra vez' } }, 400);

  const final = await expectOk('GET', `/stays/${stay.id}/checkout-quote`, { token });
  assert.equal(money(final.paid), 0);
  assert.equal(money(final.amount_due), money(quote.price), 'El cobro anulado vuelve a quedar pendiente');
});

test('cierre de turno: guarda la diferencia del arqueo y no permite dos turnos abiertos', async () => {
  await expectError('POST', '/shifts/open', { token, body: { initial_cash_pen: 10 } }, 400);

  const active = await expectOk('GET', '/shifts/active', { token });
  const expected = money(active.live_expected_cash_pen);
  const closed = await expectOk('POST', `/shifts/${active.id}/close`, { token, body: { actual_cash_pen: expected - 5, shift_notes: 'Faltante de prueba' } });
  assert.equal(money(closed.expected_cash_pen), expected);
  assert.equal(money(closed.difference_cash_pen), -5);
  await expectError('POST', `/shifts/${active.id}/close`, { token, body: { actual_cash_pen: 0 } }, 400);

  // Sin turno abierto no se puede cobrar
  await expectError('POST', '/cash/transaction', { token, body: { transaction_type: 'income', concept: 'Sin turno', amount_pen: 5, payment_method: 'CASH' } }, 400);
  await ensureOpenShift(token);
});

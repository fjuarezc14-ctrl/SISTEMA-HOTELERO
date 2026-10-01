import { test, before } from 'node:test';
import { assert, login, expectOk, expectError, ensureOpenShift, testDb } from '../helpers.js';

let token;
let product;

const sale = (body) =>
  expectOk('POST', '/products/direct-sale', { token, body: { items: [{ product_id: product.id, quantity: 1 }], payment_method: 'CASH', ...body } });

const seq = (voucher) => Number(voucher.split('-')[1]);

before(async () => {
  token = await login();
  await ensureOpenShift(token);
  product = (await expectOk('GET', '/products', { token })).find((p) => p.stock >= 10);
  assert.ok(product, 'Se necesita un producto con stock en la base de pruebas');
});

test('las boletas tienen numeración correlativa B001', async () => {
  const a = await sale({ voucher_type: 'BOLETA' });
  const b = await sale({ voucher_type: 'BOLETA' });
  assert.match(a.voucher_number, /^B001-\d{8}$/);
  assert.equal(seq(b.voucher_number), seq(a.voucher_number) + 1);
});

test('sin boleta ni factura se emite ticket interno T001', async () => {
  const t = await sale({});
  assert.equal(t.voucher_type, 'TICKET');
  assert.match(t.voucher_number, /^T001-\d{8}$/);
});

test('la factura exige RUC válido y razón social', async () => {
  await expectError('POST', '/products/direct-sale', {
    token,
    body: { items: [{ product_id: product.id, quantity: 1 }], payment_method: 'CASH', voucher_type: 'FACTURA', customer_ruc: '123', customer_business_name: 'Empresa' }
  }, 400);
  const f = await sale({ voucher_type: 'FACTURA', customer_ruc: '20123456789', customer_business_name: 'Empresa Demo S.A.C.' });
  assert.match(f.voucher_number, /^F001-\d{8}$/);
  assert.equal(f.customer_ruc, '20123456789');
});

test('un pago mixto emite un solo comprobante para toda la venta', async () => {
  const price = Number(product.sale_price_pen);
  const tx = await sale({
    voucher_type: 'BOLETA',
    payment_method: 'MIXED',
    split_payments: [
      { payment_method: 'CASH', amount: Math.round((price - 1) * 100) / 100 },
      { payment_method: 'YAPE_PLIN', amount: 1 }
    ]
  });
  const rows = await testDb('SELECT DISTINCT voucher_number FROM cash_transactions WHERE store_sale_id = $1', [tx.store_sale_id]);
  assert.equal(rows.length, 1, 'Todos los pagos de la venta comparten el mismo número');
});

test('desde caja se emite boleta para un ticket, una sola vez y con número del servidor', async () => {
  const t = await sale({});
  const emitted = await expectOk('PATCH', `/cash/transactions/${t.id}/voucher`, {
    token,
    body: { voucher_type: 'BOLETA', voucher_number: 'B001-99999999' } // el número del cliente se ignora
  });
  assert.equal(emitted.voucher_type, 'BOLETA');
  assert.notEqual(emitted.voucher_number, 'B001-99999999');
  await expectError('PATCH', `/cash/transactions/${t.id}/voucher`, { token, body: { voucher_type: 'BOLETA' } }, 400);
});

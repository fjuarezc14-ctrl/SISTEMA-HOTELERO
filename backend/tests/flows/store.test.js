import { test, before, after } from 'node:test';
import { assert, login, expectOk, expectError, ensureOpenShift, testDb, money } from '../helpers.js';

let token;
let products;
const restorePrices = [];

before(async () => {
  token = await login();
  await ensureOpenShift(token);
  products = (await expectOk('GET', '/products', { token })).filter((p) => p.stock >= 5);
  assert.ok(products.length >= 2, 'Se necesitan al menos 2 productos con stock en la base de pruebas');
});

after(async () => {
  for (const { id, price } of restorePrices) {
    await expectOk('PUT', `/products/${id}`, { token, body: { sale_price_pen: price } }).catch(() => {});
  }
});

test('venta con varios productos: descuenta stock, total exacto y un solo movimiento de caja', async () => {
  const [a, b] = products;
  const total = money(2 * Number(a.sale_price_pen) + Number(b.sale_price_pen));

  const tx = await expectOk('POST', '/products/direct-sale', {
    token,
    body: { items: [{ product_id: a.id, quantity: 2 }, { product_id: b.id, quantity: 1 }], payment_method: 'CASH' }
  });
  assert.equal(money(tx.amount_pen), total);
  assert.equal(tx.category, 'store');
  assert.ok(tx.store_sale_id, 'El movimiento de caja debe enlazar la venta');

  const after = await expectOk('GET', '/products', { token });
  assert.equal(after.find((p) => p.id === a.id).stock, a.stock - 2);
  assert.equal(after.find((p) => p.id === b.id).stock, b.stock - 1);
  products = after.filter((p) => p.stock >= 5);
});

test('cambiar el precio de un producto no altera las ventas anteriores', async () => {
  const product = products[0];
  const oldPrice = money(product.sale_price_pen);

  const tx = await expectOk('POST', '/products/direct-sale', {
    token,
    body: { items: [{ product_id: product.id, quantity: 3 }], payment_method: 'YAPE_PLIN', reference_number: 'OP-555' }
  });

  restorePrices.push({ id: product.id, price: oldPrice });
  await expectOk('PUT', `/products/${product.id}`, { token, body: { sale_price_pen: oldPrice + 7 } });

  const [item] = await testDb(`SELECT * FROM store_sale_items WHERE sale_id = $1`, [tx.store_sale_id]);
  assert.equal(money(item.unit_price_pen), oldPrice, 'El precio unitario guardado debe ser el de la venta');
  assert.equal(money(item.total_price_pen), money(3 * oldPrice));
  assert.equal(item.product_name, product.name);

  // El listado de caja trae el detalle con el precio original (para reimprimir)
  const shift = await expectOk('GET', '/shifts/active', { token });
  const txs = await expectOk('GET', `/cash/transactions?shiftId=${shift.id}&limit=500`, { token });
  const listed = txs.find((t) => t.id === tx.id);
  assert.equal(money(listed.sale_items[0].unit_price_pen), oldPrice);
  assert.equal(money(listed.amount_pen), money(3 * oldPrice));
});

test('pago mixto: el desglose debe sumar el total de la venta', async () => {
  const product = products[1];
  const price = money(product.sale_price_pen);
  await expectError('POST', '/products/direct-sale', {
    token,
    body: {
      items: [{ product_id: product.id, quantity: 1 }],
      payment_method: 'MIXED',
      split_payments: [{ payment_method: 'CASH', amount: money(price - 1) }]
    }
  }, 400);

  const tx = await expectOk('POST', '/products/direct-sale', {
    token,
    body: {
      items: [{ product_id: product.id, quantity: 1 }],
      payment_method: 'MIXED',
      split_payments: [
        { payment_method: 'CASH', amount: money(price - 1) },
        { payment_method: 'CARD', amount: 1 }
      ]
    }
  });
  const rows = await testDb(`SELECT amount_pen, payment_method FROM cash_transactions WHERE store_sale_id = $1 ORDER BY payment_method`, [tx.store_sale_id]);
  assert.equal(rows.length, 2);
  assert.equal(money(rows.reduce((s, r) => s + Number(r.amount_pen), 0)), price);
});

test('no se puede vender más que el stock ni cantidades inválidas', async () => {
  const product = products[0];
  await expectError('POST', '/products/direct-sale', { token, body: { items: [{ product_id: product.id, quantity: product.stock + 1 }], payment_method: 'CASH' } }, 400);
  await expectError('POST', '/products/direct-sale', { token, body: { items: [{ product_id: product.id, quantity: 0 }], payment_method: 'CASH' } }, 400);
  await expectError('POST', '/products/direct-sale', { token, body: { items: [{ product_id: product.id, quantity: 1.5 }], payment_method: 'CASH' } }, 400);
});

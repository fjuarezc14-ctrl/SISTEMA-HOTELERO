import { test, before } from 'node:test';
import { assert, login, expectOk, expectError } from '../helpers.js';

let token;
let item;

const findItem = async (id) => (await expectOk('GET', '/textiles/items', { token })).find((i) => i.id === id);

before(async () => {
  token = await login();
  item = await expectOk('POST', '/textiles/items', {
    token,
    body: { name: `Toalla prueba ${Date.now()}`, category: 'bath', min_stock: 5, initial_qty: 20 }
  });
});

test('ciclo completo: asignar, recambio, retirar, lavandería y retorno con dañadas', async () => {
  await expectOk('POST', `/textiles/items/${item.id}/move`, { token, body: { type: 'assign', quantity: 10 } });
  await expectOk('POST', `/textiles/items/${item.id}/move`, { token, body: { type: 'swap', quantity: 4 } });
  await expectOk('POST', `/textiles/items/${item.id}/move`, { token, body: { type: 'collect', quantity: 3 } });

  let it = await findItem(item.id);
  assert.deepEqual(
    { clean: it.clean_qty, inUse: it.in_use_qty, dirty: it.dirty_qty },
    { clean: 6, inUse: 7, dirty: 7 }
  );
  assert.equal(it.total_qty, 20, 'El total de piezas no cambia al moverlas');

  const batch = await expectOk('POST', '/textiles/laundry', {
    token,
    body: { provider: 'Lavandería de Prueba', items: [{ item_id: item.id, quantity: 7 }] }
  });
  assert.match(batch.code, /^LAV-\d{4}-\d{3}$/);
  it = await findItem(item.id);
  assert.equal(it.dirty_qty, 0);
  assert.equal(it.laundry_qty, 7);

  await expectOk('POST', `/textiles/laundry/${batch.id}/return`, { token, body: { items: [{ item_id: item.id, damaged_qty: 2 }] } });
  it = await findItem(item.id);
  assert.equal(it.laundry_qty, 0);
  assert.equal(it.clean_qty, 11, '6 limpias + 5 que volvieron de lavandería');
  assert.equal(it.discarded_qty, 2);
  assert.equal(it.total_qty, 18, 'Las dañadas salen del total');

  await expectError('POST', `/textiles/laundry/${batch.id}/return`, { token, body: {} }, 400);
});

test('no se mueven más piezas de las que hay ni cantidades inválidas', async () => {
  const it = await findItem(item.id);
  await expectError('POST', `/textiles/items/${item.id}/move`, { token, body: { type: 'assign', quantity: it.clean_qty + 1 } }, 400);
  await expectError('POST', `/textiles/items/${item.id}/move`, { token, body: { type: 'assign', quantity: 0 } }, 400);
  await expectError('POST', `/textiles/items/${item.id}/move`, { token, body: { type: 'teleport', quantity: 1 } }, 400);
  await expectError('POST', '/textiles/laundry', { token, body: { provider: 'X Lavandería', items: [{ item_id: item.id, quantity: 999 }] } }, 400);
});

test('ingreso de stock y alerta de stock bajo', async () => {
  const low = await expectOk('POST', '/textiles/items', { token, body: { name: `Sábana prueba ${Date.now()}`, category: 'bedding', min_stock: 10, initial_qty: 3 } });
  assert.equal((await findItem(low.id)).low_stock, true);
  await expectOk('POST', `/textiles/items/${low.id}/stock`, { token, body: { quantity: 8 } });
  const after = await findItem(low.id);
  assert.equal(after.clean_qty, 11);
  assert.equal(after.low_stock, false);
});

/**
 * Deja la base de PRUEBAS en un estado limpio antes de correr los flujos:
 * borra movimientos (reservas, estadías, caja, ventas, textiles…) y deja las habitaciones disponibles.
 * Conserva usuarios, habitaciones, tipos, productos y configuración.
 * Se niega a correr si DB_NAME no contiene "test".
 */
if (!/test/i.test(process.env.DB_NAME || '')) {
  console.error('❌ resetTestDb solo se ejecuta con una base de datos de pruebas (DB_NAME=hotel_test).');
  process.exit(1);
}

const { query, pool } = await import('../src/config/db.js');

await query(`
  TRUNCATE
    laundry_batch_items, laundry_batches, textile_movements, textile_items,
    store_sale_items, store_sales, cash_transactions, room_consumptions,
    stay_incidents, stays, reservations, work_shifts
  RESTART IDENTITY CASCADE
`);
await query(`UPDATE rooms SET status = 'available'`);
await query(`UPDATE products SET stock = GREATEST(stock, 200)`);
await query(`DELETE FROM voucher_sequences`);
console.log('🧹 Base de pruebas limpia.');
await pool.end();

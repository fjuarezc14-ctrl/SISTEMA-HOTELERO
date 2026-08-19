import { initDatabase, pool } from '../config/db.js';

async function main() {
  console.log('🚀 Ejecutando script independiente de inicialización de Base de Datos...');
  try {
    await initDatabase();
    console.log('✅ Inicialización completada exitosamente.');
  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

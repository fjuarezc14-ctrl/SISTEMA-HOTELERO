import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportBackup() {
  console.log('📦 Generando copia de seguridad (Backup JSON) de la base de datos...');
  try {
    const tables = ['hotel_info', 'users', 'customers', 'room_types', 'rooms', 'work_shifts', 'stays', 'cash_transactions', 'products', 'room_consumptions', 'maintenance_tickets', 'audit_logs'];
    const backupData = {
      timestamp: new Date().toISOString(),
      database: 'hotel_peru_db',
      data: {}
    };

    for (const table of tables) {
      const res = await pool.query(`SELECT * FROM ${table}`);
      backupData.data[table] = res.rows;
    }

    const backupDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup_hotel_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup generado exitosamente en: ${filePath}`);
  } catch (err) {
    console.error('❌ Error generando backup:', err.message);
  } finally {
    await pool.end();
  }
}

exportBackup();

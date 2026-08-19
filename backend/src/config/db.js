import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración del Pool de PostgreSQL
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'hotel_admin',
  password: process.env.DB_PASSWORD || 'hotel_secret_2026',
  database: process.env.DB_NAME || 'hotel_peru_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

/**
 * Ejecuta una consulta SQL parametrizada de forma segura
 * @param {string} text Consulta SQL con parámetros ($1, $2, etc.)
 * @param {Array} params Lista de parámetros
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Query ejecutada:', { text: text.substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Error ejecutando query:', { text, error: error.message });
    throw error;
  }
}

/**
 * Obtiene un cliente dedicado del pool para transacciones atómicas
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Inicializa el esquema y los datos iniciales si no existen
 */
export async function initDatabase() {
  try {
    console.log('Verificando conexión con PostgreSQL...');
    const client = await pool.connect();
    
    try {
      const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
      const seedsPath = path.resolve(__dirname, '../../database/seeds.sql');

      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('✅ Esquema de base de datos PostgreSQL verificado / creado con éxito.');
      }

      if (fs.existsSync(seedsPath)) {
        const seedsSql = fs.readFileSync(seedsPath, 'utf8');
        await client.query(seedsSql);
        console.log('✅ Datos iniciales (Seeds) verificados / cargados con éxito.');
      }

      // Asegurar hash de contraseñas de admin y recepcion
      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('admin123', salt);
      await client.query(
        "UPDATE users SET password_hash = $1 WHERE username IN ('admin', 'recepcion')",
        [defaultHash]
      );
      console.log('✅ Usuarios iniciales verificados con contraseña default (admin123).');

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('⚠️ No se pudo conectar automáticamente a PostgreSQL en el arranque:', error.message);
    console.log('ℹ️ Asegúrate de tener PostgreSQL corriendo con las credenciales de .env o mediante docker-compose up -d');
  }
}

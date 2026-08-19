import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initDatabase } from './config/db.js';
import { getCurrentDateTimePeru, getCurrentTimePeru, TIMEZONE } from './utils/timeHelper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares de seguridad y parsing
app.use(helmet());
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5185'] : '*';
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Endpoint de estado y salud del sistema
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Sistema Hotelero Perú - VT VALETEC',
    timeZone: TIMEZONE,
    currentTime: getCurrentTimePeru(),
    currentDateTime: getCurrentDateTimePeru(),
    currency: 'PEN (S/)',
    version: '1.0.0'
  });
});

// Montar rutas de la API
app.use('/api/v1', apiRouter);

// Middleware global de errores
app.use(errorHandler);

// Inicializar base de datos y arrancar servidor
async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏨 Servidor Hotelero (Perú) ejecutándose en puerto ${PORT}`);
    console.log(`🕒 Hora local (Perú): ${getCurrentDateTimePeru()}`);
    console.log(`💰 Moneda activa: Soles (PEN - S/)`);
    console.log(`📡 URL API: http://localhost:${PORT}/api/v1`);
    console.log(`=======================================================`);
  });
}

startServer();

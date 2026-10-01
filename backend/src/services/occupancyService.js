import { query } from '../config/db.js';

const DEFAULT_BUFFER_MINUTES = 60;

function conflictError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.isOperational = true;
  return error;
}

const fmt = (date) =>
  new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(date));

/**
 * Disponibilidad de habitaciones: una ocupación (reserva o estadía) bloquea la habitación
 * desde su inicio hasta su fin, más un margen de limpieza antes y después (configurable).
 */
export const occupancyService = {
  async getCleaningBufferMinutes() {
    const res = await query('SELECT cleaning_buffer_minutes FROM hotel_info LIMIT 1');
    const value = res.rows[0]?.cleaning_buffer_minutes;
    return Number.isInteger(value) ? value : DEFAULT_BUFFER_MINUTES;
  },

  /**
   * Lanza 409 si el rango [start, end] choca (con margen) con reservas confirmadas o estadías activas.
   */
  async assertRoomFree({ roomId, start, end, excludeReservationId = null, excludeStayId = null }) {
    const buffer = await this.getCleaningBufferMinutes();
    const interval = `${buffer} minutes`;

    // Reservas confirmadas que se cruzan (considerando el margen de limpieza)
    const reservations = await query(
      `SELECT res.start_date, res.end_date, c.full_name
         FROM reservations res
         JOIN customers c ON c.id = res.customer_id
        WHERE res.room_id = $1
          AND res.status = 'confirmed'
          AND ($4::uuid IS NULL OR res.id <> $4::uuid)
          AND $2::timestamptz < res.end_date + $5::interval
          AND res.start_date < $3::timestamptz + $5::interval
        ORDER BY res.start_date
        LIMIT 1`,
      [roomId, start, end, excludeReservationId, interval]
    );
    if (reservations.rows.length > 0) {
      const r = reservations.rows[0];
      throw conflictError(
        `La habitación está reservada del ${fmt(r.start_date)} al ${fmt(r.end_date)} (${r.full_name}). ` +
          `Se requiere un margen de ${buffer} min para limpieza entre ocupaciones.`
      );
    }

    // Estadías activas (huésped actualmente en la habitación)
    const stays = await query(
      `SELECT s.expected_end_time, c.full_name
         FROM stays s
         JOIN customers c ON c.id = s.customer_id
        WHERE s.room_id = $1
          AND s.status = 'active'
          AND ($3::uuid IS NULL OR s.id <> $3::uuid)
          AND $2::timestamptz < s.expected_end_time + $4::interval
        LIMIT 1`,
      [roomId, start, excludeStayId, interval]
    );
    if (stays.rows.length > 0) {
      const s = stays.rows[0];
      throw conflictError(
        `La habitación está ocupada por ${s.full_name} hasta el ${fmt(s.expected_end_time)}. ` +
          `Disponible desde ${fmt(new Date(new Date(s.expected_end_time).getTime() + buffer * 60000))}.`
      );
    }
  },

  /** Próxima reserva confirmada de la habitación (para avisar hasta cuándo está libre) */
  async getNextReservation(roomId, from = new Date()) {
    const res = await query(
      `SELECT res.id, res.start_date, res.end_date, c.full_name
         FROM reservations res
         JOIN customers c ON c.id = res.customer_id
        WHERE res.room_id = $1 AND res.status = 'confirmed' AND res.end_date > $2
        ORDER BY res.start_date
        LIMIT 1`,
      [roomId, from]
    );
    return res.rows[0] || null;
  }
};

import { query } from '../config/db.js';

/**
 * Cálculo de tarifas y horarios de salida (fuente única de verdad: el servidor).
 * Los precios salen del tipo de habitación; nunca del cliente.
 */

const MAX_HOURS = 24;
const MAX_NIGHTS = 60;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
}

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Hora de salida por noche configurada (HH:MM). Por defecto 12:00 */
async function getCheckoutTime() {
  const res = await query('SELECT overnight_checkout_time FROM hotel_info LIMIT 1');
  const value = res.rows[0]?.overnight_checkout_time || '12:00';
  const [h, m] = String(value).split(':').map((n) => parseInt(n, 10));
  return { hours: Number.isInteger(h) ? h : 12, minutes: Number.isInteger(m) ? m : 0 };
}

/** Día siguiente (o N días después) a la hora de salida del hotel (hora local del servidor = Lima) */
function checkoutAfter(start, nights, checkout) {
  const d = new Date(start);
  d.setDate(d.getDate() + nights);
  d.setHours(checkout.hours, checkout.minutes, 0, 0);
  return d;
}

/** Noches entre dos fechas por día calendario (mínimo 1) */
export function nightsBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / 86400000));
}

export const pricingService = {
  /**
   * Tarifa única de una estadía (check-in y reservas usan la misma):
   * modalidad + cantidad (noches/días u horas) + llegada → precio y hora de salida.
   * @returns {{ stay_type, units, price, expected_end_time, breakdown }}
   */
  async quoteStay(room, { stay_type = 'overnight', units, start = new Date() }) {
    const quote =
      stay_type === 'hours'
        ? await this.quoteWalkIn(room, { stay_type, hours_count: units, start })
        : await this.quoteWalkIn(room, { stay_type, nights: units, start });
    return {
      stay_type,
      units: stay_type === 'hours' ? quote.breakdown.hours : quote.breakdown.nights,
      ...quote
    };
  },

  /**
   * Tarifa de una estadía nueva (walk-in).
   * @returns {{ price, expected_end_time, breakdown }}
   */
  async quoteWalkIn(room, { stay_type = 'overnight', hours_count, nights, start = new Date() }) {
    const checkout = await getCheckoutTime();

    if (stay_type === 'hours') {
      const baseHours = Number(room.hours_quantity_default) || 3;
      const hours = hours_count === undefined || hours_count === null || hours_count === '' ? baseHours : Number(hours_count);
      if (!Number.isInteger(hours) || hours < baseHours || hours > MAX_HOURS) {
        throw badRequest(`Las horas deben ser un número entero entre ${baseHours} y ${MAX_HOURS}.`);
      }
      const basePrice = Number(room.price_hours_default);
      const extraRate = Number(room.price_extra_hour_default);
      const extraHours = hours - baseHours;
      return {
        price: round2(basePrice + extraHours * extraRate),
        expected_end_time: new Date(new Date(start).getTime() + hours * 3600000),
        breakdown: { stay_type, hours, base_hours: baseHours, base_price: basePrice, extra_hours: extraHours, extra_hour_rate: extraRate }
      };
    }

    if (stay_type === 'overnight' || stay_type === 'full_day') {
      const count = nights === undefined || nights === null || nights === '' ? 1 : Number(nights);
      if (!Number.isInteger(count) || count < 1 || count > MAX_NIGHTS) {
        throw badRequest(`La cantidad de ${stay_type === 'overnight' ? 'noches' : 'días'} debe ser un número entero entre 1 y ${MAX_NIGHTS}.`);
      }
      const rate = Number(stay_type === 'overnight' ? room.price_overnight_default : room.price_full_day_default);
      return {
        price: round2(rate * count),
        expected_end_time: checkoutAfter(start, count, checkout),
        breakdown: { stay_type, nights: count, nightly_rate: rate }
      };
    }

    throw badRequest('Modalidad de hospedaje no válida.');
  },

  /**
   * Tarifa de un rango de fechas (cotización de una reserva).
   * Precio = noches × tarifa por noche (si es el mismo día y dura hasta 24 h, se cobra por horas).
   */
  quoteRange(room, startDate, endDate) {
    const reservedStart = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(reservedStart.getTime()) || isNaN(end.getTime()) || end <= reservedStart) {
      throw badRequest('Las fechas de la reserva no son válidas.');
    }
    const durationHours = (end - reservedStart) / 3600000;
    const sameDay = reservedStart.toDateString() === end.toDateString();

    if (sameDay && durationHours <= MAX_HOURS) {
      const baseHours = Number(room.hours_quantity_default) || 3;
      const hours = Math.max(baseHours, Math.ceil(durationHours));
      const extraHours = hours - baseHours;
      return {
        stay_type: 'hours',
        price: round2(Number(room.price_hours_default) + extraHours * Number(room.price_extra_hour_default)),
        breakdown: { stay_type: 'hours', hours, base_hours: baseHours, extra_hours: extraHours }
      };
    }

    const nights = nightsBetween(reservedStart, end);
    if (nights > MAX_NIGHTS) throw badRequest(`Una estadía no puede superar ${MAX_NIGHTS} noches.`);
    const nightly = Number(room.price_overnight_default);
    return {
      stay_type: 'overnight',
      price: round2(nights * nightly),
      breakdown: { stay_type: 'overnight', nights, nightly_rate: nightly }
    };
  },

  /**
   * Tarifa de una estadía que viene de una reserva: se respeta la fecha de salida reservada
   * y el precio cotizado al reservar (aunque las tarifas hayan cambiado después).
   */
  async quoteReservation(room, reservation, { start = new Date() } = {}) {
    const end = new Date(reservation.end_date);
    if (end <= new Date(start)) {
      throw badRequest('La reserva ya terminó; no se puede hacer check-in. Reprográmala o crea una nueva.');
    }
    // Reservas con modalidad guardada: misma tarifa que al reservar; antiguas: por rango de fechas
    const quote = reservation.stay_type
      ? await this.quoteStay(room, { stay_type: reservation.stay_type, units: reservation.stay_units, start: reservation.start_date })
      : this.quoteRange(room, reservation.start_date, reservation.end_date);
    const quoted = reservation.quoted_price_pen;
    return {
      ...quote,
      price: quoted !== null && quoted !== undefined ? round2(quoted) : quote.price,
      expected_end_time: end
    };
  },

  /** Abono mínimo para reservar según la configuración (porcentaje del total o monto fijo, nunca más que el total) */
  async minDeposit(total) {
    const res = await query('SELECT reservation_deposit_type, reservation_deposit_value FROM hotel_info LIMIT 1');
    const type = res.rows[0]?.reservation_deposit_type || 'percent';
    const value = Number(res.rows[0]?.reservation_deposit_value ?? 0);
    const min = type === 'fixed' ? value : (Number(total) * value) / 100;
    return { min_deposit: round2(Math.min(Number(total), Math.max(0, min))), rule: { type, value } };
  }
};

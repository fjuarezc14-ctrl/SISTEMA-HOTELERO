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

const parseTime = (value, fallback) => {
  const [h, m] = String(value || fallback).split(':').map((n) => parseInt(n, 10));
  return { hours: Number.isInteger(h) ? h : 0, minutes: Number.isInteger(m) ? m : 0 };
};
const toMinutes = (t) => t.hours * 60 + t.minutes;
const fmtTime = (t) => `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;

/** Horarios configurados del hotel */
async function getSchedule() {
  const res = await query('SELECT overnight_checkout_time, pernocte_start_time, pernocte_checkout_time FROM hotel_info LIMIT 1');
  const row = res.rows[0] || {};
  return {
    dayCheckout: parseTime(row.overnight_checkout_time, '12:00'), // salida de la estadía por días
    pernocteStart: parseTime(row.pernocte_start_time, '20:00'), // el pernocte se vende desde
    pernocteCheckout: parseTime(row.pernocte_checkout_time, '09:00') // salida del pernocte
  };
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
    const schedule = await getSchedule();

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

    // Pernocte: una sola noche, se vende desde la hora configurada y sale a su hora de salida
    if (stay_type === 'overnight') {
      if (nights !== undefined && nights !== null && nights !== '' && Number(nights) !== 1) {
        throw badRequest('El pernocte es de una sola noche. Para más noches usa "Por días".');
      }
      const arrival = new Date(start);
      const minuteOfDay = arrival.getHours() * 60 + arrival.getMinutes();
      const sellFrom = toMinutes(schedule.pernocteStart);
      const leaveAt = toMinutes(schedule.pernocteCheckout);
      const inWindow = sellFrom > leaveAt ? minuteOfDay >= sellFrom || minuteOfDay < leaveAt : minuteOfDay >= sellFrom && minuteOfDay < leaveAt;
      if (!inWindow) {
        throw badRequest(`El pernocte se vende desde las ${fmtTime(schedule.pernocteStart)} hasta las ${fmtTime(schedule.pernocteCheckout)}. Para esta hora usa "Por días" o "Por horas".`);
      }
      const end = new Date(arrival);
      if (minuteOfDay >= leaveAt) end.setDate(end.getDate() + 1); // llega en la noche: sale al día siguiente
      end.setHours(schedule.pernocteCheckout.hours, schedule.pernocteCheckout.minutes, 0, 0);
      const rate = Number(room.price_overnight_default);
      return {
        price: round2(rate),
        expected_end_time: end,
        breakdown: { stay_type, nights: 1, nightly_rate: rate }
      };
    }

    // Por días: N días, sale el último día a la hora de salida del hotel
    if (stay_type === 'full_day') {
      const count = nights === undefined || nights === null || nights === '' ? 1 : Number(nights);
      if (!Number.isInteger(count) || count < 1 || count > MAX_NIGHTS) {
        throw badRequest(`La cantidad de días debe ser un número entero entre 1 y ${MAX_NIGHTS}.`);
      }
      const rate = Number(room.price_full_day_default);
      return {
        price: round2(rate * count),
        expected_end_time: checkoutAfter(start, count, schedule.dayCheckout),
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

    // Reservas antiguas por rango de fechas: se cobran como estadía por días
    const nights = nightsBetween(reservedStart, end);
    if (nights > MAX_NIGHTS) throw badRequest(`Una estadía no puede superar ${MAX_NIGHTS} días.`);
    const daily = Number(room.price_full_day_default);
    return {
      stay_type: 'full_day',
      price: round2(nights * daily),
      breakdown: { stay_type: 'full_day', nights, nightly_rate: daily }
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

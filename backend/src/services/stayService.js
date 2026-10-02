import { stayRepository } from '../repositories/stayRepository.js';
import { roomRepository } from '../repositories/roomRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { companionRepository } from '../repositories/companionRepository.js';
import { incidentRepository } from '../repositories/incidentRepository.js';
import { pricingService } from './pricingService.js';
import { occupancyService } from './occupancyService.js';
import { normalizePayment } from '../utils/payments.js';
import { issueVoucher } from './voucherService.js';
import * as v from '../utils/validate.js';
import { query, withTransaction } from '../config/db.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.isOperational = true;
  return error;
}

/** Reserva confirmada de la habitación (para cotizar el check-in) */
async function loadConfirmedReservation(reservationId, roomId) {
  const res = await query(`SELECT * FROM reservations WHERE id = $1`, [reservationId]);
  const reservation = res.rows[0];
  if (!reservation) throw notFound('Reserva no encontrada.');
  if (reservation.room_id !== roomId) throw badRequest('La reserva no corresponde a esta habitación.');
  if (reservation.status !== 'confirmed') throw badRequest('Esta reserva ya fue procesada o cancelada.');
  return reservation;
}

export const stayService = {
  async getActiveStayByRoom(roomId) {
    const stay = await stayRepository.findActiveByRoomId(roomId);
    if (!stay) return null;
    const [consumptions, payments, companions] = await Promise.all([
      productRepository.findConsumptionsByStayId(stay.id),
      cashRepository.findByStayId(stay.id),
      companionRepository.findByStayId(stay.id)
    ]);
    return {
      ...stay,
      consumptions,
      payments,
      companions
    };
  },

  async getAllActiveStays() {
    return await stayRepository.findAllActive();
  },

  async getStayHistory({ limit = 100, offset = 0, dateFrom, dateTo } = {}) {
    return await stayRepository.findHistory({ limit, offset, dateFrom, dateTo });
  },

  /**
   * Cotización de un check-in (lo que verá el recepcionista antes de confirmar).
   * Incluye conflicto con reservas si lo hay (en `conflict`, sin lanzar error).
   */
  async quoteCheckIn({ room_id, stay_type = 'overnight', units, hours_count, reservation_id = null }) {
    const room = await roomRepository.findRoomById(room_id);
    if (!room) throw notFound('Habitación no encontrada.');

    const reservation = reservation_id ? await loadConfirmedReservation(reservation_id, room.id) : null;
    const start = new Date();
    const quote = reservation
      ? await pricingService.quoteReservation(room, reservation, { start })
      : await pricingService.quoteStay(room, { stay_type, units: units ?? hours_count, start });

    const deposit = reservation ? Number(reservation.deposit_amount_pen || 0) : 0;
    let conflict = null;
    try {
      await occupancyService.assertRoomFree({
        roomId: room.id,
        start,
        end: quote.expected_end_time,
        excludeReservationId: reservation?.id
      });
    } catch (err) {
      if (err.statusCode !== 409) throw err;
      conflict = err.message;
    }

    return {
      stay_type: quote.stay_type,
      price: quote.price,
      deposit,
      amount_due: round2(Math.max(0, quote.price - deposit)),
      expected_end_time: quote.expected_end_time,
      breakdown: quote.breakdown,
      next_reservation: await occupancyService.getNextReservation(room.id),
      conflict
    };
  },

  /**
   * Check-in (walk-in o desde una reserva).
   * El precio y la hora de salida los calcula el servidor (pricingService).
   * `initial_payment` es lo que se cobra ahora; no puede superar el saldo (precio − abono).
   */
  async checkIn({
    room_id,
    customer_data, // { document_type, document_number, full_name, phone } (ignorado si viene de reserva)
    stay_type = 'overnight',
    units,
    hours_count,
    companion_name = '',
    companions = [],
    initial_payment = null, // { amount, payment_method, reference_number, split_payments, voucher_type, customer_ruc, customer_business_name }
    user_id,
    reservation = null // uso interno (convertToCheckIn): reserva confirmada ya validada
  }) {
    // 1. Validar habitación
    const room = await roomRepository.findRoomById(room_id);
    if (!room) throw notFound('Habitación no encontrada.');
    if (room.status !== 'available') {
      throw badRequest(`La habitación no está disponible (Estado actual: ${room.status}).`);
    }

    // 2. Tarifa y salida calculadas en el servidor
    const startTime = new Date();
    const quote = reservation
      ? await pricingService.quoteReservation(room, reservation, { start: startTime })
      : await pricingService.quoteStay(room, { stay_type, units: units ?? hours_count, start: startTime });

    // 3. No pisar reservas de otros (incluye margen de limpieza)
    await occupancyService.assertRoomFree({
      roomId: room.id,
      start: startTime,
      end: quote.expected_end_time,
      excludeReservationId: reservation?.id
    });

    // 4. Cliente
    let customer;
    if (reservation) {
      customer = await customerRepository.findById(reservation.customer_id);
    } else {
      const data = v.customerData(customer_data || {});
      customer = await customerRepository.findByDocument(data.document_number);
      if (!customer) {
        customer = await customerRepository.create({
          document_type: data.document_type,
          document_number: data.document_number,
          full_name: data.full_name,
          phone: data.phone
        });
      } else if (!customer.phone && data.phone) {
        // Cliente registrado: sus datos no se modifican desde el check-in (solo completar teléfono vacío)
        customer = await customerRepository.update(customer.id, { phone: data.phone });
      }
    }
    if (customer.is_blacklisted) {
      const error = new Error(`El cliente se encuentra VETADO del hotel. Motivo: ${customer.blacklist_reason || 'Sin especificar'}`);
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    // 5. Turno activo
    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) activeShift = await shiftRepository.findAnyActiveShift();
    if (!activeShift) {
      throw badRequest('No hay un turno de caja abierto. Por favor, abre un turno antes de realizar un Check-in.');
    }

    // 6. Validar el cobro: no más que el saldo (precio − abono de la reserva)
    const deposit = reservation ? Number(reservation.deposit_amount_pen || 0) : 0;
    const amountDue = round2(Math.max(0, quote.price - deposit));
    const payments = normalizePayment(initial_payment, amountDue);

    const paidNow = payments.reduce((sum, p) => sum + p.amount, 0);

    // 7. Ejecutar todas las escrituras dentro de una transacción atómica
    return await withTransaction(async (txQuery) => {
      // Bloquear habitación para verificar que sigue disponible antes de asignar
      const lockRes = await txQuery('SELECT id, status FROM rooms WHERE id = $1 FOR UPDATE', [room.id]);
      if (lockRes.rows[0]?.status !== 'available') {
        throw badRequest(`La habitación ya no está disponible (Estado actual: ${lockRes.rows[0]?.status}).`);
      }

      // Comprobante (si hay cobro): dentro de la transacción para no dejar saltos en la numeración
      const voucher = payments.length > 0 ? await issueVoucher(initial_payment, txQuery) : null;

      // Crear la estadía
      const stay = await stayRepository.create({
        room_id: room.id,
        customer_id: customer.id,
        work_shift_id: activeShift.id,
        stay_type: quote.stay_type,
        start_time: startTime.toISOString(),
        expected_end_time: new Date(quote.expected_end_time).toISOString(),
        companion_name: companion_name ? String(companion_name).trim().slice(0, 150) : '',
        total_stay_price_pen: quote.price
      }, txQuery);
      await customerRepository.incrementVisits(customer.id, txQuery);

      // Habitación ocupada
      await roomRepository.updateRoomStatus(room.id, 'occupied', `Huésped: ${customer.full_name}`, txQuery);

      // Registrar en caja lo cobrado ahora
      for (const p of payments) {
        const methodLabel = p.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : p.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
        await cashRepository.create({
          work_shift_id: activeShift.id,
          stay_id: stay.id,
          user_id,
          transaction_type: 'income',
          concept: `Hospedaje Hab. ${room.room_number} - ${customer.full_name}${payments.length > 1 ? ` (${methodLabel})` : ''}`.slice(0, 150),
          category: 'stay',
          amount_pen: p.amount,
          payment_method: p.payment_method,
          reference_number: p.reference_number,
          ...voucher
        }, txQuery);
      }

      const updated = await stayRepository.updateStayPrices(stay.id, { total_paid_pen: round2(deposit + paidNow) }, txQuery);

      // Si viene de una reserva con abono, vincular los movimientos de caja de la seña a esta estadía.
      // Abonos anteriores a la columna reservation_id: se buscan por turno y concepto.
      if (reservation && deposit > 0) {
        await txQuery(
          `UPDATE cash_transactions
           SET stay_id = $1
           WHERE stay_id IS NULL
             AND (
               reservation_id = $2
               OR (reservation_id IS NULL AND work_shift_id = $3 AND category = 'stay' AND concept LIKE $4)
             )`,
          [stay.id, reservation.id, reservation.work_shift_id, `Abono de Reserva Hab. ${room.room_number} - %`]
        );
      }

      // Acompañantes (Ficha Registral MINCETUR / PNP)
      if (Array.isArray(companions) && companions.length > 0) {
        for (const comp of companions) {
          if (comp.full_name && comp.document_number) {
            await companionRepository.addCompanion({
              stay_id: stay.id,
              document_type: comp.document_type || 'DNI',
              document_number: String(comp.document_number).trim(),
              full_name: String(comp.full_name).trim(),
              age: comp.age ? Number(comp.age) : null,
              nationality: comp.nationality || 'Peruana',
              origin_city: comp.origin_city || 'Lima',
              destination_city: comp.destination_city || 'Lima',
              travel_reason: comp.travel_reason || 'Turismo / Vacaciones'
            }, txQuery);
          }
        }
      }

      return { ...(updated || stay), voucher, paid_now: round2(paidNow), payments };
    });
  },

  /**
   * Cálculo del checkout (sin modificar nada): horas extra por salir tarde, consumos, penalidad y saldo.
   */
  async quoteCheckOut(stay_id, { penalty_amount_pen = 0, now = new Date() } = {}) {
    const stay = await stayRepository.findById(stay_id);
    if (!stay) throw notFound('Estadía no encontrada.');
    if (stay.status !== 'active') throw badRequest('Esta estadía ya fue finalizada.');

    const penalty = round2(penalty_amount_pen || 0);
    if (!Number.isFinite(penalty) || penalty < 0) throw badRequest('La penalidad debe ser un monto válido (cero o mayor).');

    // Horas extra por sobrestadía (después de la tolerancia configurada)
    let overstayHours = 0;
    let overstayCost = 0;
    const expectedEnd = new Date(stay.expected_end_time);
    if (now > expectedEnd) {
      const diffMinutes = Math.floor((now.getTime() - expectedEnd.getTime()) / 60000);
      const hotelInfoRes = await query('SELECT grace_period_minutes FROM hotel_info LIMIT 1');
      const graceMinutes = hotelInfoRes.rows[0]?.grace_period_minutes ?? 10;
      if (diffMinutes > graceMinutes) {
        overstayHours = Math.ceil((diffMinutes - graceMinutes) / 60);
        const room = await roomRepository.findRoomById(stay.room_id);
        overstayCost = round2(overstayHours * Number(room?.price_extra_hour_default || 0));
      }
    }

    const stayPrice = round2(stay.total_stay_price_pen);
    const consumptions = round2(stay.total_consumptions_price_pen);
    const paid = round2(stay.total_paid_pen);
    const total = round2(stayPrice + overstayCost + consumptions + penalty);
    const balance = round2(total - paid);

    return {
      stay_price: stayPrice,
      overstay_hours: overstayHours,
      overstay_cost: overstayCost,
      consumptions,
      penalty,
      total,
      paid,
      balance,
      overpayment: balance < 0 ? Math.abs(balance) : 0,
      amount_due: round2(Math.max(0, balance))
    };
  },

  /**
   * Check-out: exige cobrar el saldo pendiente completo (estadía + horas extra + consumos + penalidad − pagado).
   * Ejecutado dentro de una transacción atómica con bloqueo a nivel de fila (FOR UPDATE).
   */
  async checkOut({ stay_id, user_id, final_payment = null, incident_data = null }) {
    return await withTransaction(async (txQuery) => {
      // Bloqueo exclusivo a nivel de fila para evitar double check-out simultáneo
      const stay = await stayRepository.findByIdForUpdate(stay_id, txQuery);
      if (!stay) throw notFound('Estadía no encontrada.');
      if (stay.status !== 'active') throw badRequest('Esta estadía ya fue finalizada o cancelada.');

      const hasIncident = Boolean(incident_data?.description && String(incident_data.description).trim());
      const penalty = hasIncident ? round2(incident_data.penalty_amount_pen || 0) : 0;
      const quote = await this.quoteCheckOut(stay_id, { penalty_amount_pen: penalty });

      // El cobro debe cubrir exactamente el saldo pendiente
      const payments = normalizePayment(final_payment, quote.amount_due);
      const paidNow = round2(payments.reduce((sum, p) => sum + p.amount, 0));
      if (Math.abs(paidNow - quote.amount_due) > 0.01) {
        throw badRequest(`Saldo pendiente de S/ ${quote.amount_due.toFixed(2)}: se debe cobrar el monto completo antes del check-out.`);
      }

      let activeShift = null;
      if (paidNow > 0) {
        activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
        if (!activeShift) activeShift = await shiftRepository.findAnyActiveShift();
        if (!activeShift) throw badRequest('No hay un turno de caja abierto para registrar el cobro del check-out.');
      }

      // Horas extra por sobrestadía al precio de la estadía
      if (quote.overstay_cost > 0) {
        await stayRepository.updateStayPrices(stay.id, { total_stay_price_pen: round2(quote.stay_price + quote.overstay_cost) }, txQuery);
      }

      // Registrar en caja: primero penalidad (incidente), luego consumos (tienda) y finalmente saldo de estadía (hospedaje)
      const voucher = payments.length > 0 ? await issueVoucher(final_payment, txQuery) : null;
      let penaltyLeft = quote.penalty;
      let storeLeft = round2(Math.min(quote.consumptions, Math.max(0, quote.amount_due - penaltyLeft)));
      let stayLeft = round2(Math.max(0, quote.amount_due - penaltyLeft - storeLeft));

      let consumptionSummary = '';
      if (storeLeft > 0) {
        const consumptionsRes = await txQuery(
          'SELECT product_name, quantity FROM room_consumptions WHERE stay_id = $1 ORDER BY id ASC',
          [stay.id]
        );
        if (consumptionsRes.rows.length > 0) {
          consumptionSummary = consumptionsRes.rows.map(c => `${c.quantity}x ${c.product_name}`).join(', ');
        }
      }

      for (const p of payments) {
        const methodLabel = p.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : p.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
        const suffix = payments.length > 1 ? ` (${methodLabel})` : '';

        // 1. Asignar parte a penalidad / daños
        const penaltyPart = round2(Math.min(penaltyLeft, p.amount));
        penaltyLeft = round2(penaltyLeft - penaltyPart);
        let rem = round2(p.amount - penaltyPart);

        // 2. Asignar parte a consumos de tienda
        const storePart = round2(Math.min(storeLeft, rem));
        storeLeft = round2(storeLeft - storePart);
        rem = round2(rem - storePart);

        // 3. Asignar resto a hospedaje
        const stayPart = round2(Math.min(stayLeft, rem));
        stayLeft = round2(stayLeft - stayPart);

        if (penaltyPart > 0) {
          await cashRepository.create({
            work_shift_id: activeShift.id,
            stay_id: stay.id,
            user_id,
            transaction_type: 'income',
            concept: `Penalidad Check-out Hab. ${stay.room_number} - ${stay.customer_name}${suffix}`.slice(0, 150),
            category: 'incident',
            amount_pen: penaltyPart,
            payment_method: p.payment_method,
            reference_number: p.reference_number,
            ...voucher
          }, txQuery);
        }
        if (storePart > 0) {
          const storeConcept = consumptionSummary
            ? `Consumos Tienda Hab. ${stay.room_number} - ${stay.customer_name}: ${consumptionSummary}${suffix}`
            : `Consumos Tienda Hab. ${stay.room_number} - ${stay.customer_name}${suffix}`;
          await cashRepository.create({
            work_shift_id: activeShift.id,
            stay_id: stay.id,
            user_id,
            transaction_type: 'income',
            concept: storeConcept.slice(0, 150),
            category: 'store',
            amount_pen: storePart,
            payment_method: p.payment_method,
            reference_number: p.reference_number,
            ...voucher
          }, txQuery);
        }
        if (stayPart > 0) {
          await cashRepository.create({
            work_shift_id: activeShift.id,
            stay_id: stay.id,
            user_id,
            transaction_type: 'income',
            concept: `Pago Check-out Hab. ${stay.room_number} - ${stay.customer_name}${suffix}`.slice(0, 150),
            category: 'stay',
            amount_pen: stayPart,
            payment_method: p.payment_method,
            reference_number: p.reference_number,
            ...voucher
          }, txQuery);
        }
      }

      if (paidNow > 0) {
        // Lo pagado de la estadía (sin la penalidad, que se registra en el incidente)
        await stayRepository.updateStayPrices(stay.id, {
          total_paid_pen: round2(quote.paid + paidNow - quote.penalty)
        }, txQuery);
      }

      // Incidente reportado en el check-out: si tuvo penalidad, ya quedó cobrada
      if (hasIncident) {
        await incidentRepository.create({
          stay_id: stay.id,
          room_id: stay.room_id,
          customer_id: stay.customer_id,
          user_id,
          incident_type: incident_data.incident_type || 'damage',
          description: String(incident_data.description).trim().slice(0, 1000),
          penalty_amount_pen: quote.penalty,
          status: quote.penalty > 0 ? 'resolved' : 'reported'
        }, txQuery);
      }

      // Completar estadía y pasar la habitación a limpieza
      const completedStay = await stayRepository.completeStay(stay.id, new Date(), txQuery);
      await roomRepository.updateRoomStatus(stay.room_id, 'cleaning', 'Pendiente de limpieza tras check-out', txQuery);

      return { ...completedStay, voucher, payments, checkout_summary: { ...quote, paid_now: paidNow } };
    });
  },

  /** Extender la estadía N horas, cobrando cada hora a la tarifa de hora extra (se cobra al momento). */
  async addExtraHours({ stay_id, hours_count = 1, payment_method = 'CASH', reference_number = '', split_payments = null, voucher_type, customer_ruc, customer_business_name, user_id }) {
    // Validar medio de pago antes de procesar
    v.oneOf(payment_method, 'Medio de pago', ['CASH', 'YAPE_PLIN', 'CARD', 'MIXED']);

    const hours = Number(hours_count);
    if (!Number.isInteger(hours) || hours < 1 || hours > 24) {
      throw badRequest('Las horas extra deben ser un número entero entre 1 y 24.');
    }

    return await withTransaction(async (txQuery) => {
      // Bloqueo a nivel de fila para evitar operaciones concurrentes en la misma estadía
      const stay = await stayRepository.findByIdForUpdate(stay_id, txQuery);
      if (!stay || stay.status !== 'active') throw notFound('Estadía activa no encontrada.');

      const room = await roomRepository.findRoomById(stay.room_id, txQuery);
      const extraHoursCost = round2(hours * Number(room?.price_extra_hour_default || 0));

      // 1. Nueva hora de salida: no puede pisar una reserva (con margen de limpieza)
      const newExpectedEnd = new Date(new Date(stay.expected_end_time).getTime() + hours * 3600000);
      await occupancyService.assertRoomFree({
        roomId: stay.room_id,
        start: stay.expected_end_time,
        end: newExpectedEnd,
        excludeStayId: stay.id
      });

      // 2. Turno de caja activo
      let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
      if (!activeShift) activeShift = await shiftRepository.findAnyActiveShift();
      if (!activeShift) throw badRequest('No hay un turno de caja abierto para registrar el cobro de horas extras.');

      // 3. Cobro exacto del costo de las horas extra
      const payments = normalizePayment({ amount: extraHoursCost, payment_method, reference_number, split_payments }, extraHoursCost);
      const voucher = await issueVoucher({ voucher_type, customer_ruc, customer_business_name });
      for (const p of payments) {
        const methodLabel = p.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : p.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
        await cashRepository.create({
          work_shift_id: activeShift.id,
          stay_id: stay.id,
          user_id,
          transaction_type: 'income',
          concept: `Hora Extra (x${hours}) Hab. ${stay.room_number} - ${stay.customer_name}${payments.length > 1 ? ` (${methodLabel})` : ''}`.slice(0, 150),
          category: 'stay',
          amount_pen: p.amount,
          payment_method: p.payment_method,
          reference_number: p.reference_number,
          ...voucher
        }, txQuery);
      }

      // 4. Total de la estadía y total pagado
      await stayRepository.updateStayPrices(stay.id, {
        total_stay_price_pen: round2(Number(stay.total_stay_price_pen) + extraHoursCost),
        total_paid_pen: round2(Number(stay.total_paid_pen) + extraHoursCost)
      }, txQuery);

      // 5. Nueva fecha límite
      await stayRepository.updateExpectedEndTime(stay.id, newExpectedEnd.toISOString(), txQuery);

      const activeStay = await this.getActiveStayByRoom(stay.room_id);
      return { ...activeStay, voucher, payments, extra_hours: hours, extra_cost: extraHoursCost };
    });
  }
};

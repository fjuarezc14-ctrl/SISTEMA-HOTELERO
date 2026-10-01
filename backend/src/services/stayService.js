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
import { query } from '../config/db.js';

const PAYMENT_METHODS = ['CASH', 'YAPE_PLIN', 'CARD'];
const round2 = (n) => Math.round(Number(n) * 100) / 100;

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

/**
 * Valida un pago (simple o mixto) contra el saldo pendiente.
 * Devuelve la lista de pagos [{ amount, payment_method, reference_number }] (vacía si no se cobra nada).
 */
export function normalizePayment(payment, amountDue) {
  if (!payment || !(Number(payment.amount) > 0)) return [];

  const amount = round2(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('El monto a cobrar no es válido.');
  if (amount > amountDue + 0.01) {
    throw badRequest(`El monto cobrado (S/ ${amount.toFixed(2)}) supera el saldo pendiente (S/ ${amountDue.toFixed(2)}).`);
  }

  if (payment.payment_method === 'MIXED') {
    const splits = (Array.isArray(payment.split_payments) ? payment.split_payments : [])
      .map((sp) => ({
        amount: round2(sp.amount || 0),
        payment_method: sp.payment_method,
        reference_number: String(sp.reference_number || payment.reference_number || '').trim().slice(0, 50)
      }))
      .filter((sp) => sp.amount > 0);
    if (splits.some((sp) => !PAYMENT_METHODS.includes(sp.payment_method) || sp.amount < 0)) {
      throw badRequest('El pago mixto contiene un medio de pago no válido.');
    }
    const sum = round2(splits.reduce((acc, sp) => acc + sp.amount, 0));
    if (Math.abs(sum - amount) > 0.01) {
      throw badRequest(`El desglose del pago mixto (S/ ${sum.toFixed(2)}) debe sumar el monto cobrado (S/ ${amount.toFixed(2)}).`);
    }
    return splits;
  }

  const method = payment.payment_method || 'CASH';
  if (!PAYMENT_METHODS.includes(method)) throw badRequest('Medio de pago no válido.');
  return [{ amount, payment_method: method, reference_number: String(payment.reference_number || '').trim().slice(0, 50) }];
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
  async quoteCheckIn({ room_id, stay_type = 'overnight', hours_count, reservation_id = null }) {
    const room = await roomRepository.findRoomById(room_id);
    if (!room) throw notFound('Habitación no encontrada.');

    const reservation = reservation_id ? await loadConfirmedReservation(reservation_id, room.id) : null;
    const start = new Date();
    const quote = reservation
      ? await pricingService.quoteReservation(room, reservation, { start })
      : { stay_type, ...(await pricingService.quoteWalkIn(room, { stay_type, hours_count, start })) };

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
      : { stay_type, ...(await pricingService.quoteWalkIn(room, { stay_type, hours_count, start: startTime })) };

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
      if (!customer_data?.document_number || !customer_data?.full_name) {
        throw badRequest('El documento y el nombre del huésped son obligatorios.');
      }
      customer = await customerRepository.findByDocument(String(customer_data.document_number).trim());
      if (!customer) {
        customer = await customerRepository.create({
          document_type: customer_data.document_type || 'DNI',
          document_number: String(customer_data.document_number).trim(),
          full_name: String(customer_data.full_name).trim().slice(0, 150),
          phone: customer_data.phone ? String(customer_data.phone).trim() : ''
        });
      } else if (!customer.phone && customer_data.phone) {
        // Cliente registrado: sus datos no se modifican desde el check-in (solo completar teléfono vacío)
        customer = await customerRepository.update(customer.id, { phone: String(customer_data.phone).trim() });
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

    // 7. Crear la estadía
    const stay = await stayRepository.create({
      room_id: room.id,
      customer_id: customer.id,
      work_shift_id: activeShift.id,
      stay_type: quote.stay_type,
      start_time: startTime.toISOString(),
      expected_end_time: new Date(quote.expected_end_time).toISOString(),
      companion_name: companion_name ? String(companion_name).trim().slice(0, 150) : '',
      total_stay_price_pen: quote.price
    });
    await customerRepository.incrementVisits(customer.id);

    // 8. Habitación ocupada
    await roomRepository.updateRoomStatus(room.id, 'occupied', `Huésped: ${customer.full_name}`);

    // 9. Registrar en caja lo cobrado ahora (el abono de la reserva ya está en caja)
    const paidNow = payments.reduce((sum, p) => sum + p.amount, 0);
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
        voucher_type: initial_payment?.voucher_type || 'TICKET',
        customer_ruc: initial_payment?.customer_ruc || '',
        customer_business_name: initial_payment?.customer_business_name || ''
      });
    }

    const updated = await stayRepository.updateStayPrices(stay.id, { total_paid_pen: round2(deposit + paidNow) });

    // 10. Acompañantes (Ficha Registral MINCETUR / PNP)
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
          });
        }
      }
    }

    return updated || stay;
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

    return {
      stay_price: stayPrice,
      overstay_hours: overstayHours,
      overstay_cost: overstayCost,
      consumptions,
      penalty,
      total,
      paid,
      amount_due: round2(Math.max(0, total - paid))
    };
  },

  /**
   * Check-out: exige cobrar el saldo pendiente completo (estadía + horas extra + consumos + penalidad − pagado).
   */
  async checkOut({ stay_id, user_id, final_payment = null, incident_data = null }) {
    const stay = await stayRepository.findById(stay_id);
    if (!stay) throw notFound('Estadía no encontrada.');
    if (stay.status !== 'active') throw badRequest('Esta estadía ya fue finalizada.');

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
      await stayRepository.updateStayPrices(stay.id, { total_stay_price_pen: round2(quote.stay_price + quote.overstay_cost) });
    }

    // Registrar en caja: primero la penalidad (categoría incidente) y luego el resto (estadía)
    let penaltyLeft = quote.penalty;
    for (const p of payments) {
      const methodLabel = p.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : p.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
      const suffix = payments.length > 1 ? ` (${methodLabel})` : '';
      const penaltyPart = round2(Math.min(penaltyLeft, p.amount));
      const stayPart = round2(p.amount - penaltyPart);
      penaltyLeft = round2(penaltyLeft - penaltyPart);

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
          reference_number: p.reference_number
        });
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
          reference_number: p.reference_number
        });
      }
    }

    if (paidNow > 0) {
      // Lo pagado de la estadía (sin la penalidad, que se registra en el incidente)
      await stayRepository.updateStayPrices(stay.id, {
        total_paid_pen: round2(quote.paid + paidNow - quote.penalty)
      });
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
      });
    }

    // Completar estadía y pasar la habitación a limpieza
    const completedStay = await stayRepository.completeStay(stay.id);
    await roomRepository.updateRoomStatus(stay.room_id, 'cleaning', 'Pendiente de limpieza tras check-out');

    return { ...completedStay, checkout_summary: { ...quote, paid_now: paidNow } };
  },

  /** Extender la estadía N horas, cobrando cada hora a la tarifa de hora extra (se cobra al momento). */
  async addExtraHours({ stay_id, hours_count = 1, payment_method = 'CASH', reference_number = '', split_payments = null, user_id }) {
    const stay = await stayRepository.findById(stay_id);
    if (!stay || stay.status !== 'active') throw notFound('Estadía activa no encontrada.');

    const hours = Number(hours_count);
    if (!Number.isInteger(hours) || hours < 1 || hours > 24) {
      throw badRequest('Las horas extra deben ser un número entero entre 1 y 24.');
    }

    const room = await roomRepository.findRoomById(stay.room_id);
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
        reference_number: p.reference_number
      });
    }

    // 4. Total de la estadía y total pagado
    await stayRepository.updateStayPrices(stay.id, {
      total_stay_price_pen: round2(Number(stay.total_stay_price_pen) + extraHoursCost),
      total_paid_pen: round2(Number(stay.total_paid_pen) + extraHoursCost)
    });

    // 5. Nueva fecha límite
    await stayRepository.updateExpectedEndTime(stay.id, newExpectedEnd.toISOString());

    return await this.getActiveStayByRoom(stay.room_id);
  }
};

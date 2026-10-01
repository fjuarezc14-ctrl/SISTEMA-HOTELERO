import { reservationRepository } from '../repositories/reservationRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { roomRepository } from '../repositories/roomRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { stayService } from './stayService.js';
import { occupancyService } from './occupancyService.js';
import { issueVoucher } from './voucherService.js';
import { normalizePayment } from '../utils/payments.js';

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
}

const MAX_RESERVATION_DAYS = 60;

/** Valida el rango de fechas de una reserva y devuelve las fechas como Date */
function parseReservationRange(start_date, end_date, { allowPastStart = false } = {}) {
  const start = new Date(start_date);
  const end = new Date(end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw badRequest('Las fechas de la reserva no son válidas.');
  if (start >= end) throw badRequest('La fecha de salida debe ser posterior a la fecha de llegada.');
  if (!allowPastStart && start.getTime() < Date.now() - 60 * 60 * 1000) {
    throw badRequest('La fecha de llegada no puede ser en el pasado.');
  }
  if (end.getTime() - start.getTime() > MAX_RESERVATION_DAYS * 86400000) {
    throw badRequest(`Una reserva no puede durar más de ${MAX_RESERVATION_DAYS} días.`);
  }
  return { start, end };
}

export const reservationService = {
  async getAllReservations(status) {
    return await reservationRepository.findAll({ status });
  },

  async createReservation({
    room_id,
    customer_data, // { document_type, document_number, full_name, phone }
    start_date,
    end_date,
    deposit_amount_pen = 0,
    payment_method = 'YAPE_PLIN',
    reference_number = '',
    split_payments = null,
    notes = '',
    voucher_type,
    customer_ruc,
    customer_business_name,
    user_id
  }) {
    if (!room_id || !customer_data?.document_number || !customer_data?.full_name || !start_date || !end_date) {
      throw badRequest('Habitación, cliente, fecha de inicio y fin son obligatorios.');
    }

    parseReservationRange(start_date, end_date);

    const deposit = Number(deposit_amount_pen || 0);
    if (!Number.isFinite(deposit) || deposit < 0) {
      throw badRequest('El abono inicial debe ser un monto válido (cero o mayor).');
    }

    const room = await roomRepository.findRoomById(room_id);
    if (!room) {
      const error = new Error('Habitación no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    if (room.status === 'maintenance') {
      throw badRequest('La habitación está en mantenimiento y no se puede reservar.');
    }

    // Anti-overbooking: rango ocupado + margen de limpieza (reservas y estadías activas)
    await occupancyService.assertRoomFree({ roomId: room.id, start: start_date, end: end_date });

    // Registrar o actualizar cliente
    let customer = await customerRepository.findByDocument(customer_data.document_number.trim());
    if (customer) {
      if (customer.is_blacklisted) {
        const error = new Error(`El cliente ${customer.full_name} se encuentra VETADO del hotel (Lista Negra). Motivo: ${customer.blacklist_reason || 'Sin especificar'}. No se pueden realizar reservas.`);
        error.statusCode = 403;
        error.isOperational = true;
        throw error;
      }
    } else {
      customer = await customerRepository.create({
        document_type: customer_data.document_type || 'DNI',
        document_number: customer_data.document_number.trim(),
        full_name: customer_data.full_name.trim(),
        phone: customer_data.phone ? customer_data.phone.trim() : ''
      });
    }

    // Buscar turno activo para registrar la seña en caja si aplica
    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) {
      activeShift = await shiftRepository.findAnyActiveShift();
    }
    if (deposit > 0 && !activeShift) {
      throw badRequest('Para registrar un abono inicial debe haber un turno de caja abierto.');
    }
    // El abono (simple o mixto) debe sumar exactamente el monto indicado
    const depositPayments = deposit > 0 ? normalizePayment({ amount: deposit, payment_method, reference_number, split_payments }, deposit) : [];
    const voucher = deposit > 0 ? await issueVoucher({ voucher_type: voucher_type || 'TICKET', customer_ruc, customer_business_name }) : null;

    const reservation = await reservationRepository.create({
      room_id: room.id,
      customer_id: customer.id,
      work_shift_id: activeShift ? activeShift.id : null,
      start_date,
      end_date,
      deposit_amount_pen: deposit,
      payment_method,
      notes: String(notes || '').trim().slice(0, 250)
    });

    // Abono inicial en caja (un comprobante para todo el abono)
    for (const p of depositPayments) {
      const methodLabel = p.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : p.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
      await cashRepository.create({
        work_shift_id: activeShift.id,
        user_id,
        transaction_type: 'income',
        concept: `Abono de Reserva Hab. ${room.room_number} - ${customer.full_name}${depositPayments.length > 1 ? ` (${methodLabel})` : ''}`.slice(0, 150),
        category: 'stay',
        amount_pen: p.amount,
        payment_method: p.payment_method,
        reference_number: p.reference_number,
        ...voucher
      });
    }

    return { ...reservation, voucher };
  },

  // Reprogramar: habitación, fechas y notas. El abono y el estado no se cambian por aquí
  // (el abono ya está registrado en caja; el estado tiene sus propias acciones).
  async updateReservation(id, { room_id, start_date, end_date, notes }) {
    const existing = await reservationRepository.findById(id);
    if (!existing) {
      const error = new Error('Reserva no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    if (existing.status !== 'confirmed') {
      throw badRequest('Solo se pueden reprogramar reservas confirmadas.');
    }

    const targetRoomId = room_id || existing.room_id;
    const targetStartDate = start_date || existing.start_date;
    const targetEndDate = end_date || existing.end_date;

    // Mantener la llegada original (aunque ya haya pasado) está permitido
    const sameStart = new Date(targetStartDate).getTime() === new Date(existing.start_date).getTime();
    parseReservationRange(targetStartDate, targetEndDate, { allowPastStart: sameStart });

    await occupancyService.assertRoomFree({
      roomId: targetRoomId,
      start: targetStartDate,
      end: targetEndDate,
      excludeReservationId: id
    });

    return await reservationRepository.update(id, {
      room_id: targetRoomId,
      start_date: targetStartDate,
      end_date: targetEndDate,
      notes: notes !== undefined ? String(notes).trim().slice(0, 250) : undefined
    });
  },

  // Check-in desde una reserva: respeta la salida reservada y cobra solo el saldo (total − abono)
  async convertToCheckIn(reservationId, { user_id, initial_payment = null, companion_name = '' }) {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      const error = new Error('Reserva no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (reservation.status !== 'confirmed') {
      throw badRequest('Esta reserva ya fue procesada o cancelada.');
    }

    const stay = await stayService.checkIn({
      room_id: reservation.room_id,
      companion_name,
      initial_payment,
      user_id,
      reservation
    });

    // Actualizar estado de reserva a checked_in
    await reservationRepository.updateStatus(reservation.id, 'checked_in');

    return stay;
  },

  async cancelReservation(id) {
    return await reservationRepository.updateStatus(id, 'cancelled');
  },

  async noShowReservation(id) {
    return await reservationRepository.updateStatus(id, 'no_show');
  }
};

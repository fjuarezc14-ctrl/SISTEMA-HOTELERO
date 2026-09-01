import { reservationRepository } from '../repositories/reservationRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { roomRepository } from '../repositories/roomRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { stayService } from './stayService.js';

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
    user_id
  }) {
    if (!room_id || !customer_data?.document_number || !start_date || !end_date) {
      const error = new Error('Habitación, cliente, fecha de inicio y fin son obligatorios.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const room = await roomRepository.findRoomById(room_id);
    if (!room) {
      const error = new Error('Habitación no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    // Registrar o actualizar cliente
    let customer = await customerRepository.findByDocument(customer_data.document_number.trim());
    if (!customer) {
      customer = await customerRepository.create({
        document_type: customer_data.document_type || 'DNI',
        document_number: customer_data.document_number.trim(),
        full_name: customer_data.full_name.trim(),
        phone: customer_data.phone ? customer_data.phone.trim() : ''
      });
    }

    // Validar anticolisión (Anti-Overbooking)
    const collisions = await reservationRepository.findCollisions(room.id, start_date, end_date);
    if (collisions.length > 0) {
      const error = new Error('Conflicto de reserva: La habitación ya se encuentra reservada en el rango de fechas seleccionado.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Buscar turno activo para registrar la seña en caja si aplica
    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) {
      activeShift = await shiftRepository.findAnyActiveShift();
    }

    const reservation = await reservationRepository.create({
      room_id: room.id,
      customer_id: customer.id,
      work_shift_id: activeShift ? activeShift.id : null,
      start_date,
      end_date,
      deposit_amount_pen: Number(deposit_amount_pen || 0),
      payment_method,
      notes: notes.trim()
    });

    // Si hubo abono/seña, registrarlo en caja (con soporte para Pago Mixto)
    if (activeShift && Number(deposit_amount_pen) > 0) {
      if (payment_method === 'MIXED' && Array.isArray(split_payments) && split_payments.length > 0) {
        for (const item of split_payments) {
          const itemAmt = Number(item.amount || 0);
          if (itemAmt > 0) {
            const methodLabel = item.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : item.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
            await cashRepository.create({
              work_shift_id: activeShift.id,
              user_id,
              transaction_type: 'income',
              concept: `Abono de Reserva Hab. ${room.room_number} - ${customer.full_name} (${methodLabel})`,
              category: 'stay',
              amount_pen: itemAmt,
              payment_method: item.payment_method,
              reference_number: item.reference_number || ''
            });
          }
        }
      } else {
        await cashRepository.create({
          work_shift_id: activeShift.id,
          user_id,
          transaction_type: 'income',
          concept: `Abono de Reserva Hab. ${room.room_number} - ${customer.full_name}`,
          category: 'stay',
          amount_pen: Number(deposit_amount_pen),
          payment_method: payment_method || 'CASH',
          reference_number: reference_number || ''
        });
      }
    }

    return reservation;
  },

  async updateReservation(id, { room_id, start_date, end_date, deposit_amount_pen, notes, status }) {
    const existing = await reservationRepository.findById(id);
    if (!existing) {
      const error = new Error('Reserva no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const targetRoomId = room_id || existing.room_id;
    const targetStartDate = start_date || existing.start_date;
    const targetEndDate = end_date || existing.end_date;

    // Verificar anticolisión si cambian fechas o habitación
    const collisions = await reservationRepository.findCollisions(targetRoomId, targetStartDate, targetEndDate, id);
    if (collisions.length > 0) {
      const error = new Error('Conflicto de fecha: La habitación seleccionada ya está reservada para ese horario.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    return await reservationRepository.update(id, {
      room_id: targetRoomId,
      start_date: targetStartDate,
      end_date: targetEndDate,
      deposit_amount_pen: deposit_amount_pen !== undefined ? Number(deposit_amount_pen) : undefined,
      notes: notes !== undefined ? notes.trim() : undefined,
      status
    });
  },

  async convertToCheckIn(reservationId, { user_id, stay_type = 'hours', hours_count = 3 }) {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      const error = new Error('Reserva no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (reservation.status !== 'confirmed') {
      const error = new Error('Esta reserva ya fue procesada o cancelada.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Ejecutar Check-in pasando el abono previo como initial_payment si existía
    const stay = await stayService.checkIn({
      room_id: reservation.room_id,
      customer_data: {
        document_type: reservation.document_type || 'DNI',
        document_number: reservation.customer_document,
        full_name: reservation.customer_name,
        phone: reservation.customer_phone
      },
      stay_type,
      hours_count,
      initial_payment: reservation.deposit_amount_pen > 0 ? {
        amount: Number(reservation.deposit_amount_pen),
        payment_method: reservation.payment_method,
        reference_number: 'ABONO_RESERVA',
        skip_cash_transaction: true // El abono ya fue registrado en caja al crear la reserva
      } : null,
      user_id
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

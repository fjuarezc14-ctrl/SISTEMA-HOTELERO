import { stayRepository } from '../repositories/stayRepository.js';
import { roomRepository } from '../repositories/roomRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { companionRepository } from '../repositories/companionRepository.js';
import { incidentRepository } from '../repositories/incidentRepository.js';
import { calculateExpectedEndTime } from '../utils/timeHelper.js';

export const stayService = {
  async getActiveStayByRoom(roomId) {
    const stay = await stayRepository.findActiveByRoomId(roomId);
    if (!stay) return null;
    const consumptions = await productRepository.findConsumptionsByStayId(stay.id);
    const payments = await cashRepository.findByStayId(stay.id);
    const companions = await companionRepository.findByStayId(stay.id);
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

  async checkIn({
    room_id,
    customer_data, // { document_type, document_number, full_name, phone }
    stay_type = 'hours',
    hours_count = 3,
    companion_name = '',
    companions = [],
    custom_price = null,
    initial_payment = null, // { amount, payment_method, reference_number }
    user_id
  }) {
    // 1. Validar habitación
    const room = await roomRepository.findRoomById(room_id);
    if (!room) {
      const error = new Error('Habitación no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (room.status !== 'available') {
      const error = new Error(`La habitación no está disponible (Estado actual: ${room.status}).`);
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // 2. Registrar o buscar cliente
    let customer = await customerRepository.findByDocument(customer_data.document_number.trim());
    if (customer) {
      if (customer.is_blacklisted) {
        const error = new Error(`El cliente se encuentra VETADO del hotel. Motivo: ${customer.blacklist_reason || 'Sin especificar'}`);
        error.statusCode = 403;
        error.isOperational = true;
        throw error;
      }
      customer = await customerRepository.update(customer.id, {
        full_name: customer_data.full_name.trim(),
        phone: customer_data.phone ? customer_data.phone.trim() : customer.phone
      });
      await customerRepository.incrementVisits(customer.id);
    } else {
      customer = await customerRepository.create({
        document_type: customer_data.document_type || 'DNI',
        document_number: customer_data.document_number.trim(),
        full_name: customer_data.full_name.trim(),
        phone: customer_data.phone ? customer_data.phone.trim() : ''
      });
      await customerRepository.incrementVisits(customer.id);
    }

    // 3. Obtener turno activo
    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) {
      activeShift = await shiftRepository.findAnyActiveShift();
    }
    if (!activeShift) {
      const error = new Error('No hay un turno de caja abierto. Por favor, abre un turno antes de realizar un Check-in.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // 4. Calcular precio de la estadía en Soles
    let stayPrice = 0;
    if (custom_price !== null && custom_price !== undefined && custom_price !== '') {
      stayPrice = Number(custom_price);
    } else {
      if (stay_type === 'hours') {
        stayPrice = Number(room.price_hours_default || 30.00);
      } else if (stay_type === 'overnight') {
        stayPrice = Number(room.price_overnight_default || 60.00);
      } else if (stay_type === 'full_day') {
        stayPrice = Number(room.price_full_day_default || 90.00);
      }
    }

    const startTime = new Date();
    const expectedEndTime = calculateExpectedEndTime(startTime, stay_type, hours_count);

    // 5. Crear la estadía
    const stay = await stayRepository.create({
      room_id: room.id,
      customer_id: customer.id,
      work_shift_id: activeShift.id,
      stay_type,
      start_time: startTime.toISOString(),
      expected_end_time: expectedEndTime,
      companion_name: companion_name ? companion_name.trim() : '',
      total_stay_price_pen: stayPrice
    });

    // 6. Cambiar estado de la habitación a 'occupied'
    await roomRepository.updateRoomStatus(room.id, 'occupied', `Huésped: ${customer.full_name}`);

    // 7. Si hay pago inicial, registrarlo en caja (evitando duplicación si es abono de reserva)
    if (initial_payment && Number(initial_payment.amount) > 0) {
      const { amount, payment_method, reference_number, split_payments, skip_cash_transaction } = initial_payment;

      if (!skip_cash_transaction && activeShift) {
        if (payment_method === 'MIXED' && Array.isArray(split_payments) && split_payments.length > 0) {
          for (const item of split_payments) {
            const itemAmt = Number(item.amount || 0);
            if (itemAmt > 0) {
              const methodLabel = item.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : item.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
              await cashRepository.create({
                work_shift_id: activeShift.id,
                stay_id: stay.id,
                user_id,
                transaction_type: 'income',
                concept: `Hospedaje Hab. ${room.room_number} - ${customer.full_name} (${methodLabel})`,
                category: 'stay',
                amount_pen: itemAmt,
                payment_method: item.payment_method,
                reference_number: item.reference_number || reference_number || ''
              });
            }
          }
        } else {
          await cashRepository.create({
            work_shift_id: activeShift.id,
            stay_id: stay.id,
            user_id,
            transaction_type: 'income',
            concept: `Hospedaje Hab. ${room.room_number} - ${customer.full_name}`,
            category: 'stay',
            amount_pen: Number(amount),
            payment_method: payment_method || 'CASH',
            reference_number: reference_number || ''
          });
        }
      }

      await stayRepository.updateStayPrices(stay.id, {
        total_paid_pen: Number(amount)
      });
    }

    // 8. Guardar acompañantes (Ficha Registral MINCETUR / PNP)
    if (Array.isArray(companions) && companions.length > 0) {
      for (const comp of companions) {
        if (comp.full_name && comp.document_number) {
          await companionRepository.addCompanion({
            stay_id: stay.id,
            document_type: comp.document_type || 'DNI',
            document_number: comp.document_number.trim(),
            full_name: comp.full_name.trim(),
            age: comp.age ? Number(comp.age) : null,
            nationality: comp.nationality || 'Peruana',
            origin_city: comp.origin_city || 'Lima',
            destination_city: comp.destination_city || 'Lima',
            travel_reason: comp.travel_reason || 'Turismo / Vacaciones'
          });
        }
      }
    }

    return stay;
  },

  async checkOut({ stay_id, user_id, final_payment = null, incident_data = null }) {
    const stay = await stayRepository.findById(stay_id);
    if (!stay) {
      const error = new Error('Estadía no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (stay.status !== 'active') {
      const error = new Error('Esta estadía ya fue finalizada.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Cálculo automático de Horas Extra por sobrestadía
    const now = new Date();
    const expectedEnd = new Date(stay.expected_end_time);
    if (now > expectedEnd) {
      const diffMs = now.getTime() - expectedEnd.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      // Tolerancia de 10 minutos de gracia
      if (diffMinutes > 10) {
        const extraHours = Math.ceil(diffMinutes / 60);
        const room = await roomRepository.findRoomById(stay.room_id);
        const pricePerExtraHour = Number(room?.price_extra_hour_default || 10.00);
        const extraCost = extraHours * pricePerExtraHour;

        const newTotalStayPrice = Number(stay.total_stay_price_pen) + extraCost;
        await stayRepository.updateStayPrices(stay.id, {
          total_stay_price_pen: newTotalStayPrice
        });
        stay.total_stay_price_pen = newTotalStayPrice;
      }
    }

    // Registrar pago final si existe saldo pendiente y se abona
    if (final_payment && Number(final_payment.amount) > 0) {
      let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
      if (!activeShift) {
        activeShift = await shiftRepository.findAnyActiveShift();
      }

      if (activeShift) {
        const { amount, payment_method, reference_number, split_payments } = final_payment;
        if (payment_method === 'MIXED' && Array.isArray(split_payments) && split_payments.length > 0) {
          for (const item of split_payments) {
            const itemAmt = Number(item.amount || 0);
            if (itemAmt > 0) {
              const methodLabel = item.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : item.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
              await cashRepository.create({
                work_shift_id: activeShift.id,
                stay_id: stay.id,
                user_id,
                transaction_type: 'income',
                concept: `Pago Check-out Hab. ${stay.room_number} - ${stay.customer_name} (${methodLabel})`,
                category: 'stay',
                amount_pen: itemAmt,
                payment_method: item.payment_method,
                reference_number: item.reference_number || reference_number || ''
              });
            }
          }
        } else {
          await cashRepository.create({
            work_shift_id: activeShift.id,
            stay_id: stay.id,
            user_id,
            transaction_type: 'income',
            concept: `Pago Check-out Hab. ${stay.room_number} - ${stay.customer_name}`,
            category: 'stay',
            amount_pen: Number(amount),
            payment_method: payment_method || 'CASH',
            reference_number: reference_number || ''
          });
        }

        const updatedPaid = Number(stay.total_paid_pen) + Number(amount);
        await stayRepository.updateStayPrices(stay.id, {
          total_paid_pen: updatedPaid
        });
      }
    }

    // Registrar incidente si fue reportado en Check-out
    if (incident_data && incident_data.description && incident_data.description.trim()) {
      await incidentRepository.create({
        stay_id: stay.id,
        room_id: stay.room_id,
        customer_id: stay.customer_id,
        user_id,
        incident_type: incident_data.incident_type || 'damage',
        description: incident_data.description.trim(),
        penalty_amount_pen: Number(incident_data.penalty_amount_pen || 0)
      });
    }

    // Completar estadía
    const completedStay = await stayRepository.completeStay(stay.id);

    // Cambiar estado de habitación a 'cleaning' (Limpieza)
    await roomRepository.updateRoomStatus(stay.room_id, 'cleaning', 'Pendiente de limpieza tras check-out');

    return completedStay;
  },

  async addExtraHours({ stay_id, hours_count = 1, payment_method = 'CASH', reference_number = '', split_payments = null, user_id }) {
    const stay = await stayRepository.findById(stay_id);
    if (!stay || stay.status !== 'active') {
      const error = new Error('Estadía activa no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const room = await roomRepository.findRoomById(stay.room_id);
    const pricePerExtraHour = Number(room?.price_extra_hour_default || 10.00);
    const extraHoursCost = Number(hours_count) * pricePerExtraHour;

    // 1. Extender hora de salida esperada
    const currentExpectedEnd = new Date(stay.expected_end_time);
    currentExpectedEnd.setHours(currentExpectedEnd.getHours() + Number(hours_count));
    const newExpectedEndISO = currentExpectedEnd.toISOString();

    // 2. Buscar turno de caja activo
    let activeShift = await shiftRepository.findActiveShiftByUserId(user_id);
    if (!activeShift) {
      activeShift = await shiftRepository.findAnyActiveShift();
    }
    if (!activeShift) {
      const error = new Error('No hay un turno de caja abierto para registrar el cobro de horas extras.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // 3. Registrar transacción de ingreso en caja chica
    if (payment_method === 'MIXED' && Array.isArray(split_payments) && split_payments.length > 0) {
      for (const item of split_payments) {
        const itemAmt = Number(item.amount || 0);
        if (itemAmt > 0) {
          const methodLabel = item.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : item.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo';
          await cashRepository.create({
            work_shift_id: activeShift.id,
            stay_id: stay.id,
            user_id,
            transaction_type: 'income',
            concept: `Hora Extra (x${hours_count}) Hab. ${stay.room_number} - ${stay.customer_name} (${methodLabel})`,
            category: 'stay',
            amount_pen: itemAmt,
            payment_method: item.payment_method,
            reference_number: item.reference_number || reference_number || ''
          });
        }
      }
    } else {
      await cashRepository.create({
        work_shift_id: activeShift.id,
        stay_id: stay.id,
        user_id,
        transaction_type: 'income',
        concept: `Hora Extra (x${hours_count}) Hab. ${stay.room_number} - ${stay.customer_name}`,
        category: 'stay',
        amount_pen: extraHoursCost,
        payment_method: payment_method || 'CASH',
        reference_number: reference_number.trim()
      });
    }

    // 4. Actualizar total de la estadía y total pagado
    const newTotalStayPrice = Number(stay.total_stay_price_pen) + extraHoursCost;
    const newTotalPaid = Number(stay.total_paid_pen) + extraHoursCost;

    await stayRepository.updateStayPrices(stay.id, {
      total_stay_price_pen: newTotalStayPrice,
      total_paid_pen: newTotalPaid
    });

    // 5. Actualizar la fecha límite en la tabla stays
    await stayRepository.updateExpectedEndTime(stay.id, newExpectedEndISO);

    return await this.getActiveStayByRoom(stay.room_id);
  }
};

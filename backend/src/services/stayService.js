import { stayRepository } from '../repositories/stayRepository.js';
import { roomRepository } from '../repositories/roomRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { cashRepository } from '../repositories/cashRepository.js';
import { shiftRepository } from '../repositories/shiftRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { companionRepository } from '../repositories/companionRepository.js';
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

    // 7. Si hay pago inicial, registrarlo en caja
    if (initial_payment && Number(initial_payment.amount) > 0) {
      await cashRepository.create({
        work_shift_id: activeShift.id,
        stay_id: stay.id,
        user_id,
        transaction_type: 'income',
        concept: `Hospedaje Hab. ${room.room_number} - ${customer.full_name}`,
        category: 'stay',
        amount_pen: Number(initial_payment.amount),
        payment_method: initial_payment.payment_method, // YAPE_PLIN, CASH, CARD
        reference_number: initial_payment.reference_number || ''
      });

      await stayRepository.updateStayPrices(stay.id, {
        total_paid_pen: Number(initial_payment.amount)
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

  async checkOut({ stay_id, user_id, final_payment = null }) {
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
        await cashRepository.create({
          work_shift_id: activeShift.id,
          stay_id: stay.id,
          user_id,
          transaction_type: 'income',
          concept: `Pago Check-out Hab. ${stay.room_number} - ${stay.customer_name}`,
          category: 'stay',
          amount_pen: Number(final_payment.amount),
          payment_method: final_payment.payment_method,
          reference_number: final_payment.reference_number || ''
        });

        const updatedPaid = Number(stay.total_paid_pen) + Number(final_payment.amount);
        await stayRepository.updateStayPrices(stay.id, {
          total_paid_pen: updatedPaid
        });
      }
    }

    // Completar estadía
    const completedStay = await stayRepository.completeStay(stay.id);

    // Cambiar estado de habitación a 'cleaning' (Limpieza)
    await roomRepository.updateRoomStatus(stay.room_id, 'cleaning', 'Pendiente de limpieza tras check-out');

    return completedStay;
  }
};

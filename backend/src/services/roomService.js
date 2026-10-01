import * as v from '../utils/validate.js';
import { query } from '../config/db.js';
import { roomRepository } from '../repositories/roomRepository.js';

/** Tarifas de un tipo de habitación: precios mayores a 0 y horas base enteras */
function validateRates(data = {}, { partial }) {
  const out = {};
  const has = (k) => data[k] !== undefined && data[k] !== null && data[k] !== '';
  if (!partial || has('name')) out.name = v.text(data.name, 'El nombre de la categoría', { min: 2, max: 50 });
  if (has('description')) out.description = v.text(data.description, 'La descripción', { max: 500, required: false });
  if (!partial || has('hours_quantity_default')) {
    out.hours_quantity_default = v.integer(has('hours_quantity_default') ? data.hours_quantity_default : 3, 'Las horas base', { min: 1, max: 24 });
  }
  const prices = {
    price_hours_default: 'La tarifa por horas',
    price_overnight_default: 'La tarifa por noche',
    price_full_day_default: 'La tarifa por día completo',
    price_extra_hour_default: 'La tarifa de hora extra'
  };
  for (const [key, label] of Object.entries(prices)) {
    if (!partial || has(key)) out[key] = v.money(data[key], label, { allowZero: false, max: 10000 });
  }
  return out;
}

export const roomService = {
  async getAllRooms() {
    return await roomRepository.findAllRooms();
  },

  async getRoomById(id) {
    const room = await roomRepository.findRoomById(id);
    if (!room) {
      const error = new Error('Habitación no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    return room;
  },

  async getAllRoomTypes() {
    return await roomRepository.findAllRoomTypes();
  },

  async updateRoomTypeRates(id, ratesData) {
    ratesData = validateRates(ratesData, { partial: true });
    const type = await roomRepository.findRoomTypeById(id);
    if (!type) {
      const error = new Error('Tipo de habitación no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    return await roomRepository.updateRoomType(id, ratesData);
  },

  async createRoomType(typeData) {
    return await roomRepository.createRoomType(validateRates(typeData, { partial: false }));
  },

  async changeRoomStatus(id, status, observations = null) {
    const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance'];
    if (!validStatuses.includes(status)) {
      const error = new Error(`Estado no válido. Opciones permitidas: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const room = await roomRepository.findRoomById(id);
    if (!room) {
      const error = new Error('Habitación no encontrada.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    // 'Ocupada' solo se asigna con un check-in, y una habitación con huésped no se libera a mano
    if (status === 'occupied') {
      throw v.badRequest('El estado "Ocupada" se asigna automáticamente al hacer check-in.');
    }
    const active = await query(`SELECT 1 FROM stays WHERE room_id = $1 AND status = 'active' LIMIT 1`, [id]);
    if (active.rows.length > 0) {
      throw v.badRequest('La habitación tiene un huésped. Haz el check-out antes de cambiar su estado.');
    }

    return await roomRepository.updateRoomStatus(id, status, observations ? v.text(observations, 'La observación', { max: 255, required: false }) : observations);
  },

  async createRoom(roomData) {
    if (!roomData.room_type_id) throw v.badRequest('El tipo de habitación es obligatorio.');
    return await roomRepository.createRoom({
      room_number: v.text(roomData.room_number, 'El número de habitación', { max: 10 }),
      room_type_id: roomData.room_type_id,
      floor: roomData.floor !== undefined ? v.integer(roomData.floor, 'El piso', { min: -5, max: 100 }) : 1,
      observations: v.text(roomData.observations, 'La observación', { max: 255, required: false })
    });
  },

  // El estado no se cambia por aquí (tiene sus propias reglas en changeRoomStatus)
  async updateRoom(id, roomData) {
    return await roomRepository.updateRoom(id, {
      room_number: roomData.room_number !== undefined ? v.text(roomData.room_number, 'El número de habitación', { max: 10 }) : undefined,
      room_type_id: roomData.room_type_id,
      floor: roomData.floor !== undefined ? v.integer(roomData.floor, 'El piso', { min: -5, max: 100 }) : undefined,
      observations: roomData.observations !== undefined ? v.text(roomData.observations, 'La observación', { max: 255, required: false }) : undefined
    });
  },

  async deleteRoom(id) {
    return await roomRepository.deleteRoom(id);
  }
};

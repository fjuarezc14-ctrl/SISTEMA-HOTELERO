import { roomRepository } from '../repositories/roomRepository.js';

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
    if (!typeData.name) {
      const error = new Error('El nombre de la categoría es obligatorio.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    return await roomRepository.createRoomType(typeData);
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

    return await roomRepository.updateRoomStatus(id, status, observations);
  },

  async createRoom(roomData) {
    if (!roomData.room_number || !roomData.room_type_id) {
      const error = new Error('El número de habitación y el tipo son obligatorios.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    return await roomRepository.createRoom(roomData);
  },

  async updateRoom(id, roomData) {
    return await roomRepository.updateRoom(id, roomData);
  },

  async deleteRoom(id) {
    return await roomRepository.deleteRoom(id);
  }
};

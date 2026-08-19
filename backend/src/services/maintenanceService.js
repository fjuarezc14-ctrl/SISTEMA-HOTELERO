import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { roomRepository } from '../repositories/roomRepository.js';

export const maintenanceService = {
  async getTickets({ status, roomId }) {
    return await maintenanceRepository.findAll({ status, roomId });
  },

  async createTicket({ room_id, user_creator_id, user_assigned_id, title, description, priority = 'medium' }) {
    if (!room_id || !title) {
      const error = new Error('La habitación y el título de la avería son requeridos.');
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

    const ticket = await maintenanceRepository.create({
      room_id,
      user_creator_id,
      user_assigned_id,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority
    });

    // Cambiar estado de la habitación a 'maintenance'
    await roomRepository.updateRoomStatus(room_id, 'maintenance', `Avería: ${title.trim()}`);

    return ticket;
  },

  async resolveTicket(id) {
    const ticket = await maintenanceRepository.findById(id);
    if (!ticket) {
      const error = new Error('Ticket de mantenimiento no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const resolved = await maintenanceRepository.resolveTicket(id);

    // Restaurar habitación a 'available' si no hay otros tickets pendientes
    const pendingOther = await maintenanceRepository.findAll({ status: 'pending', roomId: ticket.room_id });
    if (pendingOther.length === 0) {
      await roomRepository.updateRoomStatus(ticket.room_id, 'available', 'Mantenimiento resuelto');
    }

    return resolved;
  }
};

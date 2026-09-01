import { incidentRepository } from '../repositories/incidentRepository.js';

export const incidentService = {
  async createIncident({ stay_id = null, room_id, customer_id = null, user_id, incident_type = 'damage', description, penalty_amount_pen = 0.00 }) {
    if (!room_id || !description || !description.trim()) {
      const error = new Error('La habitación y la descripción del incidente son obligatorias.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    return await incidentRepository.create({
      stay_id,
      room_id,
      customer_id,
      user_id,
      incident_type,
      description: description.trim(),
      penalty_amount_pen: Number(penalty_amount_pen || 0)
    });
  },

  async getAllIncidents({ limit = 100, offset = 0, incident_type, status } = {}) {
    return await incidentRepository.findAll({ limit: Number(limit), offset: Number(offset), incident_type, status });
  },

  async resolveIncident(id, status = 'resolved') {
    return await incidentRepository.updateStatus(id, status);
  }
};

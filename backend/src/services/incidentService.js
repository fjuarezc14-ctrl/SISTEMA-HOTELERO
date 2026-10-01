import * as v from '../utils/validate.js';
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
      incident_type: v.oneOf(incident_type, 'El tipo de incidente', ['damage', 'loss', 'unpaid_debt', 'disturbance', 'other']),
      description: v.text(description, 'La descripción del incidente', { min: 3, max: 1000 }),
      penalty_amount_pen: v.money(penalty_amount_pen || 0, 'La penalidad', { max: 10000 })
    });
  },

  async getAllIncidents({ limit = 100, offset = 0, incident_type, status } = {}) {
    return await incidentRepository.findAll({ limit: Number(limit), offset: Number(offset), incident_type, status });
  },

  async resolveIncident(id, status = 'resolved') {
    return await incidentRepository.updateStatus(id, status);
  }
};

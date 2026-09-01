import { incidentService } from '../services/incidentService.js';

export const incidentController = {
  async getAll(req, res, next) {
    try {
      const { limit, offset, incident_type, status } = req.query;
      const incidents = await incidentService.getAllIncidents({ limit, offset, incident_type, status });
      res.json({ success: true, data: incidents });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const incident = await incidentService.createIncident({
        ...req.body,
        user_id: req.user.id
      });
      res.status(201).json({
        success: true,
        message: 'Incidente registrado exitosamente.',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  },

  async resolve(req, res, next) {
    try {
      const { status } = req.body;
      const incident = await incidentService.resolveIncident(req.params.id, status || 'resolved');
      res.json({
        success: true,
        message: 'Estado del incidente actualizado con éxito.',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }
};

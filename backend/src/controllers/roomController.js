import { roomService } from '../services/roomService.js';

export const roomController = {
  async getAllRooms(req, res, next) {
    try {
      const rooms = await roomService.getAllRooms();
      res.json({ success: true, data: rooms });
    } catch (error) {
      next(error);
    }
  },

  async getRoomById(req, res, next) {
    try {
      const room = await roomService.getRoomById(req.params.id);
      res.json({ success: true, data: room });
    } catch (error) {
      next(error);
    }
  },

  async getAllRoomTypes(req, res, next) {
    try {
      const types = await roomService.getAllRoomTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  },

  async createRoomType(req, res, next) {
    try {
      const type = await roomService.createRoomType(req.body);
      res.status(201).json({
        success: true,
        message: 'Categoría de habitación creada correctamente.',
        data: type
      });
    } catch (error) {
      next(error);
    }
  },

  async updateRoomTypeRates(req, res, next) {
    try {
      const type = await roomService.updateRoomTypeRates(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Tarifas actualizadas correctamente.',
        data: type
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, observations } = req.body;
      const room = await roomService.changeRoomStatus(req.params.id, status, observations);
      res.json({
        success: true,
        message: 'Estado de habitación actualizado.',
        data: room
      });
    } catch (error) {
      next(error);
    }
  },

  async createRoom(req, res, next) {
    try {
      const room = await roomService.createRoom(req.body);
      res.status(201).json({
        success: true,
        message: 'Habitación creada con éxito.',
        data: room
      });
    } catch (error) {
      next(error);
    }
  },

  async updateRoom(req, res, next) {
    try {
      const room = await roomService.updateRoom(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Habitación actualizada correctamente.',
        data: room
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteRoom(req, res, next) {
    try {
      await roomService.deleteRoom(req.params.id);
      res.json({
        success: true,
        message: 'Habitación eliminada correctamente.'
      });
    } catch (error) {
      next(error);
    }
  }
};

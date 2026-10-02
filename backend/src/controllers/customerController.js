import { customerService } from '../services/customerService.js';

// Datos para autorizar acciones sensibles (quitar un veto) con usuario y contraseña de administrador
const adminAuth = (req) => ({
  requester: req.user,
  admin_username: req.body?.admin_username,
  admin_password: req.body?.admin_password,
  ipAddress: req.ip
});

export const customerController = {
  async getAll(req, res, next) {
    try {
      const { search, limit, offset } = req.query;
      const customers = await customerService.getCustomers({ search, limit, offset });
      res.json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  },

  async getIncidents(req, res, next) {
    try {
      const incidents = await customerService.getCustomerIncidents(req.params.id);
      res.json({ success: true, data: incidents });
    } catch (error) {
      next(error);
    }
  },

  async getByDocument(req, res, next) {
    try {
      const { documentNumber } = req.params;
      const customer = await customerService.getCustomerByDocument(documentNumber);
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  },

  async lookup(req, res, next) {
    try {
      const { documentNumber } = req.params;
      const result = await customerService.lookupDocument(documentNumber);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async createOrUpdate(req, res, next) {
    try {
      const customer = await customerService.registerOrUpdateCustomer(req.body);
      res.json({
        success: true,
        message: 'Cliente guardado correctamente.',
        data: customer
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body, adminAuth(req));
      res.json({
        success: true,
        message: 'Cliente actualizado correctamente.',
        data: customer
      });
    } catch (error) {
      next(error);
    }
  },

  async updateBlacklist(req, res, next) {
    try {
      const { id } = req.params;
      const { is_blacklisted, blacklist_reason } = req.body;
      const customer = await customerService.updateBlacklist(id, { is_blacklisted, blacklist_reason }, adminAuth(req));
      res.json({
        success: true,
        message: is_blacklisted ? 'Cliente añadido a lista de veto.' : 'Veto retirado del cliente.',
        data: customer
      });
    } catch (error) {
      next(error);
    }
  },

  async toggleBlacklist(req, res, next) {
    try {
      const { id } = req.params;
      const { is_blacklisted, blacklist_reason } = req.body;
      const customer = await customerService.toggleBlacklist(id, { is_blacklisted, blacklist_reason }, adminAuth(req));
      res.json({
        success: true,
        message: customer.is_blacklisted ? 'Cliente agregado a Lista Negra.' : 'Veto retirado del cliente.',
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }
};

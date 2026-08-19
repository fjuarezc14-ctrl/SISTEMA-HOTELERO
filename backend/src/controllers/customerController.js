import { customerService } from '../services/customerService.js';

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

  async getByDocument(req, res, next) {
    try {
      const { documentNumber } = req.params;
      const customer = await customerService.getCustomerByDocument(documentNumber);
      res.json({ success: true, data: customer });
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

  async updateBlacklist(req, res, next) {
    try {
      const { id } = req.params;
      const { is_blacklisted, blacklist_reason } = req.body;
      const customer = await customerService.updateBlacklist(id, { is_blacklisted, blacklist_reason });
      res.json({
        success: true,
        message: is_blacklisted ? 'Cliente añadido a lista de veto.' : 'Veto retirado del cliente.',
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }
};

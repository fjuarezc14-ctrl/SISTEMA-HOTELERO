import { customerRepository } from '../repositories/customerRepository.js';

export const customerService = {
  async getCustomers({ search, limit, offset }) {
    return await customerRepository.findAll({ search, limit, offset });
  },

  async getCustomerById(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      const error = new Error('Cliente no encontrado.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    return customer;
  },

  async getCustomerByDocument(docNumber) {
    if (!docNumber) return null;
    return await customerRepository.findByDocument(docNumber.trim());
  },

  async registerOrUpdateCustomer({ document_type = 'DNI', document_number, full_name, phone = '', email = '', is_blacklisted = false, blacklist_reason = '' }) {
    if (!document_number || !full_name) {
      const error = new Error('El número de documento y el nombre completo son obligatorios.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const cleanDoc = document_number.trim();
    const cleanName = full_name.trim();

    const existing = await customerRepository.findByDocument(cleanDoc);
    if (existing) {
      return await customerRepository.update(existing.id, {
        document_type,
        document_number: cleanDoc,
        full_name: cleanName,
        phone: phone ? phone.trim() : existing.phone,
        email: email ? email.trim() : existing.email,
        is_blacklisted,
        blacklist_reason
      });
    }

    return await customerRepository.create({
      document_type,
      document_number: cleanDoc,
      full_name: cleanName,
      phone: phone.trim(),
      email: email.trim(),
      is_blacklisted,
      blacklist_reason
    });
  },

  async updateBlacklist(id, { is_blacklisted, blacklist_reason }) {
    const customer = await this.getCustomerById(id);
    return await customerRepository.update(customer.id, {
      is_blacklisted,
      blacklist_reason: is_blacklisted ? blacklist_reason : ''
    });
  }
};

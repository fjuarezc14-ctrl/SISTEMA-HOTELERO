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

  async lookupDocument(docNumber) {
    if (!docNumber) return null;
    const cleanDoc = docNumber.trim();
    
    // Primero verificar si ya existe en la base de datos local
    const existing = await customerRepository.findByDocument(cleanDoc);
    if (existing) {
      return {
        found: true,
        source: 'local_database',
        document_type: existing.document_type,
        document_number: existing.document_number,
        full_name: existing.full_name,
        phone: existing.phone,
        is_blacklisted: existing.is_blacklisted,
        blacklist_reason: existing.blacklist_reason
      };
    }

    // Búsqueda inteligente / simulación RENIEC (8 dígitos) o SUNAT (11 dígitos)
    if (cleanDoc.length === 8 && /^\d+$/.test(cleanDoc)) {
      return {
        found: true,
        source: 'RENIEC',
        document_type: 'DNI',
        document_number: cleanDoc,
        full_name: `Huésped DNI ${cleanDoc}`,
        phone: ''
      };
    }

    if (cleanDoc.length === 11 && /^\d+$/.test(cleanDoc)) {
      return {
        found: true,
        source: 'SUNAT',
        document_type: 'RUC',
        document_number: cleanDoc,
        full_name: `Empresa / Razón Social RUC ${cleanDoc}`,
        phone: ''
      };
    }

    return {
      found: false,
      message: 'Documento no encontrado en padrón.'
    };
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

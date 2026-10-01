import * as v from '../utils/validate.js';
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
    const data = v.customerData({ document_type, document_number, full_name, phone, email });
    document_type = data.document_type;
    const cleanDoc = data.document_number;
    const cleanName = data.full_name;
    phone = data.phone;
    email = data.email;

    const existing = await customerRepository.findByDocument(cleanDoc);
    if (existing) {
      return await customerRepository.update(existing.id, {
        document_type,
        document_number: cleanDoc,
        full_name: cleanName,
        phone: phone || existing.phone,
        email: email || existing.email
        // El veto no se modifica por aquí (tiene su propia acción en Clientes / Incidentes)
      });
    }

    return await customerRepository.create({
      document_type,
      document_number: cleanDoc,
      full_name: cleanName,
      phone,
      email,
      is_blacklisted: Boolean(is_blacklisted),
      blacklist_reason: is_blacklisted ? v.text(blacklist_reason, 'El motivo del veto', { max: 500, required: false }) : ''
    });
  },

  async updateCustomer(id, { document_type, document_number, full_name, phone = '', email = '', is_blacklisted, blacklist_reason = '' }) {
    const customer = await this.getCustomerById(id);

    const data = v.customerData({ document_type: document_type || customer.document_type, document_number, full_name, phone, email });
    const cleanDoc = data.document_number;

    // El documento no puede pertenecer a otro cliente
    const sameDoc = await customerRepository.findByDocument(cleanDoc);
    if (sameDoc && sameDoc.id !== customer.id) {
      const error = new Error(`El documento ${cleanDoc} ya está registrado a nombre de ${sameDoc.full_name}.`);
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const blacklisted = is_blacklisted === undefined ? customer.is_blacklisted : Boolean(is_blacklisted);

    return await customerRepository.update(customer.id, {
      document_type: data.document_type,
      document_number: cleanDoc,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      is_blacklisted: blacklisted,
      blacklist_reason: blacklisted ? v.text(blacklist_reason, 'El motivo del veto', { max: 500, required: false }) : ''
    });
  },

  async updateBlacklist(id, { is_blacklisted, blacklist_reason }) {
    const customer = await this.getCustomerById(id);
    return await customerRepository.update(customer.id, {
      is_blacklisted,
      blacklist_reason: is_blacklisted ? blacklist_reason : ''
    });
  },

  async toggleBlacklist(id, { is_blacklisted, blacklist_reason = '' }) {
    const customer = await this.getCustomerById(id);
    return await customerRepository.toggleBlacklist(customer.id, {
      is_blacklisted,
      blacklist_reason
    });
  }
};

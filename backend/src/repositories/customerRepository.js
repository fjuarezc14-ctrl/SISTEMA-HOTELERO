import { query } from '../config/db.js';

export const customerRepository = {
  async findByDocument(documentNumber) {
    const res = await query('SELECT * FROM customers WHERE document_number = $1', [documentNumber]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query('SELECT * FROM customers WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findAll({ search = '', limit = 100, offset = 0 } = {}) {
    if (search) {
      const searchPattern = `%${search}%`;
      const res = await query(
        `SELECT * FROM customers 
         WHERE document_number ILIKE $1 OR full_name ILIKE $1 OR phone ILIKE $1
         ORDER BY full_name ASC LIMIT $2 OFFSET $3`,
        [searchPattern, limit, offset]
      );
      return res.rows;
    }
    const res = await query(
      `SELECT * FROM customers ORDER BY full_name ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  },

  async create({ document_type = 'DNI', document_number, full_name, phone = '', email = '', is_blacklisted = false, blacklist_reason = '' }) {
    const res = await query(
      `INSERT INTO customers (document_type, document_number, full_name, phone, email, is_blacklisted, blacklist_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [document_type, document_number, full_name, phone, email, is_blacklisted, blacklist_reason]
    );
    return res.rows[0];
  },

  async update(id, { document_type, document_number, full_name, phone, email, is_blacklisted, blacklist_reason, total_debt_pen }) {
    const res = await query(
      `UPDATE customers
       SET document_type = COALESCE($2, document_type),
           document_number = COALESCE($3, document_number),
           full_name = COALESCE($4, full_name),
           phone = COALESCE($5, phone),
           email = COALESCE($6, email),
           is_blacklisted = COALESCE($7, is_blacklisted),
           blacklist_reason = COALESCE($8, blacklist_reason),
           total_debt_pen = COALESCE($9, total_debt_pen),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, document_type, document_number, full_name, phone, email, is_blacklisted, blacklist_reason, total_debt_pen]
    );
    return res.rows[0] || null;
  },

  async incrementVisits(id) {
    const res = await query(
      `UPDATE customers 
       SET total_visits = total_visits + 1, updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  }
};

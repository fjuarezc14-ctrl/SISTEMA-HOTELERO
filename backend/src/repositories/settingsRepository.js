import { query } from '../config/db.js';

export const settingsRepository = {
  async getHotelInfo() {
    const res = await query('SELECT * FROM hotel_info LIMIT 1');
    return res.rows[0] || null;
  },

  async updateHotelInfo({ business_name, trade_name, ruc, address, phone, email }) {
    const res = await query(
      `UPDATE hotel_info
       SET business_name = COALESCE($1, business_name),
           trade_name = COALESCE($2, trade_name),
           ruc = COALESCE($3, ruc),
           address = COALESCE($4, address),
           phone = COALESCE($5, phone),
           email = COALESCE($6, email),
           updated_at = NOW()
       RETURNING *`,
      [business_name, trade_name, ruc, address, phone, email]
    );
    return res.rows[0] || null;
  },

  async addAuditLog({ user_id = null, user_name = 'Sistema', role = 'Sistema', action, details = '', ip_address = '' }) {
    try {
      const res = await query(
        `INSERT INTO audit_logs (user_id, user_name, role, action, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, user_name, role, action, details, ip_address]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error registrando auditoría:', err.message);
      return null;
    }
  },

  async getAuditLogs({ limit = 100, offset = 0 } = {}) {
    const res = await query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return res.rows;
  }
};

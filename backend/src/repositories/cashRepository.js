import { query } from '../config/db.js';

export const cashRepository = {
  async create({ work_shift_id, stay_id = null, user_id, transaction_type = 'income', concept, category = 'stay', amount_pen, payment_method, reference_number = '' }) {
    const res = await query(
      `INSERT INTO cash_transactions (work_shift_id, stay_id, user_id, transaction_type, concept, category, amount_pen, payment_method, reference_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [work_shift_id, stay_id, user_id, transaction_type, concept, category, amount_pen, payment_method, reference_number]
    );
    return res.rows[0];
  },

  async findByShiftId(shiftId) {
    const sql = `
      SELECT 
        t.*,
        u.full_name AS user_full_name
      FROM cash_transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.work_shift_id = $1
      ORDER BY t.created_at DESC
    `;
    const res = await query(sql, [shiftId]);
    return res.rows;
  },

  async findByStayId(stayId) {
    const sql = `
      SELECT 
        t.*,
        u.full_name AS user_full_name
      FROM cash_transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.stay_id = $1
      ORDER BY t.created_at ASC
    `;
    const res = await query(sql, [stayId]);
    return res.rows;
  },

  async findAll({ limit = 100, offset = 0, dateFrom = null, dateTo = null } = {}) {
    let sql = `
      SELECT 
        t.*,
        u.full_name AS user_full_name
      FROM cash_transactions t
      JOIN users u ON t.user_id = u.id
    `;
    const params = [];

    if (dateFrom && dateTo) {
      sql += ` WHERE t.created_at >= $1 AND t.created_at <= $2`;
      params.push(dateFrom, dateTo);
    }

    sql += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }
};

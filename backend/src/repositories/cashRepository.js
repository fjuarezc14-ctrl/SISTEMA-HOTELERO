import { query } from '../config/db.js';

export const cashRepository = {
  async create({
    work_shift_id,
    stay_id = null,
    user_id,
    transaction_type = 'income',
    concept,
    category = 'stay',
    amount_pen,
    payment_method,
    reference_number = '',
    voucher_type = 'NONE',
    voucher_number = '',
    customer_ruc = '',
    customer_business_name = ''
  }) {
    const res = await query(
      `INSERT INTO cash_transactions (work_shift_id, stay_id, user_id, transaction_type, concept, category, amount_pen, payment_method, reference_number, voucher_type, voucher_number, customer_ruc, customer_business_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        work_shift_id,
        stay_id,
        user_id,
        transaction_type,
        concept,
        category,
        amount_pen,
        payment_method,
        reference_number,
        voucher_type,
        voucher_number,
        customer_ruc,
        customer_business_name
      ]
    );
    return res.rows[0];
  },

  async findById(id) {
    const sql = `
      SELECT t.*, u.full_name AS user_full_name
      FROM cash_transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
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
      WHERE t.stay_id = $1 AND t.is_cancelled = false
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
  },

  async cancelTransaction(id, { reason = 'Anulación de movimiento' }) {
    const sql = `
      UPDATE cash_transactions
      SET is_cancelled = true,
          cancellation_reason = $2,
          cancelled_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const res = await query(sql, [id, reason]);
    return res.rows[0] || null;
  },

  async updateVoucher(id, { voucher_type, voucher_number, customer_ruc, customer_business_name }) {
    const sql = `
      UPDATE cash_transactions
      SET voucher_type = $2,
          voucher_number = $3,
          customer_ruc = $4,
          customer_business_name = $5
      WHERE id = $1
      RETURNING *
    `;
    const res = await query(sql, [id, voucher_type, voucher_number, customer_ruc, customer_business_name]);
    return res.rows[0] || null;
  }
};

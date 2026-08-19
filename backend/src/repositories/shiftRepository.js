import { query } from '../config/db.js';

export const shiftRepository = {
  async findActiveShiftByUserId(userId) {
    const sql = `
      SELECT 
        s.*,
        u.full_name AS user_full_name,
        u.username AS user_username
      FROM work_shifts s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1 AND s.status = 'open'
      ORDER BY s.opened_at DESC
      LIMIT 1
    `;
    const res = await query(sql, [userId]);
    return res.rows[0] || null;
  },

  async findAnyActiveShift() {
    const sql = `
      SELECT 
        s.*,
        u.full_name AS user_full_name,
        u.username AS user_username
      FROM work_shifts s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'open'
      ORDER BY s.opened_at DESC
      LIMIT 1
    `;
    const res = await query(sql);
    return res.rows[0] || null;
  },

  async findById(id) {
    const sql = `
      SELECT 
        s.*,
        u.full_name AS user_full_name,
        u.username AS user_username
      FROM work_shifts s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  async findAll({ limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT 
        s.*,
        u.full_name AS user_full_name,
        u.username AS user_username
      FROM work_shifts s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.opened_at DESC
      LIMIT $1 OFFSET $2
    `;
    const res = await query(sql, [limit, offset]);
    return res.rows;
  },

  async openShift({ user_id, initial_cash_pen = 0, shift_notes = '' }) {
    const res = await query(
      `INSERT INTO work_shifts (user_id, initial_cash_pen, expected_cash_pen, status, shift_notes)
       VALUES ($1, $2, $2, 'open', $3)
       RETURNING *`,
      [user_id, initial_cash_pen, shift_notes]
    );
    return res.rows[0];
  },

  async calculateShiftTotals(shiftId) {
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'income' AND payment_method = 'CASH' THEN amount_pen ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' AND payment_method = 'CASH' THEN amount_pen ELSE 0 END), 0) AS cash_net,
        
        COALESCE(SUM(CASE WHEN transaction_type = 'income' AND payment_method = 'YAPE_PLIN' THEN amount_pen ELSE 0 END), 0) AS total_yape_plin,
        
        COALESCE(SUM(CASE WHEN transaction_type = 'income' AND payment_method = 'CARD' THEN amount_pen ELSE 0 END), 0) AS total_card,
        
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount_pen ELSE 0 END), 0) AS total_income,
        
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_pen ELSE 0 END), 0) AS total_expense
      FROM cash_transactions
      WHERE work_shift_id = $1
    `;
    const res = await query(sql, [shiftId]);
    return res.rows[0];
  },

  async updateShiftTotals(shiftId, { expected_cash_pen, total_yape_plin_pen, total_card_pen, total_revenue_pen }) {
    const res = await query(
      `UPDATE work_shifts
       SET expected_cash_pen = $2,
           total_yape_plin_pen = $3,
           total_card_pen = $4,
           total_revenue_pen = $5
       WHERE id = $1
       RETURNING *`,
      [shiftId, expected_cash_pen, total_yape_plin_pen, total_card_pen, total_revenue_pen]
    );
    return res.rows[0] || null;
  },

  async closeShift(shiftId, { actual_cash_pen, difference_cash_pen, expected_cash_pen, total_yape_plin_pen, total_card_pen, total_revenue_pen, shift_notes }) {
    const res = await query(
      `UPDATE work_shifts
       SET closed_at = NOW(),
           status = 'closed',
           actual_cash_pen = $2,
           difference_cash_pen = $3,
           expected_cash_pen = $4,
           total_yape_plin_pen = $5,
           total_card_pen = $6,
           total_revenue_pen = $7,
           shift_notes = COALESCE($8, shift_notes)
       WHERE id = $1
       RETURNING *`,
      [shiftId, actual_cash_pen, difference_cash_pen, expected_cash_pen, total_yape_plin_pen, total_card_pen, total_revenue_pen, shift_notes]
    );
    return res.rows[0] || null;
  }
};

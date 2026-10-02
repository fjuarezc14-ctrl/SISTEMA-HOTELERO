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
    customer_business_name = '',
    store_sale_id = null,
    reservation_id = null
  }, runQuery = query) {
    const res = await runQuery(
      `INSERT INTO cash_transactions (work_shift_id, stay_id, user_id, transaction_type, concept, category, amount_pen, payment_method, reference_number, voucher_type, voucher_number, customer_ruc, customer_business_name, store_sale_id, reservation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        customer_business_name,
        store_sale_id,
        reservation_id
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

  async findAll({ limit = 100, offset = 0, dateFrom = null, dateTo = null, shiftId = null } = {}) {
    let sql = `
      SELECT 
        t.*,
        u.full_name AS user_full_name,
        r.room_number,
        c.full_name AS customer_name,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
                     'product_name', i.product_name,
                     'quantity', i.quantity,
                     'unit_price_pen', i.unit_price_pen,
                     'total_price_pen', i.total_price_pen
                   ))
              FROM store_sale_items i
             WHERE i.sale_id = t.store_sale_id
          ),
          (
            SELECT json_agg(json_build_object(
                     'product_name', rc.product_name,
                     'quantity', rc.quantity,
                     'unit_price_pen', rc.unit_price_pen,
                     'total_price_pen', rc.total_price_pen
                   ))
              FROM room_consumptions rc
             WHERE rc.stay_id = t.stay_id AND t.category = 'store'
          )
        ) AS sale_items
      FROM cash_transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN stays s ON t.stay_id = s.id
      LEFT JOIN rooms r ON s.room_id = r.id
      LEFT JOIN customers c ON s.customer_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (shiftId) {
      params.push(shiftId);
      conditions.push(`t.work_shift_id = $${params.length}`);
    }

    if (dateFrom && dateTo) {
      params.push(dateFrom, dateTo);
      conditions.push(`t.created_at >= $${params.length - 1} AND t.created_at <= $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Math.min(Number(limit) || 100, 2000), Number(offset) || 0);

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

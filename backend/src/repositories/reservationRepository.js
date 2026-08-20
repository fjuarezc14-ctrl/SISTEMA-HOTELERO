import { query } from '../config/db.js';

export const reservationRepository = {
  async findAll({ status = null } = {}) {
    let sql = `
      SELECT 
        res.*,
        r.room_number,
        rt.name AS room_type_name,
        c.full_name AS customer_name,
        c.document_number AS customer_document,
        c.phone AS customer_phone
      FROM reservations res
      JOIN rooms r ON res.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN customers c ON res.customer_id = c.id
    `;
    const params = [];
    if (status) {
      sql += ` WHERE res.status = $1`;
      params.push(status);
    }
    sql += ` ORDER BY res.start_date ASC`;

    const res = await query(sql, params);
    return res.rows;
  },

  async findById(id) {
    const sql = `
      SELECT 
        res.*,
        r.room_number,
        rt.name AS room_type_name,
        c.full_name AS customer_name,
        c.document_number AS customer_document,
        c.phone AS customer_phone
      FROM reservations res
      JOIN rooms r ON res.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN customers c ON res.customer_id = c.id
      WHERE res.id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  async create({ room_id, customer_id, work_shift_id, start_date, end_date, deposit_amount_pen = 0, payment_method = 'YAPE_PLIN', notes = '' }) {
    const res = await query(
      `INSERT INTO reservations (room_id, customer_id, work_shift_id, start_date, end_date, deposit_amount_pen, payment_method, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8)
       RETURNING *`,
      [room_id, customer_id, work_shift_id, start_date, end_date, deposit_amount_pen, payment_method, notes]
    );
    return res.rows[0];
  },

  async updateStatus(id, status) {
    const res = await query(
      `UPDATE reservations
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );
    return res.rows[0] || null;
  }
};

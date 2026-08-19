import { query } from '../config/db.js';

export const stayRepository = {
  async findActiveByRoomId(roomId) {
    const sql = `
      SELECT 
        s.*,
        c.full_name AS customer_name,
        c.document_type,
        c.document_number,
        c.phone AS customer_phone,
        r.room_number,
        rt.name AS room_type_name
      FROM stays s
      JOIN customers c ON s.customer_id = c.id
      JOIN rooms r ON s.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE s.room_id = $1 AND s.status = 'active'
      LIMIT 1
    `;
    const res = await query(sql, [roomId]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const sql = `
      SELECT 
        s.*,
        c.full_name AS customer_name,
        c.document_type,
        c.document_number,
        c.phone AS customer_phone,
        r.room_number,
        r.floor,
        rt.name AS room_type_name
      FROM stays s
      JOIN customers c ON s.customer_id = c.id
      JOIN rooms r ON s.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE s.id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  async findAllActive() {
    const sql = `
      SELECT 
        s.*,
        c.full_name AS customer_name,
        c.document_number,
        r.room_number,
        rt.name AS room_type_name
      FROM stays s
      JOIN customers c ON s.customer_id = c.id
      JOIN rooms r ON s.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE s.status = 'active'
      ORDER BY s.start_time DESC
    `;
    const res = await query(sql);
    return res.rows;
  },

  async create({ room_id, customer_id, work_shift_id, stay_type, start_time, expected_end_time, companion_name, total_stay_price_pen }) {
    const res = await query(
      `INSERT INTO stays (room_id, customer_id, work_shift_id, stay_type, start_time, expected_end_time, companion_name, total_stay_price_pen, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING *`,
      [room_id, customer_id, work_shift_id, stay_type, start_time, expected_end_time, companion_name, total_stay_price_pen]
    );
    return res.rows[0];
  },

  async updateStayPrices(id, { total_stay_price_pen, total_consumptions_price_pen, total_paid_pen }) {
    const res = await query(
      `UPDATE stays
       SET total_stay_price_pen = COALESCE($2, total_stay_price_pen),
           total_consumptions_price_pen = COALESCE($3, total_consumptions_price_pen),
           total_paid_pen = COALESCE($4, total_paid_pen),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, total_stay_price_pen, total_consumptions_price_pen, total_paid_pen]
    );
    return res.rows[0] || null;
  },

  async completeStay(id, actual_end_time = new Date()) {
    const res = await query(
      `UPDATE stays
       SET status = 'completed',
           actual_end_time = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, actual_end_time]
    );
    return res.rows[0] || null;
  },

  async cancelStay(id) {
    const res = await query(
      `UPDATE stays
       SET status = 'cancelled',
           actual_end_time = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  }
};

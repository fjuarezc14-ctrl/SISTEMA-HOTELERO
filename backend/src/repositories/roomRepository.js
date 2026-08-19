import { query } from '../config/db.js';

export const roomRepository = {
  // --- Tipos de Habitación y Tarifas ---
  async findAllRoomTypes() {
    const res = await query('SELECT * FROM room_types ORDER BY name ASC');
    return res.rows;
  },

  async findRoomTypeById(id) {
    const res = await query('SELECT * FROM room_types WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async createRoomType({ name, description, hours_quantity_default = 3, price_hours_default, price_overnight_default, price_full_day_default, price_extra_hour_default }) {
    const res = await query(
      `INSERT INTO room_types (name, description, hours_quantity_default, price_hours_default, price_overnight_default, price_full_day_default, price_extra_hour_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, hours_quantity_default, price_hours_default, price_overnight_default, price_full_day_default, price_extra_hour_default]
    );
    return res.rows[0];
  },

  async updateRoomType(id, { name, description, hours_quantity_default, price_hours_default, price_overnight_default, price_full_day_default, price_extra_hour_default }) {
    const res = await query(
      `UPDATE room_types
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           hours_quantity_default = COALESCE($4, hours_quantity_default),
           price_hours_default = COALESCE($5, price_hours_default),
           price_overnight_default = COALESCE($6, price_overnight_default),
           price_full_day_default = COALESCE($7, price_full_day_default),
           price_extra_hour_default = COALESCE($8, price_extra_hour_default),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, description, hours_quantity_default, price_hours_default, price_overnight_default, price_full_day_default, price_extra_hour_default]
    );
    return res.rows[0] || null;
  },

  // --- Habitaciones ---
  async findAllRooms() {
    const sql = `
      SELECT 
        r.id,
        r.room_number,
        r.floor,
        r.status,
        r.observations,
        r.created_at,
        r.updated_at,
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        rt.hours_quantity_default,
        rt.price_hours_default,
        rt.price_overnight_default,
        rt.price_full_day_default,
        rt.price_extra_hour_default,
        s.id AS active_stay_id,
        s.customer_id,
        c.full_name AS customer_name,
        c.document_number AS customer_document,
        s.stay_type,
        s.start_time,
        s.expected_end_time,
        s.companion_name,
        s.total_stay_price_pen,
        s.total_consumptions_price_pen,
        s.total_paid_pen
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN stays s ON r.id = s.room_id AND s.status = 'active'
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY r.floor ASC, r.room_number ASC
    `;
    const res = await query(sql);
    return res.rows;
  },

  async findRoomById(id) {
    const sql = `
      SELECT 
        r.*,
        rt.name AS room_type_name,
        rt.hours_quantity_default,
        rt.price_hours_default,
        rt.price_overnight_default,
        rt.price_full_day_default,
        rt.price_extra_hour_default
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  async findRoomByNumber(roomNumber) {
    const res = await query('SELECT * FROM rooms WHERE room_number = $1', [roomNumber]);
    return res.rows[0] || null;
  },

  async createRoom({ room_number, room_type_id, floor = 1, status = 'available', observations = '' }) {
    const res = await query(
      `INSERT INTO rooms (room_number, room_type_id, floor, status, observations)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [room_number, room_type_id, floor, status, observations]
    );
    return res.rows[0];
  },

  async updateRoomStatus(id, status, observations = null) {
    const res = await query(
      `UPDATE rooms 
       SET status = $2,
           observations = COALESCE($3, observations),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, observations]
    );
    return res.rows[0] || null;
  },

  async updateRoom(id, { room_number, room_type_id, floor, status, observations }) {
    const res = await query(
      `UPDATE rooms
       SET room_number = COALESCE($2, room_number),
           room_type_id = COALESCE($3, room_type_id),
           floor = COALESCE($4, floor),
           status = COALESCE($5, status),
           observations = COALESCE($6, observations),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, room_number, room_type_id, floor, status, observations]
    );
    return res.rows[0] || null;
  },

  async deleteRoom(id) {
    const res = await query('DELETE FROM rooms WHERE id = $1 RETURNING id', [id]);
    return res.rows[0] || null;
  }
};

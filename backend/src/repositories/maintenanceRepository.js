import { query } from '../config/db.js';

export const maintenanceRepository = {
  async findAll({ status = null, roomId = null } = {}) {
    let sql = `
      SELECT 
        m.*,
        r.room_number,
        r.floor,
        u1.full_name AS creator_name,
        u2.full_name AS assigned_name
      FROM maintenance_tickets m
      JOIN rooms r ON m.room_id = r.id
      JOIN users u1 ON m.user_creator_id = u1.id
      LEFT JOIN users u2 ON m.user_assigned_id = u2.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push(`m.status = $${params.length + 1}`);
      params.push(status);
    }
    if (roomId) {
      conditions.push(`m.room_id = $${params.length + 1}`);
      params.push(roomId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY m.created_at DESC`;

    const res = await query(sql, params);
    return res.rows;
  },

  async findById(id) {
    const sql = `
      SELECT 
        m.*,
        r.room_number,
        u1.full_name AS creator_name,
        u2.full_name AS assigned_name
      FROM maintenance_tickets m
      JOIN rooms r ON m.room_id = r.id
      JOIN users u1 ON m.user_creator_id = u1.id
      LEFT JOIN users u2 ON m.user_assigned_id = u2.id
      WHERE m.id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  async create({ room_id, user_creator_id, user_assigned_id = null, title, description = '', priority = 'medium' }) {
    const res = await query(
      `INSERT INTO maintenance_tickets (room_id, user_creator_id, user_assigned_id, title, description, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [room_id, user_creator_id, user_assigned_id, title, description, priority]
    );
    return res.rows[0];
  },

  async resolveTicket(id) {
    const res = await query(
      `UPDATE maintenance_tickets
       SET status = 'resolved',
           resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  }
};

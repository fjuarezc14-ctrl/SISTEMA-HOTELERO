import { query } from '../config/db.js';

export const incidentRepository = {
  async create({ stay_id = null, room_id, customer_id = null, user_id, incident_type = 'damage', description, penalty_amount_pen = 0.00, status = 'reported' }) {
    const res = await query(
      `INSERT INTO stay_incidents (stay_id, room_id, customer_id, user_id, incident_type, description, penalty_amount_pen, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [stay_id, room_id, customer_id, user_id, incident_type, description, penalty_amount_pen, status]
    );
    return res.rows[0];
  },

  async findAll({ limit = 100, offset = 0, incident_type, status } = {}) {
    let whereClause = `WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (incident_type) {
      whereClause += ` AND i.incident_type = $${paramCount++}`;
      params.push(incident_type);
    }

    if (status) {
      whereClause += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    params.push(limit, offset);

    const sql = `
      SELECT
        i.*,
        r.room_number,
        c.full_name AS customer_name,
        c.document_number AS customer_document,
        u.full_name AS registered_by_user
      FROM stay_incidents i
      JOIN rooms r ON i.room_id = r.id
      LEFT JOIN customers c ON i.customer_id = c.id
      JOIN users u ON i.user_id = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    const res = await query(sql, params);
    return res.rows;
  },

  async updateStatus(id, status) {
    const res = await query(
      `UPDATE stay_incidents SET status = $2 WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return res.rows[0] || null;
  }
};

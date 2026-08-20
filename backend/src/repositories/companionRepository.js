import { query } from '../config/db.js';

export const companionRepository = {
  async findByStayId(stayId) {
    const res = await query('SELECT * FROM stay_companions WHERE stay_id = $1 ORDER BY created_at ASC', [stayId]);
    return res.rows;
  },

  async addCompanion({ stay_id, document_type = 'DNI', document_number, full_name, age = null, nationality = 'Peruana', origin_city = 'Lima', destination_city = 'Lima', travel_reason = 'Turismo / Vacaciones' }) {
    const res = await query(
      `INSERT INTO stay_companions (stay_id, document_type, document_number, full_name, age, nationality, origin_city, destination_city, travel_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [stay_id, document_type, document_number, full_name, age, nationality, origin_city, destination_city, travel_reason]
    );
    return res.rows[0];
  }
};

import { query } from '../config/db.js';

export const userRepository = {
  async findByUsername(username) {
    const res = await query('SELECT * FROM users WHERE username = $1', [username]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query('SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findAll() {
    const res = await query('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at ASC');
    return res.rows;
  },

  async create({ username, password_hash, full_name, role = 'receptionist', is_active = true }) {
    const res = await query(
      `INSERT INTO users (username, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, full_name, role, is_active, created_at`,
      [username, password_hash, full_name, role, is_active]
    );
    return res.rows[0];
  },

  async update(id, { full_name, role, is_active }) {
    const res = await query(
      `UPDATE users 
       SET full_name = COALESCE($2, full_name),
           role = COALESCE($3, role),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, full_name, role, is_active, updated_at`,
      [id, full_name, role, is_active]
    );
    return res.rows[0] || null;
  },

  async updatePassword(id, password_hash) {
    const res = await query(
      `UPDATE users 
       SET password_hash = $2, updated_at = NOW() 
       WHERE id = $1 RETURNING id`,
      [id, password_hash]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return res.rows[0] || null;
  }
};

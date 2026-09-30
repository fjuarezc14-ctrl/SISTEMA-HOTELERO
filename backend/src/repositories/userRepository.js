import { query } from '../config/db.js';

export const userRepository = {
  async findByUsername(username) {
    const res = await query('SELECT * FROM users WHERE username = $1', [username]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query('SELECT id, username, plain_password, full_name, role, is_active, allowed_modules, created_at FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findAll() {
    const res = await query('SELECT id, username, plain_password, full_name, role, is_active, allowed_modules, created_at FROM users ORDER BY created_at ASC');
    return res.rows;
  },

  async create({ username, password_hash, plain_password, full_name, role = 'receptionist', is_active = true, allowed_modules = null }) {
    const res = await query(
      `INSERT INTO users (username, password_hash, plain_password, full_name, role, is_active, allowed_modules)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, plain_password, full_name, role, is_active, allowed_modules, created_at`,
      [username, password_hash, plain_password, full_name, role, is_active, allowed_modules]
    );
    return res.rows[0];
  },

  async update(id, { username, full_name, role, is_active, allowed_modules }) {
    const res = await query(
      `UPDATE users 
       SET username = COALESCE($2, username),
           full_name = COALESCE($3, full_name),
           role = COALESCE($4, role),
           is_active = COALESCE($5, is_active),
           allowed_modules = CASE WHEN $6::boolean THEN $7::text[] ELSE allowed_modules END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, plain_password, full_name, role, is_active, allowed_modules, updated_at`,
      [id, username, full_name, role, is_active, allowed_modules !== undefined, allowed_modules ?? null]
    );
    return res.rows[0] || null;
  },

  async updatePassword(id, password_hash, plain_password) {
    const res = await query(
      `UPDATE users 
       SET password_hash = $2, plain_password = $3, updated_at = NOW() 
       WHERE id = $1 RETURNING id, plain_password`,
      [id, password_hash, plain_password]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return res.rows[0] || null;
  }
};

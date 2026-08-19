import { query } from '../config/db.js';

export const productRepository = {
  async findAll({ onlyActive = true } = {}) {
    let sql = 'SELECT * FROM products';
    if (onlyActive) {
      sql += ' WHERE is_active = true';
    }
    sql += ' ORDER BY name ASC';
    const res = await query(sql);
    return res.rows;
  },

  async findById(id) {
    const res = await query('SELECT * FROM products WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async create({ name, sale_price_pen, stock = 0, is_active = true }) {
    const res = await query(
      `INSERT INTO products (name, sale_price_pen, stock, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, sale_price_pen, stock, is_active]
    );
    return res.rows[0];
  },

  async update(id, { name, sale_price_pen, stock, is_active }) {
    const res = await query(
      `UPDATE products
       SET name = COALESCE($2, name),
           sale_price_pen = COALESCE($3, sale_price_pen),
           stock = COALESCE($4, stock),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, sale_price_pen, stock, is_active]
    );
    return res.rows[0] || null;
  },

  async decrementStock(id, quantity = 1) {
    const res = await query(
      `UPDATE products
       SET stock = GREATEST(0, stock - $2),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, quantity]
    );
    return res.rows[0] || null;
  },

  // Consumos en habitación
  async addRoomConsumption({ stay_id, product_id, quantity, unit_price_pen, total_price_pen }) {
    const res = await query(
      `INSERT INTO room_consumptions (stay_id, product_id, quantity, unit_price_pen, total_price_pen)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [stay_id, product_id, quantity, unit_price_pen, total_price_pen]
    );
    return res.rows[0];
  },

  async findConsumptionsByStayId(stayId) {
    const sql = `
      SELECT 
        c.*,
        p.name AS product_name
      FROM room_consumptions c
      JOIN products p ON c.product_id = p.id
      WHERE c.stay_id = $1
      ORDER BY c.created_at ASC
    `;
    const res = await query(sql, [stayId]);
    return res.rows;
  }
};

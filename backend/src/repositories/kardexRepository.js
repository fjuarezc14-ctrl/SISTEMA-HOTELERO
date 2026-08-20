import { query } from '../config/db.js';

export const kardexRepository = {
  async addPurchase({ product_id, user_id, quantity, unit_cost_pen, total_cost_pen, supplier_name = 'Proveedor General' }) {
    const res = await query(
      `INSERT INTO product_purchases (product_id, user_id, quantity, unit_cost_pen, total_cost_pen, supplier_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [product_id, user_id, quantity, unit_cost_pen, total_cost_pen, supplier_name]
    );
    return res.rows[0];
  },

  async findAllPurchases() {
    const sql = `
      SELECT 
        pur.*,
        p.name AS product_name,
        u.full_name AS user_full_name
      FROM product_purchases pur
      JOIN products p ON pur.product_id = p.id
      JOIN users u ON pur.user_id = u.id
      ORDER BY pur.created_at DESC
    `;
    const res = await query(sql);
    return res.rows;
  },

  async getKardexSummary() {
    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.stock,
        p.sale_price_pen,
        COALESCE(SUM(pur.quantity), 0) AS total_purchased_qty,
        COALESCE(SUM(pur.total_cost_pen), 0) AS total_purchased_cost_pen,
        COALESCE(SUM(c.quantity), 0) AS total_sold_qty,
        COALESCE(SUM(c.total_price_pen), 0) AS total_sold_revenue_pen
      FROM products p
      LEFT JOIN product_purchases pur ON p.id = pur.product_id
      LEFT JOIN room_consumptions c ON p.id = c.product_id
      GROUP BY p.id, p.name, p.stock, p.sale_price_pen
      ORDER BY p.name ASC
    `;
    const res = await query(sql);
    return res.rows;
  }
};

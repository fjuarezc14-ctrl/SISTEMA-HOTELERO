import { query, withTransaction } from '../config/db.js';
import * as v from '../utils/validate.js';

/**
 * Gestión de textiles (ropa de cama y baño) y lavandería. Módulo independiente:
 * no afecta caja, estadías ni tienda.
 *
 * Estados de una pieza: limpia en almacén → en habitaciones → por lavar → en lavandería → limpia.
 * Las piezas dañadas se dan de baja.
 */

const CATEGORIES = ['bedding', 'bath'];

// Movimientos entre estados: [desde, hacia]
const MOVES = {
  assign: { from: 'clean_qty', to: 'in_use_qty', label: 'Asignar a habitaciones' },
  swap: { from: 'clean_qty', to: 'dirty_qty', label: 'Recambio (limpia por usada)' },
  collect: { from: 'in_use_qty', to: 'dirty_qty', label: 'Retirar usadas de habitaciones' },
  discard_clean: { from: 'clean_qty', to: 'discarded_qty', label: 'Dar de baja (limpia dañada)' },
  discard_dirty: { from: 'dirty_qty', to: 'discarded_qty', label: 'Dar de baja (usada dañada)' }
};

const QTY_LABELS = {
  clean_qty: 'limpias en almacén',
  in_use_qty: 'en habitaciones',
  dirty_qty: 'por lavar',
  laundry_qty: 'en lavandería'
};

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.isOperational = true;
  return error;
}

async function lockItem(txQuery, id) {
  const res = await txQuery('SELECT * FROM textile_items WHERE id = $1 FOR UPDATE', [id]);
  if (!res.rows[0]) throw notFound('Prenda no encontrada.');
  return res.rows[0];
}

async function logMovement(txQuery, { item_id, movement_type, quantity, batch_id = null, notes = '', user_id }) {
  await txQuery(
    `INSERT INTO textile_movements (item_id, movement_type, quantity, batch_id, notes, user_id) VALUES ($1, $2, $3, $4, $5, $6)`,
    [item_id, movement_type, quantity, batch_id, notes, user_id]
  );
}

export const textileService = {
  async listItems() {
    const res = await query(
      `SELECT *, (clean_qty + in_use_qty + dirty_qty + laundry_qty) AS total_qty,
              (clean_qty < min_stock) AS low_stock
         FROM textile_items
        WHERE is_active = true
        ORDER BY category, name`
    );
    return res.rows;
  },

  async createItem({ name, category = 'bedding', min_stock = 0, initial_qty = 0 }, user_id) {
    const data = {
      name: v.text(name, 'El nombre de la prenda', { min: 3, max: 120 }),
      category: v.oneOf(category, 'La categoría', CATEGORIES),
      min_stock: v.integer(min_stock, 'El stock mínimo', { min: 0, max: 100000 }),
      initial: v.integer(initial_qty, 'La cantidad inicial', { min: 0, max: 100000 })
    };
    return await withTransaction(async (txQuery) => {
      const res = await txQuery(
        `INSERT INTO textile_items (name, category, min_stock, clean_qty) VALUES ($1, $2, $3, $4) RETURNING *`,
        [data.name, data.category, data.min_stock, data.initial]
      );
      const item = res.rows[0];
      if (data.initial > 0) {
        await logMovement(txQuery, { item_id: item.id, movement_type: 'purchase', quantity: data.initial, notes: 'Stock inicial', user_id });
      }
      return item;
    });
  },

  async updateItem(id, { name, category, min_stock }) {
    const res = await query(
      `UPDATE textile_items
          SET name = COALESCE($2, name), category = COALESCE($3, category), min_stock = COALESCE($4, min_stock), updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING *`,
      [
        id,
        name !== undefined ? v.text(name, 'El nombre de la prenda', { min: 3, max: 120 }) : null,
        category !== undefined ? v.oneOf(category, 'La categoría', CATEGORIES) : null,
        min_stock !== undefined ? v.integer(min_stock, 'El stock mínimo', { min: 0, max: 100000 }) : null
      ]
    );
    if (!res.rows[0]) throw notFound('Prenda no encontrada.');
    return res.rows[0];
  },

  /** Ingreso de piezas nuevas (compra) al almacén limpio */
  async addStock(id, { quantity, notes = '' }, user_id) {
    const qty = v.integer(quantity, 'La cantidad', { min: 1, max: 100000 });
    return await withTransaction(async (txQuery) => {
      await lockItem(txQuery, id);
      const res = await txQuery(`UPDATE textile_items SET clean_qty = clean_qty + $2, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, qty]);
      await logMovement(txQuery, { item_id: id, movement_type: 'purchase', quantity: qty, notes: v.text(notes, 'La nota', { max: 255, required: false }), user_id });
      return res.rows[0];
    });
  },

  /** Movimiento entre estados (asignar, recambio, retirar, dar de baja) */
  async moveItem(id, { type, quantity, notes = '' }, user_id) {
    const move = MOVES[type];
    if (!move) throw v.badRequest('Tipo de movimiento no válido.');
    const qty = v.integer(quantity, 'La cantidad', { min: 1, max: 100000 });
    return await withTransaction(async (txQuery) => {
      const item = await lockItem(txQuery, id);
      if (item[move.from] < qty) {
        throw v.badRequest(`Solo hay ${item[move.from]} pieza(s) ${QTY_LABELS[move.from]} de "${item.name}".`);
      }
      const res = await txQuery(
        `UPDATE textile_items SET ${move.from} = ${move.from} - $2, ${move.to} = ${move.to} + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id, qty]
      );
      await logMovement(txQuery, { item_id: id, movement_type: type, quantity: qty, notes: v.text(notes, 'La nota', { max: 255, required: false }), user_id });
      return res.rows[0];
    });
  },

  async listBatches({ limit = 200 } = {}) {
    const res = await query(
      `SELECT b.*, u.full_name AS user_full_name,
              COALESCE(SUM(bi.quantity), 0)::int AS items_count,
              COALESCE(json_agg(json_build_object(
                'item_id', bi.item_id, 'name', ti.name, 'quantity', bi.quantity,
                'returned_qty', bi.returned_qty, 'damaged_qty', bi.damaged_qty
              ) ORDER BY ti.name) FILTER (WHERE bi.id IS NOT NULL), '[]') AS items
         FROM laundry_batches b
         LEFT JOIN users u ON u.id = b.user_id
         LEFT JOIN laundry_batch_items bi ON bi.batch_id = b.id
         LEFT JOIN textile_items ti ON ti.id = bi.item_id
        GROUP BY b.id, u.full_name
        ORDER BY b.sent_at DESC
        LIMIT $1`,
      [Math.min(Number(limit) || 200, 1000)]
    );
    return res.rows;
  },

  /** Envío a lavandería: las piezas "por lavar" pasan a "en lavandería" */
  async sendToLaundry({ provider, expected_return_at = null, notes = '', items = [] }, user_id) {
    const providerName = v.text(provider, 'La lavandería / proveedor', { min: 3, max: 150 });
    if (!Array.isArray(items) || items.length === 0) throw v.badRequest('Agrega al menos una prenda al lote.');
    let expected = null;
    if (expected_return_at) {
      expected = new Date(expected_return_at);
      if (isNaN(expected.getTime())) throw v.badRequest('La fecha estimada de retorno no es válida.');
    }

    // Unificar prendas repetidas
    const merged = new Map();
    for (const it of items) {
      const qty = v.integer(it.quantity, 'La cantidad', { min: 1, max: 100000 });
      merged.set(it.item_id, (merged.get(it.item_id) || 0) + qty);
    }

    return await withTransaction(async (txQuery) => {
      const year = new Date().getFullYear();
      const seq = await txQuery(
        `INSERT INTO voucher_sequences (series, last_number) VALUES ($1, 1)
         ON CONFLICT (series) DO UPDATE SET last_number = voucher_sequences.last_number + 1
         RETURNING last_number`,
        [`LAV${year}`]
      );
      const code = `LAV-${year}-${String(seq.rows[0].last_number).padStart(3, '0')}`;
      const batchRes = await txQuery(
        `INSERT INTO laundry_batches (code, provider, expected_return_at, notes, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [code, providerName, expected, v.text(notes, 'La nota', { max: 500, required: false }), user_id]
      );
      const batch = batchRes.rows[0];

      for (const [itemId, qty] of merged) {
        const item = await lockItem(txQuery, itemId);
        if (item.dirty_qty < qty) {
          throw v.badRequest(`Solo hay ${item.dirty_qty} pieza(s) por lavar de "${item.name}".`);
        }
        await txQuery(`UPDATE textile_items SET dirty_qty = dirty_qty - $2, laundry_qty = laundry_qty + $2, updated_at = NOW() WHERE id = $1`, [itemId, qty]);
        await txQuery(`INSERT INTO laundry_batch_items (batch_id, item_id, quantity) VALUES ($1, $2, $3)`, [batch.id, itemId, qty]);
        await logMovement(txQuery, { item_id: itemId, movement_type: 'laundry_send', quantity: qty, batch_id: batch.id, user_id });
      }
      return batch;
    });
  },

  /**
   * Retorno de lavandería: por cada prenda se indica cuántas llegaron dañadas (se dan de baja);
   * el resto vuelve limpio al almacén.
   */
  async returnFromLaundry(batchId, { items = [] } = {}, user_id) {
    return await withTransaction(async (txQuery) => {
      const batchRes = await txQuery('SELECT * FROM laundry_batches WHERE id = $1 FOR UPDATE', [batchId]);
      const batch = batchRes.rows[0];
      if (!batch) throw notFound('Lote de lavandería no encontrado.');
      if (batch.status === 'returned') throw v.badRequest('Este lote ya fue recibido.');

      const damagedByItem = new Map((Array.isArray(items) ? items : []).map((i) => [i.item_id, i.damaged_qty]));
      const lines = await txQuery('SELECT * FROM laundry_batch_items WHERE batch_id = $1', [batchId]);

      for (const line of lines.rows) {
        const damaged = v.integer(damagedByItem.get(line.item_id) ?? 0, 'Las piezas dañadas', { min: 0, max: line.quantity });
        const clean = line.quantity - damaged;
        await lockItem(txQuery, line.item_id);
        await txQuery(
          `UPDATE textile_items
              SET laundry_qty = laundry_qty - $2, clean_qty = clean_qty + $3, discarded_qty = discarded_qty + $4, updated_at = NOW()
            WHERE id = $1`,
          [line.item_id, line.quantity, clean, damaged]
        );
        await txQuery(`UPDATE laundry_batch_items SET returned_qty = $2, damaged_qty = $3 WHERE id = $1`, [line.id, clean, damaged]);
        await logMovement(txQuery, { item_id: line.item_id, movement_type: 'laundry_return', quantity: clean, batch_id: batchId, notes: damaged > 0 ? `${damaged} dañada(s)` : '', user_id });
      }

      const res = await txQuery(`UPDATE laundry_batches SET status = 'returned', returned_at = NOW() WHERE id = $1 RETURNING *`, [batchId]);
      return res.rows[0];
    });
  }
};

import { query } from '../config/db.js';

export const reportRepository = {
  async getKPIs({ startDate, endDate }) {
    // 1. Conteo total de habitaciones en el hotel
    const roomsRes = await query('SELECT COUNT(*) AS total FROM rooms');
    const totalRooms = parseInt(roomsRes.rows[0].total, 10) || 1;

    // 2. Transacciones filtradas por rango de fecha
    const transSql = `
      SELECT ct.*, u.full_name AS user_full_name
      FROM cash_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      WHERE ct.created_at >= $1::timestamptz AND ct.created_at <= $2::timestamptz
      ORDER BY ct.created_at DESC
    `;
    const transRes = await query(transSql, [startDate, endDate]);
    const transactions = transRes.rows;

    // 3. Estadías cerradas o activas dentro del periodo
    const staysSql = `
      SELECT s.*, c.full_name AS customer_name, c.document_type, c.document_number, r.room_number
      FROM stays s
      JOIN customers c ON s.customer_id = c.id
      JOIN rooms r ON s.room_id = r.id
      WHERE s.start_time >= $1::timestamptz AND s.start_time <= $2::timestamptz
    `;
    const staysRes = await query(staysSql, [startDate, endDate]);
    const stays = staysRes.rows;

    // Métricas por Origen
    const stayRevenue = transactions
      .filter(t => t.transaction_type === 'income' && t.category === 'stay')
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    const storeRevenue = transactions
      .filter(t => t.transaction_type === 'income' && (t.category === 'store' || t.category === 'consumption'))
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    const incidentRevenue = transactions
      .filter(t => t.transaction_type === 'income' && t.category === 'incident')
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    const totalIncome = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    const totalExpense = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    const netBalance = totalIncome - totalExpense;

    // Medios de Pago
    const cashIncome = transactions
      .filter(t => t.transaction_type === 'income' && t.payment_method === 'CASH')
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    const yapeIncome = transactions
      .filter(t => t.transaction_type === 'income' && t.payment_method === 'YAPE_PLIN')
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    const cardIncome = transactions
      .filter(t => t.transaction_type === 'income' && t.payment_method === 'CARD')
      .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

    // Cálculos de KPIs Hoteleros (ADR, RevPAR, Ocupación)
    const totalStaysCount = stays.length;
    const adr = totalStaysCount > 0 ? (stayRevenue / totalStaysCount) : 0;
    const revpar = stayRevenue / totalRooms;
    const occupancyRate = Math.min(100, Math.round((totalStaysCount / totalRooms) * 100));

    return {
      totalRooms,
      totalStaysCount,
      occupancyRate,
      adr,
      revpar,
      stayRevenue,
      storeRevenue,
      incidentRevenue,
      totalIncome,
      totalExpense,
      netBalance,
      cashIncome,
      yapeIncome,
      cardIncome,
      transactions
    };
  },

  async getMinceturReport({ startDate, endDate }) {
    const sql = `
      SELECT 
        s.id,
        s.start_time,
        s.actual_end_time,
        s.expected_end_time,
        s.stay_type,
        s.companion_name,
        r.room_number,
        c.full_name AS customer_name,
        c.document_type,
        c.document_number,
        c.phone
      FROM stays s
      JOIN customers c ON s.customer_id = c.id
      JOIN rooms r ON s.room_id = r.id
      WHERE s.start_time >= $1::timestamptz AND s.start_time <= $2::timestamptz
      ORDER BY s.start_time DESC
    `;
    const res = await query(sql, [startDate, endDate]);
    return res.rows;
  }
};

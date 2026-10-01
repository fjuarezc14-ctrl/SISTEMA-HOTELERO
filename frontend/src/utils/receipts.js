// Constructores de comprobantes (formato de ReceiptDocument) para cada flujo del sistema.
import { formatDatePeru } from './formatters';

const STAY_TYPE_TEXT = { hours: 'Por horas', overnight: 'Pernocte', full_day: 'Por días' };

const toPayments = (payments = []) =>
  payments.map((p) => ({ method: p.payment_method, amount: Number(p.amount), reference: p.reference_number || '' }));

/** Cliente del comprobante: en factura, la empresa; si no, la persona */
function customerFor(voucher, person = {}) {
  if (voucher?.voucher_type === 'FACTURA') {
    return { name: voucher.customer_business_name, doc_type: 'RUC', doc_number: voucher.customer_ruc };
  }
  return { name: person.name, doc_type: person.doc_type, doc_number: person.doc_number };
}

/** Check-in (respuesta de /stays/checkin o /reservations/:id/checkin) */
export function checkInReceipt({ stay, room, quote, customer }) {
  const items = [{ description: `Hospedaje Hab. ${room.room_number} - ${STAY_TYPE_TEXT[quote.stay_type] || 'Estadía'}`, amount: quote.price }];
  const summary = [];
  if (quote.deposit > 0) {
    items.push({ description: 'Abono de reserva (pagado antes)', amount: -quote.deposit });
  }
  const pending = Math.max(0, Number(quote.amount_due) - Number(stay.paid_now || 0));
  if (pending > 0) summary.push({ label: 'SALDO PENDIENTE', value: `S/ ${pending.toFixed(2)}` });
  return {
    voucher_type: stay.voucher?.voucher_type,
    voucher_number: stay.voucher?.voucher_number,
    date: stay.start_time,
    customer: customerFor(stay.voucher, customer),
    room_number: room.room_number,
    details: [{ label: 'SALIDA', value: formatDatePeru(stay.expected_end_time) }],
    items,
    total: Number(stay.paid_now || 0),
    payments: toPayments(stay.payments),
    summary
  };
}

/** Check-out (respuesta de /stays/checkout) */
export function checkOutReceipt({ result, room, customer }) {
  const q = result.checkout_summary;
  const items = [{ description: `Hospedaje Hab. ${room.room_number}`, amount: q.stay_price }];
  if (q.overstay_cost > 0) items.push({ description: `Horas extra por salida tardía (${q.overstay_hours}h)`, amount: q.overstay_cost });
  if (q.consumptions > 0) items.push({ description: 'Consumos tienda / minibar', amount: q.consumptions });
  if (q.penalty > 0) items.push({ description: 'Penalidad / daño en habitación', amount: q.penalty });
  if (q.paid > 0) items.push({ description: 'Pagado anteriormente', amount: -q.paid });
  return {
    voucher_type: result.voucher?.voucher_type,
    voucher_number: result.voucher?.voucher_number,
    date: result.actual_end_time || new Date(),
    customer: customerFor(result.voucher, customer),
    room_number: room.room_number,
    items,
    total: q.paid_now,
    payments: toPayments(result.payments)
  };
}

/** Horas extra (respuesta de /stays/:id/extra-hours) */
export function extraHoursReceipt({ result, room, customer }) {
  return {
    voucher_type: result.voucher?.voucher_type,
    voucher_number: result.voucher?.voucher_number,
    customer: customerFor(result.voucher, customer),
    room_number: room.room_number,
    details: [{ label: 'NUEVA SALIDA', value: formatDatePeru(result.expected_end_time) }],
    items: [{ description: `Horas extra (x${result.extra_hours})`, qty: 1, amount: result.extra_cost }],
    total: result.extra_cost,
    payments: toPayments(result.payments)
  };
}

/** Venta de tienda (movimiento de caja devuelto por /products/direct-sale + carrito) */
export function storeSaleReceipt({ tx, cart, payments, customer, roomNumber }) {
  return {
    voucher_type: tx.voucher_type,
    voucher_number: tx.voucher_number,
    date: tx.created_at,
    customer: customerFor(tx, customer),
    room_number: roomNumber,
    items: cart.map((c) => ({ description: c.product.name, qty: c.qty, amount: Number(c.product.sale_price_pen) * c.qty })),
    total: cart.reduce((sum, c) => sum + Number(c.product.sale_price_pen) * c.qty, 0),
    payments
  };
}

/**
 * Reimpresión desde Caja: agrupa los movimientos con el mismo número de comprobante (pago mixto).
 * Movimientos antiguos sin número se reimprimen como ticket con su concepto.
 */
export function cashReceipt(tx, allTransactions = []) {
  const group = tx.voucher_number
    ? allTransactions.filter((t) => t.voucher_number === tx.voucher_number && !t.is_cancelled)
    : [tx];
  const txs = group.length > 0 ? group : [tx];
  const total = txs.reduce((sum, t) => sum + Number(t.amount_pen), 0);
  const saleItems = txs.find((t) => Array.isArray(t.sale_items) && t.sale_items.length > 0)?.sale_items;

  const items = saleItems
    ? saleItems.map((i) => ({ description: i.product_name, qty: i.quantity, amount: Number(i.total_price_pen) }))
    : txs.map((t) => ({ description: t.concept.replace(/ \((Efectivo|Yape\/Plin|Tarjeta)\)$/, ''), amount: Number(t.amount_pen) }));

  return {
    voucher_type: tx.transaction_type === 'expense' ? 'TICKET' : tx.voucher_type,
    voucher_number: tx.voucher_number || null,
    title: tx.transaction_type === 'expense' ? 'COMPROBANTE DE EGRESO' : undefined,
    date: tx.created_at,
    customer: customerFor(tx, { name: tx.customer_name }),
    room_number: tx.room_number,
    items,
    total,
    payments: txs.map((t) => ({ method: t.payment_method, amount: Number(t.amount_pen), reference: t.reference_number })),
    note: tx.is_cancelled ? `*** ANULADO *** ${tx.cancellation_reason || ''}` : tx.voucher_number ? '' : 'Reimpresión de movimiento'
  };
}

/** Arqueo / cierre de turno */
export function shiftClosureReceipt(shift, { actualCash, expectedCash, cashierName } = {}) {
  const expected = Number(expectedCash ?? shift.expected_cash_pen ?? 0);
  const actual = Number(actualCash ?? shift.actual_cash_pen ?? 0);
  const yape = Number(shift.live_total_yape_plin_pen ?? shift.total_yape_plin_pen ?? 0);
  const card = Number(shift.live_total_card_pen ?? shift.total_card_pen ?? 0);
  const revenue = Number(shift.live_total_revenue_pen ?? shift.total_revenue_pen ?? 0);
  return {
    voucher_type: 'TICKET',
    title: 'ARQUEO / CIERRE DE TURNO',
    date: shift.closed_at || new Date(),
    customer: { name: cashierName || shift.user_full_name },
    details: [
      { label: 'APERTURA', value: formatDatePeru(shift.opened_at) },
      { label: 'CIERRE', value: formatDatePeru(shift.closed_at || new Date()) }
    ],
    items: [
      { description: 'Fondo inicial', amount: Number(shift.initial_cash_pen || 0) },
      { description: 'Efectivo esperado', amount: expected },
      { description: 'Efectivo contado', amount: actual },
      { description: 'Yape / Plin', amount: yape },
      { description: 'Tarjetas POS', amount: card }
    ],
    total: revenue,
    summary: [{ label: 'DIFERENCIA', value: `S/ ${(actual - expected).toFixed(2)}` }]
  };
}

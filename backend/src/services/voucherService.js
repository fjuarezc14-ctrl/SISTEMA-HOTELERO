import { query } from '../config/db.js';

/**
 * Comprobantes de pago: numeración correlativa por serie y validación de datos del cliente.
 * Una operación (check-in, venta, check-out…) emite UN comprobante aunque el pago sea mixto.
 */
export const VOUCHER_SERIES = { TICKET: 'T001', BOLETA: 'B001', FACTURA: 'F001' };

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
}

/** Tipo de comprobante normalizado: TICKET (interno), BOLETA o FACTURA */
export function normalizeVoucherType(type) {
  const t = String(type || '').toUpperCase();
  if (t === 'BOLETA' || t === 'FACTURA') return t;
  return 'TICKET';
}

/** Siguiente número de la serie (atómico: dos operaciones simultáneas nunca repiten número) */
export async function nextVoucherNumber(voucherType, runQuery = query) {
  const type = normalizeVoucherType(voucherType);
  const series = VOUCHER_SERIES[type];
  const res = await runQuery(
    `INSERT INTO voucher_sequences (series, last_number) VALUES ($1, 1)
     ON CONFLICT (series) DO UPDATE SET last_number = voucher_sequences.last_number + 1
     RETURNING last_number`,
    [series]
  );
  return `${series}-${String(res.rows[0].last_number).padStart(8, '0')}`;
}

/**
 * Prepara los datos del comprobante de una operación.
 * Con runQuery de una transacción, el número solo se consume si la operación se confirma (sin saltos).
 * Devuelve { voucher_type, voucher_number, customer_ruc, customer_business_name } listos para cash_transactions.
 */
export async function issueVoucher({ voucher_type, customer_ruc = '', customer_business_name = '' } = {}, runQuery = query) {
  const type = normalizeVoucherType(voucher_type);
  const ruc = String(customer_ruc || '').trim();
  const businessName = String(customer_business_name || '').trim();

  if (type === 'FACTURA') {
    if (!/^(10|15|17|20)\d{9}$/.test(ruc)) throw badRequest('Para emitir factura se requiere un RUC válido de 11 dígitos.');
    if (businessName.length < 3) throw badRequest('Para emitir factura se requiere la razón social.');
  }

  return {
    voucher_type: type,
    voucher_number: await nextVoucherNumber(type, runQuery),
    customer_ruc: type === 'FACTURA' ? ruc : '',
    customer_business_name: type === 'FACTURA' ? businessName.slice(0, 255) : ''
  };
}

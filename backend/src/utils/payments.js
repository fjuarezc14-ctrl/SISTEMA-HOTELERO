// Validación de pagos (simple o mixto) compartida por check-in, checkout, horas extra y tienda.

const PAYMENT_METHODS = ['CASH', 'YAPE_PLIN', 'CARD'];
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
}

/**
 * Valida un pago (simple o mixto) contra el saldo pendiente.
 * Devuelve la lista de pagos [{ amount, payment_method, reference_number }] (vacía si no se cobra nada).
 */
export function normalizePayment(payment, amountDue) {
  if (!payment || !(Number(payment.amount) > 0)) return [];

  const amount = round2(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('El monto a cobrar no es válido.');
  if (amount > amountDue + 0.01) {
    throw badRequest(`El monto cobrado (S/ ${amount.toFixed(2)}) supera el saldo pendiente (S/ ${amountDue.toFixed(2)}).`);
  }

  if (payment.payment_method === 'MIXED') {
    const splits = (Array.isArray(payment.split_payments) ? payment.split_payments : [])
      .map((sp) => ({
        amount: round2(sp.amount || 0),
        payment_method: sp.payment_method,
        reference_number: String(sp.reference_number || payment.reference_number || '').trim().slice(0, 50)
      }))
      .filter((sp) => sp.amount > 0);
    if (splits.some((sp) => !PAYMENT_METHODS.includes(sp.payment_method) || sp.amount < 0)) {
      throw badRequest('El pago mixto contiene un medio de pago no válido.');
    }
    const sum = round2(splits.reduce((acc, sp) => acc + sp.amount, 0));
    if (Math.abs(sum - amount) > 0.01) {
      throw badRequest(`El desglose del pago mixto (S/ ${sum.toFixed(2)}) debe sumar el monto cobrado (S/ ${amount.toFixed(2)}).`);
    }
    return splits;
  }

  const method = payment.payment_method || 'CASH';
  if (!PAYMENT_METHODS.includes(method)) throw badRequest('Medio de pago no válido.');
  return [{ amount, payment_method: method, reference_number: String(payment.reference_number || '').trim().slice(0, 50) }];
}

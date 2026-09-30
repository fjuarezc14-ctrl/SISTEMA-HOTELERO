/**
 * Gestor de Correlativos Secuenciales para Comprobantes y Tickets del Hotel.
 * Almacena en localStorage los contadores:
 * - TICKET (Internal ticket): TCK-000001, TCK-000002...
 * - BOLETA: B001-00000001, B001-00000002...
 * - FACTURA: F001-00000001, F001-00000002...
 * - ARQUEO: ARQ-000001, ARQ-000002...
 */

const COUNTER_KEYS = {
  TICKET: 'hotel_seq_ticket',
  BOLETA: 'hotel_seq_boleta',
  FACTURA: 'hotel_seq_factura',
  ARQUEO: 'hotel_seq_arqueo'
};

/**
 * Genera y retorna el siguiente número secuencial para un tipo de comprobante.
 * @param {'TICKET' | 'BOLETA' | 'FACTURA' | 'ARQUEO'} type 
 * @returns {{ series: string, number: string, full: string }}
 */
export function getNextSequenceNumber(type = 'TICKET') {
  const normalizedType = (type || 'TICKET').toUpperCase();
  const key = COUNTER_KEYS[normalizedType] || COUNTER_KEYS.TICKET;
  const currentVal = parseInt(localStorage.getItem(key) || '0', 10);
  const nextVal = currentVal + 1;
  localStorage.setItem(key, String(nextVal));

  if (normalizedType === 'BOLETA') {
    const series = 'B001';
    const number = String(nextVal).padStart(8, '0');
    return { series, number, full: `${series}-${number}` };
  }
  if (normalizedType === 'FACTURA') {
    const series = 'F001';
    const number = String(nextVal).padStart(8, '0');
    return { series, number, full: `${series}-${number}` };
  }
  if (normalizedType === 'ARQUEO') {
    const series = 'ARQ';
    const number = String(nextVal).padStart(6, '0');
    return { series, number, full: `${series}-${number}` };
  }
  // Default TICKET
  const series = 'TCK';
  const number = String(nextVal).padStart(6, '0');
  return { series, number, full: `${series}-${number}` };
}

/**
 * Obtiene la serie y correlativo actual sin incrementar.
 */
export function getCurrentSequenceNumber(type = 'TICKET') {
  const normalizedType = (type || 'TICKET').toUpperCase();
  const key = COUNTER_KEYS[normalizedType] || COUNTER_KEYS.TICKET;
  const currentVal = parseInt(localStorage.getItem(key) || '0', 10);
  
  if (normalizedType === 'BOLETA') {
    return `B001-${String(currentVal).padStart(8, '0')}`;
  }
  if (normalizedType === 'FACTURA') {
    return `F001-${String(currentVal).padStart(8, '0')}`;
  }
  if (normalizedType === 'ARQUEO') {
    return `ARQ-${String(currentVal).padStart(6, '0')}`;
  }
  return `TCK-${String(currentVal).padStart(6, '0')}`;
}

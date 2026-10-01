import React from 'react';
import { Printer, FileText } from 'lucide-react';
import { Badge } from './Badge';

const LABELS = { BOLETA: 'Boleta', FACTURA: 'Factura', TICKET: 'Ticket' };
const TONES = { BOLETA: 'indigo', FACTURA: 'violet', TICKET: 'slate' };

/**
 * Celda de comprobante para listas de caja:
 * - Muestra el tipo y número (ticket, boleta o factura).
 * - "Reimprimir" disponible para todos los movimientos.
 * - "Emitir" boleta/factura para ingresos que solo tienen ticket.
 */
export function VoucherCell({ tx, onReprint, onEmit }) {
  const type = tx.voucher_type === 'BOLETA' || tx.voucher_type === 'FACTURA' ? tx.voucher_type : 'TICKET';
  const canEmit = onEmit && tx.transaction_type === 'income' && !tx.is_cancelled && type === 'TICKET';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone={TONES[type]} title={tx.voucher_number || 'Movimiento sin número (anterior a la numeración)'}>
        {tx.transaction_type === 'expense' ? 'Egreso' : LABELS[type]}
        {tx.voucher_number ? ` ${tx.voucher_number}` : ''}
      </Badge>
      <button
        type="button"
        onClick={() => onReprint(tx)}
        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 inline-flex items-center gap-1"
        title="Reimprimir comprobante"
      >
        <Printer className="w-3 h-3" />
        <span>Reimprimir</span>
      </button>
      {canEmit && (
        <button
          type="button"
          onClick={() => onEmit(tx)}
          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1"
          title="Emitir boleta o factura para este cobro"
        >
          <FileText className="w-3 h-3 text-emerald-600" />
          <span>Boleta / Factura</span>
        </button>
      )}
    </div>
  );
}

import React from 'react';
import { Printer, FileText, Ban } from 'lucide-react';

const LABELS = { BOLETA: 'Boleta', FACTURA: 'Factura', TICKET: 'Ticket' };

const voucherTypeOf = (tx) => (tx.voucher_type === 'BOLETA' || tx.voucher_type === 'FACTURA' ? tx.voucher_type : 'TICKET');

/** Texto del comprobante (tipo y número), sin botones */
export function VoucherCell({ tx }) {
  const type = voucherTypeOf(tx);
  if (tx.transaction_type === 'expense') return <span className="text-[11px] text-slate-400">—</span>;
  return (
    <span className="text-[11px] leading-tight" title={tx.voucher_number ? undefined : 'Movimiento anterior a la numeración'}>
      <span className={`font-bold ${type === 'TICKET' ? 'text-slate-500' : 'text-indigo-700'}`}>{LABELS[type]}</span>
      {tx.voucher_number && <span className="block font-mono text-slate-500">{tx.voucher_number}</span>}
    </span>
  );
}

const iconBtn = 'w-7 h-7 inline-flex items-center justify-center rounded-lg border transition-colors';

/** Acciones compactas de un movimiento: reimprimir, emitir boleta/factura y anular */
export function TransactionActions({ tx, onReprint, onEmit, onCancel }) {
  const canEmit = onEmit && tx.transaction_type === 'income' && !tx.is_cancelled && voucherTypeOf(tx) === 'TICKET';
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" onClick={() => onReprint(tx)} title="Reimprimir comprobante" className={`${iconBtn} bg-white border-slate-200 text-slate-600 hover:bg-slate-100`}>
        <Printer className="w-3.5 h-3.5" />
      </button>
      {canEmit && (
        <button type="button" onClick={() => onEmit(tx)} title="Emitir boleta o factura" className={`${iconBtn} bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50`}>
          <FileText className="w-3.5 h-3.5" />
        </button>
      )}
      {onCancel && !tx.is_cancelled && (
        <button type="button" onClick={() => onCancel(tx)} title="Anular movimiento" className={`${iconBtn} bg-white border-rose-200 text-rose-600 hover:bg-rose-50`}>
          <Ban className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

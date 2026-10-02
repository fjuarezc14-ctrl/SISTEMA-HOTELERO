import React from 'react';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS } from '../../utils/formatters';

const TITLES = {
  TICKET: 'TICKET DE VENTA',
  BOLETA: 'BOLETA DE VENTA ELECTRÓNICA',
  FACTURA: 'FACTURA ELECTRÓNICA'
};

const DOC_LABELS = { DNI: 'DNI', CE: 'C.E.', PASSPORT: 'PASAPORTE', RUC: 'RUC' };

/**
 * Comprobante único (ticket interno, boleta o factura) en formato 80mm.
 * Todo el contenido se renderiza con React (texto escapado), también al imprimir.
 *
 * receipt = {
 *   voucher_type: 'TICKET' | 'BOLETA' | 'FACTURA', voucher_number, date, title?,
 *   customer: { name, doc_type, doc_number, address },
 *   room_number, details: [{ label, value }],
 *   items: [{ description, qty, amount }], total,
 *   payments: [{ method, amount, reference }], summary: [{ label, value }], note
 * }
 */
export function ReceiptDocument({ receipt, hotelInfo }) {
  const type = receipt.voucher_type === 'BOLETA' || receipt.voucher_type === 'FACTURA' ? receipt.voucher_type : 'TICKET';
  const isElectronic = type !== 'TICKET';
  const total = Number(receipt.total || 0);
  const taxBase = total / 1.18;
  const igv = total - taxBase;
  const customer = receipt.customer || {};

  return (
    <div className="receipt">
      <div className="center divider-bottom">
        <p className="bold big">{hotelInfo?.trade_name || hotelInfo?.business_name || 'Hotel'}</p>
        {hotelInfo?.business_name && <p>{hotelInfo.business_name}</p>}
        {hotelInfo?.ruc && <p>RUC: {hotelInfo.ruc}</p>}
        {hotelInfo?.address && <p>{hotelInfo.address}</p>}
        {hotelInfo?.phone && <p>Tel: {hotelInfo.phone}</p>}
      </div>

      <div className="center divider-bottom">
        <p className="bold">{receipt.title || TITLES[type]}</p>
        {receipt.voucher_number && <p className="bold big">{receipt.voucher_number}</p>}
      </div>

      <div className="divider-bottom">
        <p>
          <b>FECHA:</b> {formatDatePeru(receipt.date || new Date())}
        </p>
        {customer.name && (
          <p>
            <b>{type === 'FACTURA' ? 'RAZÓN SOCIAL' : 'CLIENTE'}:</b> {customer.name}
          </p>
        )}
        {customer.doc_number && (
          <p>
            <b>{type === 'FACTURA' ? 'RUC' : DOC_LABELS[customer.doc_type] || 'DOC'}:</b> {customer.doc_number}
          </p>
        )}
        {customer.address && (
          <p>
            <b>DIRECCIÓN:</b> {customer.address}
          </p>
        )}
        {receipt.room_number && (
          <p>
            <b>HABITACIÓN:</b> {receipt.room_number}
          </p>
        )}
        {(receipt.details || []).map((d) => (
          <p key={d.label}>
            <b>{d.label}:</b> {d.value}
          </p>
        ))}
      </div>

      {(receipt.items || []).length > 0 && (
        <table>
          <thead>
            <tr>
              <th className="left">DESCRIPCIÓN</th>
              <th className="right">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, idx) => (
              <tr key={idx}>
                <td className="left">
                  {Number(item.qty) > 1 ? `${item.qty} x ` : ''}
                  {item.description}
                </td>
                <td className="right">{formatPEN(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="divider-top">
        {isElectronic && (
          <>
            <div className="row">
              <span>OP. GRAVADA:</span>
              <span>{formatPEN(taxBase)}</span>
            </div>
            <div className="row">
              <span>I.G.V. (18%):</span>
              <span>{formatPEN(igv)}</span>
            </div>
          </>
        )}
        <div className="row bold big">
          <span>TOTAL:</span>
          <span>{formatPEN(total)}</span>
        </div>
        {(receipt.payments || []).map((p, idx) => (
          <div className="row" key={idx}>
            <span>
              {PAYMENT_METHOD_LABELS[p.method] || p.method}
              {p.reference ? ` (Op. ${p.reference})` : ''}
            </span>
            <span>{formatPEN(p.amount)}</span>
          </div>
        ))}
        {(receipt.summary || []).map((line) => (
          <div className="row bold" key={line.label}>
            <span>{line.label}:</span>
            <span>{line.value}</span>
          </div>
        ))}
      </div>

      {receipt.note && <p className="center small divider-top">{receipt.note}</p>}

      <div className="center small divider-top">
        {isElectronic && <p>Representación impresa de la {TITLES[type].toLowerCase()}</p>}
        <p className="bold">{hotelInfo?.ticket_footer_legend || '¡Gracias por su preferencia!'}</p>
      </div>
    </div>
  );
}

/** Estilos del comprobante (vista previa e impresión 80mm) */
export const RECEIPT_CSS = `
  .receipt { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; width: 72mm; margin: 0 auto; line-height: 1.35; }
  .receipt p { margin: 1px 0; }
  .receipt .center { text-align: center; }
  .receipt .bold, .receipt b { font-weight: bold; }
  .receipt .big { font-size: 13px; }
  .receipt .small { font-size: 9px; }
  .receipt .divider-bottom { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
  .receipt .divider-top { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
  .receipt table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .receipt th { border-bottom: 1px solid #000; padding: 2px 0; }
  .receipt td { padding: 2px 0; vertical-align: top; }
  .receipt .left { text-align: left; }
  .receipt .right { text-align: right; white-space: nowrap; padding-left: 6px; }
  .receipt .row { display: flex; justify-content: space-between; gap: 6px; }
`;

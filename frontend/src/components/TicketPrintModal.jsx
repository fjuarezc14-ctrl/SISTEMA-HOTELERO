import React from 'react';
import { Modal } from './Modal';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { Printer } from 'lucide-react';

export function TicketPrintModal({ isOpen, onClose, ticketData }) {
  if (!ticketData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Impresión de Comprobante / Ticket (80mm)" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Printable Ticket Area */}
        <div id="thermal-ticket-area" className="p-4 bg-white text-black font-mono text-xs rounded-xl space-y-2 border border-slate-300 shadow-inner">
          <div className="text-center border-b border-dashed border-black pb-2 space-y-0.5">
            <p className="font-bold text-sm uppercase">Hotel Marte Perú</p>
            <p className="text-[10px]">VT HOTEL PERÚ S.A.C. - RUC: 20123456789</p>
            <p className="text-[10px]">Av. Principal 123, Miraflores, Lima</p>
            <p className="text-[10px]">Tel: 01-2345678</p>
          </div>

          <div className="text-[10px] space-y-0.5 py-1 border-b border-dashed border-black">
            <p><strong>TICKET #:</strong> {ticketData.ticket_number || ticketData.id?.substring(0, 8) || '001'}</p>
            <p><strong>FECHA:</strong> {formatDatePeru(ticketData.date || new Date())}</p>
            <p><strong>CLIENTE:</strong> {ticketData.customer_name || 'Cliente Varios'}</p>
            {ticketData.document_number && <p><strong>DOC:</strong> {ticketData.document_number}</p>}
            {ticketData.room_number && <p><strong>HABITACIÓN:</strong> {ticketData.room_number}</p>}
          </div>

          <table className="w-full text-[10px] my-2">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1">CONCEPTO</th>
                <th className="py-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {ticketData.items ? (
                ticketData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{item.name} {item.qty ? `(x${item.qty})` : ''}</td>
                    <td className="py-1 text-right">{formatPEN(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-1">{ticketData.concept || 'Servicio de Hospedaje'}</td>
                  <td className="py-1 text-right">{formatPEN(ticketData.amount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="border-t border-dashed border-black pt-2 text-[10px] space-y-1">
            <div className="flex justify-between font-bold text-xs">
              <span>TOTAL (PEN S/):</span>
              <span>{formatPEN(ticketData.total_amount || ticketData.amount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>FORMA PAGO:</span>
              <span className="uppercase">{ticketData.payment_method || 'EFECTIVO'}</span>
            </div>
          </div>

          <div className="text-center text-[9px] pt-3 border-t border-dashed border-black space-y-0.5">
            <p className="font-bold">¡Gracias por su preferencia!</p>
            <p>Conserve este ticket para su control</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket (80mm)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

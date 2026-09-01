import React, { useState } from 'react';
import { Modal } from './Modal';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { Printer, Share2, Send } from 'lucide-react';
import { useGlobalStore } from '../context/GlobalStoreContext';

export function TicketPrintModal({ isOpen, onClose, ticketData }) {
  const { hotelInfo } = useGlobalStore();
  const [phone, setPhone] = useState('');
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);

  if (!ticketData) return null;

  const legendText = hotelInfo?.ticket_footer_legend || '¡Gracias por su preferencia en Hotel Zafiro! Conserve sus objetos de valor.';

  const handlePrint = () => {
    window.print();
  };

  // FEATURE 2: Notificación WhatsApp Business API / Direct Message
  const handleSendWhatsApp = () => {
    const targetPhone = phone.trim().replace(/\D/g, '');
    const clientName = ticketData.customer_name || 'Huésped';
    const roomInfo = ticketData.room_number ? `Hab. ${ticketData.room_number}` : 'Hospedaje';
    const total = formatPEN(ticketData.total_amount || ticketData.amount || 0);

    const message = `*Hotel Zafiro - Comprobante de Servicio*%0A` +
      `Estimado(a) *${clientName}*, gracias por alojarte en Hotel Zafiro.%0A%0A` +
      `📌 *Detalle:* ${roomInfo}%0A` +
      `💰 *Total:* ${total}%0A` +
      `💳 *Pago:* ${ticketData.payment_method || 'Efectivo S/'}%0A%0A` +
      `¡Deseamos que tengas una excelente estadía! 🏨✨`;

    const waUrl = targetPhone
      ? `https://wa.me/51${targetPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Impresión de Comprobante / Ticket (80mm)" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Printable Ticket Area */}
        <div id="thermal-ticket-area" className="p-4 bg-white text-black font-mono text-xs rounded-xl space-y-2 border border-slate-300 shadow-inner">
          <div className="text-center border-b border-dashed border-black pb-2 space-y-0.5">
            <p className="font-bold text-sm uppercase">Hotel Zafiro</p>
            <p className="text-[10px]">HOTEL ZAFIRO S.A.C. - RUC: 20123456789</p>
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
            <p className="font-bold whitespace-pre-line">{legendText}</p>
          </div>
        </div>

        {/* WhatsApp Sending Input */}
        {showWhatsAppInput ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-emerald-800">Número de WhatsApp del Huésped (Perú)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 987654321"
                className="flex-1 bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowWhatsAppInput(!showWhatsAppInput)}
            className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>📲 WhatsApp</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-xl"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

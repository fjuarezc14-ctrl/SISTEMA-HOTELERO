import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { ReceiptDocument, RECEIPT_CSS } from '../components/ReceiptDocument';
import { useGlobalStore } from './GlobalStoreContext';
import { formatPEN } from '../utils/formatters';
import { Printer, Share2, Send } from 'lucide-react';

const ReceiptContext = createContext(null);

/**
 * Servicio global de comprobantes: cualquier pantalla llama a printReceipt(receipt)
 * y se abre la vista previa con opción de imprimir (solo el comprobante) o enviar por WhatsApp.
 */
export function ReceiptProvider({ children }) {
  const [receipt, setReceipt] = useState(null);
  const printReceipt = useCallback((data) => setReceipt(data), []);

  return (
    <ReceiptContext.Provider value={{ printReceipt }}>
      {children}
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </ReceiptContext.Provider>
  );
}

export function useReceipt() {
  const ctx = useContext(ReceiptContext);
  if (!ctx) throw new Error('useReceipt debe usarse dentro de ReceiptProvider');
  return ctx;
}

function ReceiptModal({ receipt, onClose }) {
  const { hotelInfo } = useGlobalStore();
  const previewRef = useRef(null);
  const [phone, setPhone] = useState('');
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  if (!receipt) return null;

  // Imprime SOLO el comprobante en una ventana aparte (el HTML viene del render de React, ya escapado)
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) {
      alert('Permite las ventanas emergentes para imprimir el comprobante.');
      return;
    }
    win.document.open();
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprobante</title>` +
        `<style>@page { size: 80mm auto; margin: 4mm; } body { margin: 0; } ${RECEIPT_CSS}</style></head><body></body></html>`
    );
    win.document.close();
    win.document.body.innerHTML = previewRef.current.innerHTML;
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  const handleWhatsApp = () => {
    const digits = phone.replace(/\D/g, '');
    const lines = [
      `*${hotelInfo?.trade_name || 'Hotel'}*`,
      receipt.voucher_number ? `Comprobante: ${receipt.voucher_number}` : null,
      receipt.customer?.name ? `Cliente: ${receipt.customer.name}` : null,
      receipt.room_number ? `Habitación: ${receipt.room_number}` : null,
      ...(receipt.items || []).map((i) => `• ${i.description}: ${formatPEN(i.amount)}`),
      `*Total: ${formatPEN(receipt.total)}*`,
      '¡Gracias por su preferencia!'
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join('\n'));
    window.open(digits ? `https://wa.me/51${digits}?text=${text}` : `https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <Modal isOpen={!!receipt} onClose={onClose} title="Comprobante (80mm)" maxWidth="max-w-md">
      <div className="space-y-4">
        <style>{RECEIPT_CSS}</style>
        <div className="p-4 bg-white border border-slate-300 rounded-xl shadow-inner overflow-x-auto">
          <div ref={previewRef}>
            <ReceiptDocument receipt={receipt} hotelInfo={hotelInfo} />
          </div>
        </div>

        {showWhatsApp && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-emerald-800">WhatsApp del cliente (Perú)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 987654321"
                className="flex-1 bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowWhatsApp(!showWhatsApp)}
            className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-xl">
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md flex items-center gap-1.5"
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

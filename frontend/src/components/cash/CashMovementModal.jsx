import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/apiClient';
import { validateText, validateAmount } from '../../utils/validators';
import { ArrowDownLeft, ArrowUpRight, AlertCircle } from 'lucide-react';

export function CashMovementModal({ isOpen, onClose, onSuccess = () => {} }) {
  const [type, setType] = useState('income'); // income, expense
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // YAPE_PLIN, CASH, CARD
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Limpiar formulario al abrir
  useEffect(() => {
    if (isOpen) {
      setType('income');
      setConcept('');
      setAmount('');
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const conceptErr = validateText(concept, 'Concepto', 2, 150);
    const amountErr = validateAmount(amount, 'Monto');
    const firstErr = conceptErr || amountErr;
    if (firstErr) {
      setError(firstErr);
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/cash/transaction', {
        transaction_type: type,
        concept: concept.trim(),
        amount_pen: parseFloat(amount),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim()
      });
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar movimiento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Movimiento de Caja" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              type === 'income'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Ingreso S/</span>
          </button>

          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              type === 'expense'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Egreso S/</span>
          </button>
        </div>

        {/* Concepto */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Concepto / Motivo</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Ej: Pago de agua recepción o cobro directo"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Monto */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Monto en Soles (S/)</label>
          <input
            type="number"
            step="0.50"
            min="0.50"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Medio de Pago */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Medio de Pago</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          >
            <option value="CASH">Efectivo S/</option>
            <option value="YAPE_PLIN">Yape / Plin (QR)</option>
            <option value="CARD">Tarjeta POS</option>
          </select>
        </div>

        {/* Referencia */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">N° Operación / Voucher (Opcional)</label>
          <input
            type="text"
            placeholder="Ej: Op 984501"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando...' : 'Registrar Movimiento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS } from '../utils/formatters';
import { useShift } from '../context/ShiftContext';
import { validateText, validateAmount } from '../utils/validators';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  QrCode,
  CreditCard,
  AlertCircle
} from 'lucide-react';

export function CashPage() {
  const { hasActiveShift } = useShift();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulario de movimiento rápido
  const [type, setType] = useState('income'); // income, expense
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // YAPE_PLIN, CASH, CARD
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cash/transactions');
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Error cargando transacciones de caja:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCreateTransaction = async (e) => {
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

      setConcept('');
      setAmount('');
      setReferenceNumber('');
      await fetchTransactions();
    } catch (err) {
      setError(err.message || 'Error al registrar movimiento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Totales financieros del turno
  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>Caja Chica & Movimientos (Perú)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Registro de ingresos por alquileres/tienda y egresos autorizados en Soles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Nuevo Movimiento de Caja</span>
          </h3>

          {!hasActiveShift && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Debes abrir un turno para registrar movimientos.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateTransaction} className="space-y-4">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">N° Operación / Vaucher (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Op 984501"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !hasActiveShift}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Guardando...' : 'Registrar Movimiento'}
            </button>
          </form>
        </div>

        {/* Historial y Tabla */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Total Ingresos</span>
              <p className="text-2xl font-black text-emerald-700 font-mono">{formatPEN(totalIncome)}</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-semibold text-rose-700 uppercase">Total Egresos</span>
              <p className="text-2xl font-black text-rose-700 font-mono">{formatPEN(totalExpense)}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Historial de Transacciones de Caja</h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Cargando movimientos...</div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No hay movimientos registrados en este turno.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Hora</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Concepto</th>
                      <th className="py-3 px-3">Medio Pago</th>
                      <th className="py-3 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-slate-600 font-mono">{formatDatePeru(t.created_at)}</td>
                        <td className="py-3 px-3">
                          {t.transaction_type === 'income' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Ingreso
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Egreso
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{t.concept}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPEN(t.amount_pen)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

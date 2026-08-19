import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS } from '../utils/formatters';
import { useShift } from '../context/ShiftContext';
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

    if (!concept.trim() || !amount) {
      setError('El concepto y el monto son obligatorios.');
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
      setError(err.message || 'Error registrando movimiento de caja.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <span>Movimientos de Caja & Cobros (Perú)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Registro de cobros, egresos varios y auditoría de transacciones en Soles (S/).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro Rápido */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Registrar Movimiento Manual</span>
          </h3>

          {!hasActiveShift && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Debes abrir un turno para registrar movimientos de caja.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateTransaction} className="space-y-3">
            {/* Tipo: Ingreso / Egreso */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Ingreso (+S/)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                <span>Egreso (-S/)</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Concepto / Motivo</label>
              <input
                type="text"
                required
                placeholder="Ej: Pago de hospedaje adicional, compra de útiles de aseo..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Monto (S/)</label>
                <input
                  type="number"
                  step="0.50"
                  min="0.10"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Nro. Ref. / Voucher</label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Medio de Pago */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Medio de Pago</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('YAPE_PLIN')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'YAPE_PLIN'
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>Yape/Plin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Wallet className="w-3 h-3" />
                  <span>Efectivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CARD'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Tarjeta</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !hasActiveShift}
              className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-xs flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Guardando...' : 'Registrar en Caja'}</span>
            </button>
          </form>
        </div>

        {/* Tabla de Movimientos */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Últimos Movimientos de Caja</h3>
            <button
              onClick={fetchTransactions}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Refrescar
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Cargando transacciones...</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No hay movimientos registrados.</div>
          ) : (
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 bg-slate-900">
                  <tr>
                    <th className="py-2.5 px-3">Fecha / Hora</th>
                    <th className="py-2.5 px-3">Concepto</th>
                    <th className="py-2.5 px-3">Medio</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3 text-right">Monto (S/)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.map((tx) => {
                    const isIncome = tx.transaction_type === 'income';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {formatDatePeru(tx.created_at)}
                        </td>
                        <td className="py-2.5 px-3 text-white font-medium">
                          {tx.concept}
                          {tx.reference_number && (
                            <span className="block text-[10px] font-mono text-slate-500">
                              Ref: {tx.reference_number}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {PAYMENT_METHOD_LABELS[tx.payment_method] || tx.payment_method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {tx.user_full_name}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isIncome ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isIncome ? `+${formatPEN(tx.amount_pen)}` : `-${formatPEN(tx.amount_pen)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS, printElectronicVoucherTicket } from '../utils/formatters';
import { useShift } from '../context/ShiftContext';
import { validateText, validateAmount } from '../utils/validators';
import { EmitVoucherModal } from '../components/EmitVoucherModal';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  QrCode,
  CreditCard,
  AlertCircle,
  Ban,
  ShieldAlert,
  FileText,
  Printer
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

  // Modal para emitir/re-imprimir comprobante
  const [selectedVoucherTx, setSelectedVoucherTx] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

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

  const handleCancelTransaction = async (t) => {
    const reason = window.prompt(`Motivo de anulación para "${t.concept}":`, 'Error de marcado o devolución');
    if (reason === null) return; // Cancelado

    const cleanReason = reason.trim() || 'Anulación por el usuario';

    try {
      await api.patch(`/cash/transactions/${t.id}/cancel`, { reason: cleanReason });
      await fetchTransactions();
    } catch (err) {
      alert(err.message || 'Error al anular transacción.');
    }
  };

  // Totales financieros del turno (Excluyendo movimientos anulados)
  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income' && !t.is_cancelled)
    .reduce((sum, t) => sum + Number(t.amount_pen || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense' && !t.is_cancelled)
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
            Registro de ingresos por alquileres/tienda, egresos autorizados y anulación de movimientos.
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">N° Operación / Voucher (Opcional)</label>
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
              <span className="text-xs font-semibold text-emerald-700 uppercase">Total Ingresos Activos</span>
              <p className="text-2xl font-black text-emerald-700 font-mono">{formatPEN(totalIncome)}</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-semibold text-rose-700 uppercase">Total Egresos Activos</span>
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
                      <th className="py-3 px-3">Comprobante SUNAT</th>
                      <th className="py-3 px-3 text-right">Monto</th>
                      <th className="py-3 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${t.is_cancelled ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-3 px-3 text-slate-600 font-mono">{formatDatePeru(t.created_at)}</td>
                        <td className="py-3 px-3">
                          {t.is_cancelled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 line-through border border-slate-300">
                              Anulado
                            </span>
                          ) : t.transaction_type === 'income' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Ingreso
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Egreso
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <span className={t.is_cancelled ? 'line-through text-slate-400' : ''}>
                            {t.concept}
                          </span>
                          {t.is_cancelled && t.cancellation_reason && (
                            <span className="block text-[10px] text-rose-600 font-normal">
                              Motivo: {t.cancellation_reason}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          {PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method}
                        </td>

                        {/* Columna Comprobante SUNAT */}
                        <td className="py-3 px-3">
                          {t.voucher_type && t.voucher_type !== 'NONE' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const isFactura = t.voucher_type === 'FACTURA';
                                printElectronicVoucherTicket({
                                  voucherType: t.voucher_type,
                                  voucherSeries: (t.voucher_number || '').split('-')[0] || (isFactura ? 'F001' : 'B001'),
                                  voucherNumber: (t.voucher_number || '').split('-')[1] || '000001',
                                  customerDocType: isFactura ? 'RUC' : 'DNI',
                                  customerDocNumber: isFactura ? t.customer_ruc : '',
                                  customerName: isFactura ? t.customer_business_name : t.concept,
                                  paymentMethod: t.payment_method,
                                  totalAmount: t.amount_pen,
                                  items: [{ qty: 1, description: t.concept, price: t.amount_pen }]
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 transition-colors"
                              title="Re-imprimir comprobante electrónico 80mm"
                            >
                              <Printer className="w-3 h-3 text-indigo-600" />
                              <span>{t.voucher_type === 'FACTURA' ? '🏢 FACTURA' : '📄 BOLETA'} {t.voucher_number || 'E-001'}</span>
                            </button>
                          ) : t.transaction_type === 'income' && !t.is_cancelled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVoucherTx(t);
                                setIsVoucherModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 transition-colors shadow-2xs"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>+ Emitir Comprobante</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Ticket Interno</span>
                          )}
                        </td>

                        <td className={`py-3 px-3 text-right font-mono font-bold ${t.is_cancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {formatPEN(t.amount_pen)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {!t.is_cancelled ? (
                            <button
                              onClick={() => handleCancelTransaction(t)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[10px] border border-rose-200 transition-colors inline-flex items-center gap-1"
                              title="Anular movimiento y revertir de caja/hospedaje"
                            >
                              <Ban className="w-3 h-3 text-rose-600" />
                              <span>Anular</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Anulado</span>
                          )}
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

      {/* Modal para emitir/re-imprimir comprobante electrónico */}
      <EmitVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedVoucherTx(null);
        }}
        transaction={selectedVoucherTx}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}

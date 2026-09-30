import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS, printElectronicVoucherTicket } from '../utils/formatters';
import { useShift } from '../context/ShiftContext';
import { EmitVoucherModal } from '../components/EmitVoucherModal';
import { CashMovementModal } from '../components/CashMovementModal';
import {
  Wallet,
  Plus,
  AlertCircle,
  Ban,
  FileText,
  Printer,
  Lock,
  Unlock
} from 'lucide-react';

export function CashPage({ onOpenShiftModal = () => {}, onCloseShiftModal = () => {} }) {
  const { activeShift, hasActiveShift } = useShift();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de movimiento de caja
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

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

        {/* Apertura / Cierre de Turno */}
        {hasActiveShift ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsMovementModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Movimiento de Caja</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              <span className="font-semibold">Turno abierto · Fondo inicial:</span>
              <span className="font-mono font-bold text-emerald-800">
                {formatPEN(activeShift.initial_cash_pen || 0)}
              </span>
            </div>
            <button
              onClick={onCloseShiftModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar Turno</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition-colors flex items-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Abrir Turno</span>
          </button>
        )}
      </div>

      {!hasActiveShift && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Debes abrir un turno para registrar movimientos.</span>
        </div>
      )}

      {/* Historial y Tabla */}
      <div className="space-y-4">
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
                            <span>Emitir Comprobante</span>
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

      <CashMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}

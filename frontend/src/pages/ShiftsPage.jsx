import React, { useState, useEffect } from 'react';
import { useShift } from '../context/ShiftContext';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { TicketPrintModal } from '../components/TicketPrintModal';
import {
  Clock,
  Wallet,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  AlertCircle,
  BedDouble,
  ShoppingBag,
  ShieldAlert,
  ArrowDownCircle,
  Receipt
} from 'lucide-react';

export function ShiftsPage({ onOpenShiftModal = () => {}, onCloseShiftModal = () => {} }) {
  const { activeShift, hasActiveShift } = useShift();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Ticket Modal de Arqueo
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/shifts/history');
      setHistory(res.data || []);
    } catch (err) {
      console.error('Error cargando historial de turnos:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchActiveTransactions = async () => {
    if (!hasActiveShift) return;
    try {
      setLoadingTransactions(true);
      const res = await api.get('/shifts/active/transactions');
      setActiveTransactions(res.data || []);
    } catch (err) {
      console.error('Error cargando transacciones de turno:', err.message);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    if (hasActiveShift) {
      fetchActiveTransactions();
    }
  }, [activeShift, hasActiveShift]);

  const handlePrintShiftTicket = (shiftInfo) => {
    const data = {
      ticket_number: `ARQ-${shiftInfo.id?.substring(0, 6) || Date.now().toString().slice(-6)}`,
      date: shiftInfo.closed_at || new Date(),
      customer_name: `Cajero: ${shiftInfo.user_full_name}`,
      room_number: `RELEVO CAJA`,
      total_amount: Number(shiftInfo.total_revenue_pen || 0),
      payment_method: 'Resumen de Arqueo',
      items: [
        { name: 'Fondo Inicial', quantity: 1, unit_price: Number(shiftInfo.initial_cash_pen || 0), total_price: Number(shiftInfo.initial_cash_pen || 0) },
        { name: 'Efectivo Esperado', quantity: 1, unit_price: Number(shiftInfo.expected_cash_pen || 0), total_price: Number(shiftInfo.expected_cash_pen || 0) },
        { name: 'Efectivo Real Contado', quantity: 1, unit_price: Number(shiftInfo.actual_cash_pen || 0), total_price: Number(shiftInfo.actual_cash_pen || 0) },
        { name: 'Yape / Plin Total', quantity: 1, unit_price: Number(shiftInfo.total_yape_plin_pen || 0), total_price: Number(shiftInfo.total_yape_plin_pen || 0) },
        { name: 'Tarjetas POS Total', quantity: 1, unit_price: Number(shiftInfo.total_card_pen || 0), total_price: Number(shiftInfo.total_card_pen || 0) },
        { name: 'Diferencia de Cierre', quantity: 1, unit_price: Number(shiftInfo.difference_pen || 0), total_price: Number(shiftInfo.difference_pen || 0) }
      ]
    };
    setTicketData(data);
    setIsTicketOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>Módulo de Turnos y Arqueo de Caja (Perú)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control de aperturas, cierres de guardia, arqueo físico en Soles (S/) y cuadre de caja.
          </p>
        </div>

        {/* Action Button */}
        <div>
          {hasActiveShift ? (
            <button
              onClick={onCloseShiftModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Realizar Cierre y Arqueo</span>
            </button>
          ) : (
            <button
              onClick={onOpenShiftModal}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span>+ Abrir Nuevo Turno</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Dashboard Panel */}
      {hasActiveShift ? (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Turno Activo: {activeShift.user_full_name} (@{activeShift.user_username})
                </h3>
                <p className="text-xs text-slate-500">
                  Iniciado el: <strong className="text-slate-800">{formatDatePeru(activeShift.opened_at)}</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">Fondo Base Inicial:</span>
              <p className="text-lg font-black text-emerald-700 font-mono">
                {formatPEN(activeShift.initial_cash_pen)}
              </p>
            </div>
          </div>

          {/* Metrics Grid por Métodos de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                <span>Efectivo en Gaveta</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {formatPEN(activeShift.live_expected_cash_pen)}
              </p>
              <p className="text-[11px] text-slate-500">Fondo inicial + ingresos en efectivo</p>
            </div>

            <div className="p-4 bg-violet-50/50 border border-violet-200 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs text-violet-700 font-bold">
                <span>Yape / Plin (Billeteras)</span>
                <QrCode className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {formatPEN(activeShift.live_total_yape_plin_pen)}
              </p>
              <p className="text-[11px] text-slate-500">Pagos vía QR / Móvil</p>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs text-blue-700 font-bold">
                <span>Tarjetas POS</span>
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {formatPEN(activeShift.live_total_card_pen)}
              </p>
              <p className="text-[11px] text-slate-500">Débito / Crédito en terminal</p>
            </div>

            <div className="p-4 bg-emerald-600 text-white rounded-2xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
                <span>Total Facturado</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black font-mono">
                {formatPEN(activeShift.live_total_revenue_pen)}
              </p>
              <p className="text-[11px] text-emerald-100/90">Suma de los 3 métodos de pago</p>
            </div>
          </div>

          {/* Desglose por Categoría de Ingreso */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Desglose de Ingresos por Origen
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Hospedaje / Check-ins</span>
                  <strong className="text-sm font-mono text-emerald-700">
                    {formatPEN(activeShift.live_revenue_stay || 0)}
                  </strong>
                </div>
                <BedDouble className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Ventas de Tienda</span>
                  <strong className="text-sm font-mono text-blue-700">
                    {formatPEN(activeShift.live_revenue_store || 0)}
                  </strong>
                </div>
                <ShoppingBag className="w-4 h-4 text-blue-600" />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Incidentes / Penalidad</span>
                  <strong className="text-sm font-mono text-violet-700">
                    {formatPEN(activeShift.live_revenue_incidents || 0)}
                  </strong>
                </div>
                <ShieldAlert className="w-4 h-4 text-violet-600" />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Egresos / Gastos</span>
                  <strong className="text-sm font-mono text-rose-700">
                    -{formatPEN(activeShift.live_total_expenses || 0)}
                  </strong>
                </div>
                <ArrowDownCircle className="w-4 h-4 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Tabla de Movimientos del Turno Activo en Vivo */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Movimientos en Vivo Registrados en la Guardia</span>
            </h4>
            {loadingTransactions ? (
              <div className="py-4 text-center text-xs text-slate-400">Cargando transacciones en vivo...</div>
            ) : activeTransactions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Aún no hay movimientos en este turno.</div>
            ) : (
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-400 uppercase text-[9px] tracking-wider sticky top-0 bg-white">
                    <tr>
                      <th className="py-2 px-2">Hora</th>
                      <th className="py-2 px-2">Concepto</th>
                      <th className="py-2 px-2">Medio Pago</th>
                      <th className="py-2 px-2 text-right">Monto (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-mono text-slate-500">{formatDatePeru(t.created_at)}</td>
                        <td className="py-2 px-2 font-semibold text-slate-800">{t.concept}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.payment_method === 'YAPE_PLIN' ? 'bg-violet-100 text-violet-800' :
                            t.payment_method === 'CARD' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.payment_method === 'YAPE_PLIN' ? 'Yape/Plin' : t.payment_method === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                          </span>
                        </td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${t.transaction_type === 'expense' ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {t.transaction_type === 'expense' ? `-` : `+`}{formatPEN(t.amount_pen)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No hay ningún turno de caja abierto en este momento</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Para registrar cobros de habitaciones o ventas en mostrador, debes iniciar un turno con tu fondo base inicial en Soles.
            </p>
          </div>
          <button
            onClick={onOpenShiftModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 mt-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Abrir Turno Ahora</span>
          </button>
        </div>
      )}

      {/* History Table */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span>Historial Reciente de Turnos Cerrados</span>
          </h3>
          <span className="text-xs text-slate-400">Arqueos y Auditoría</span>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando historial...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Aún no hay turnos cerrados registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Cajero</th>
                  <th className="py-3 px-3">Apertura</th>
                  <th className="py-3 px-3">Cierre</th>
                  <th className="py-3 px-3 text-right">Fondo Base</th>
                  <th className="py-3 px-3 text-right">Efectivo Esperado</th>
                  <th className="py-3 px-3 text-right">Efectivo Real</th>
                  <th className="py-3 px-3 text-right">Diferencia</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((s) => {
                  const diff = Number(s.difference_cash_pen || s.difference_pen || 0);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {s.user_full_name} <span className="text-slate-400 font-normal">(@{s.user_username})</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">{formatDatePeru(s.opened_at)}</td>
                      <td className="py-3 px-3 text-slate-600 font-mono">{formatDatePeru(s.closed_at)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">{formatPEN(s.initial_cash_pen)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">{formatPEN(s.expected_cash_pen)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatPEN(s.actual_cash_pen)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {diff === 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px]">
                            Cuadre Exacto
                          </span>
                        ) : diff > 0 ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-black text-[10px]">
                            +{formatPEN(diff)} (Sobrante)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                            {formatPEN(diff)} (Faltante)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handlePrintShiftTicket(s)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all"
                          title="Imprimir Ticket de Arqueo"
                        >
                          <Receipt className="w-3 h-3 text-slate-600" />
                          <span>Ticket</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Modal para Impresión de Arqueo */}
      <TicketPrintModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        ticketData={ticketData}
      />
    </div>
  );
}

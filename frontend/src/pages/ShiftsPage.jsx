import React, { useState, useEffect } from 'react';
import { useShift } from '../context/ShiftContext';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import {
  Clock,
  Wallet,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  History,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export function ShiftsPage({ onOpenShiftModal = () => {}, onCloseShiftModal = () => {} }) {
  const { activeShift, hasActiveShift } = useShift();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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

  useEffect(() => {
    fetchHistory();
  }, [activeShift]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Módulo de Turnos y Arqueo de Caja (Perú)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Control de aperturas, cierres de guardia, arqueo físico en Soles (S/) y cuadre de caja.
          </p>
        </div>

        {/* Action Button */}
        <div>
          {hasActiveShift ? (
            <button
              onClick={onCloseShiftModal}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Realizar Cierre y Arqueo</span>
            </button>
          ) : (
            <button
              onClick={onOpenShiftModal}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span>+ Abrir Nuevo Turno</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Dashboard Panel */}
      {hasActiveShift ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Turno Activo: {activeShift.user_full_name} (@{activeShift.user_username})
                </h3>
                <p className="text-xs text-slate-400">
                  Iniciado el: <strong className="text-slate-200">{formatDatePeru(activeShift.opened_at)}</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Fondo Base Inicial:</span>
              <p className="text-lg font-black text-emerald-400 font-mono">
                {formatPEN(activeShift.initial_cash_pen)}
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Efectivo Esperado en Caja */}
            <div className="p-4 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Efectivo en Gaveta</span>
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {formatPEN(activeShift.live_expected_cash_pen)}
              </p>
              <p className="text-[11px] text-slate-500">Fondo inicial + ingresos en efectivo</p>
            </div>

            {/* Yape / Plin */}
            <div className="p-4 bg-slate-950/80 border border-violet-500/30 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs text-violet-400 font-semibold">
                <span>Yape / Plin (Billeteras)</span>
                <QrCode className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {formatPEN(activeShift.live_total_yape_plin_pen)}
              </p>
              <p className="text-[11px] text-slate-500">Pagos vía QR / Móvil</p>
            </div>

            {/* Tarjetas POS */}
            <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
                <span>Tarjetas POS</span>
                <CreditCard className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {formatPEN(activeShift.live_total_card_pen)}
              </p>
              <p className="text-[11px] text-slate-500">Débito / Crédito en terminal</p>
            </div>

            {/* Total Recaudado en el Turno */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                <span>Total Facturado</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {formatPEN(activeShift.live_total_revenue_pen)}
              </p>
              <p className="text-[11px] text-emerald-300/80">Suma de los 3 métodos de pago</p>
            </div>
          </div>

          {activeShift.shift_notes && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span><strong>Notas de Recepción:</strong> {activeShift.shift_notes}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 bg-slate-900 border border-dashed border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No hay ningún turno de caja abierto en este momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Para registrar Check-in, consumos o cobros en el sistema, es obligatorio iniciar un turno con el fondo de caja en Soles.
          </p>
          <button
            onClick={onOpenShiftModal}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Abrir Turno Ahora</span>
          </button>
        </div>
      )}

      {/* Historial de Turnos y Cierres */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span>Historial de Guardias y Cierres de Turno</span>
          </h3>
          <button
            onClick={fetchHistory}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Actualizar
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-500">Cargando historial...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No hay turnos registrados en el historial.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Recepcionista</th>
                  <th className="py-3 px-3">Apertura</th>
                  <th className="py-3 px-3">Cierre</th>
                  <th className="py-3 px-3 text-right">Fondo Base</th>
                  <th className="py-3 px-3 text-right">Total Turno</th>
                  <th className="py-3 px-3 text-right">Esperado vs Físico</th>
                  <th className="py-3 px-3 text-center">Cuadre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((s) => {
                  const diff = Number(s.difference_cash_pen || 0);
                  const isClosed = s.status === 'closed';

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        {s.user_full_name}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {formatDatePeru(s.opened_at)}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {s.closed_at ? formatDatePeru(s.closed_at) : (
                          <span className="text-emerald-400 font-bold">Activo</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {formatPEN(s.initial_cash_pen)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {formatPEN(s.total_revenue_pen)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {isClosed ? (
                          <span>
                            {formatPEN(s.expected_cash_pen)} / <strong>{formatPEN(s.actual_cash_pen)}</strong>
                          </span>
                        ) : (
                          <span className="text-slate-500">En curso</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {!isClosed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Abierto
                          </span>
                        ) : Math.abs(diff) < 0.01 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Cuadrado
                          </span>
                        ) : diff > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Sobrante +{formatPEN(diff)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Faltante -{formatPEN(Math.abs(diff))}
                          </span>
                        )}
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
  );
}

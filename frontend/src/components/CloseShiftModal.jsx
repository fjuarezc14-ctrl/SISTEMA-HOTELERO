import React, { useState } from 'react';
import { Modal } from './Modal';
import { useShift } from '../context/ShiftContext';
import { formatPEN } from '../utils/formatters';
import { CheckCircle2, AlertTriangle, AlertCircle, Calculator } from 'lucide-react';

export function CloseShiftModal({ isOpen, onClose }) {
  const { activeShift, closeShift } = useShift();
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!activeShift) return null;

  const expectedCash = Number(activeShift.live_expected_cash_pen || activeShift.initial_cash_pen || 0);
  const actualCashNum = parseFloat(actualCash) || 0;
  const difference = actualCash ? actualCashNum - expectedCash : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (actualCash === '' || isNaN(actualCashNum) || actualCashNum < 0) {
      setError('Por favor ingresa el monto de efectivo contado en caja.');
      return;
    }

    try {
      setLoading(true);
      await closeShift(activeShift.id, actualCashNum, notes);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al cerrar el turno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cierre y Arqueo de Turno (Perú)" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resumen del Sistema */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Efectivo Esperado</p>
            <p className="text-base font-bold text-emerald-400 mt-0.5">{formatPEN(expectedCash)}</p>
          </div>
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Yape / Plin</p>
            <p className="text-base font-bold text-violet-400 mt-0.5">
              {formatPEN(activeShift.live_total_yape_plin_pen || 0)}
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tarjetas POS</p>
            <p className="text-base font-bold text-blue-400 mt-0.5">
              {formatPEN(activeShift.live_total_card_pen || 0)}
            </p>
          </div>
        </div>

        {/* Campo de Conteo Físico */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Efectivo Real Contado en Gaveta (S/)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
              S/
            </span>
            <input
              type="number"
              step="0.10"
              min="0"
              required
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-lg font-bold focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
              autoFocus
            />
          </div>

          {/* Comparación y Diferencia en Vivo */}
          {actualCash !== '' && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                Math.abs(difference) < 0.01
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : difference > 0
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {Math.abs(difference) < 0.01 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>
                  {Math.abs(difference) < 0.01
                    ? 'Caja Cuadrada Exacta'
                    : difference > 0
                    ? `Sobrante en Caja: +${formatPEN(difference)}`
                    : `Faltante en Caja: -${formatPEN(Math.abs(difference))}`}
                </span>
              </div>
              <span className="font-mono">{formatPEN(actualCashNum)}</span>
            </div>
          )}
        </div>

        {/* Novedades del Turno */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Novedades / Observaciones de Entrega
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            placeholder="Detalles sobre huéspedes, pendientes para el relevo o justificación de diferencias..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            <span>{loading ? 'Cerrando...' : 'Confirmar Cierre de Turno'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

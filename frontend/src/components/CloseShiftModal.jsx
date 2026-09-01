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
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Resumen del Sistema */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Efectivo Esperado</p>
            <p className="text-base font-bold text-emerald-700 mt-0.5">{formatPEN(expectedCash)}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Yape / Plin</p>
            <p className="text-base font-bold text-violet-700 mt-0.5">
              {formatPEN(activeShift.live_total_yape_plin_pen || 0)}
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Tarjetas POS</p>
            <p className="text-base font-bold text-blue-700 mt-0.5">
              {formatPEN(activeShift.live_total_card_pen || 0)}
            </p>
          </div>
        </div>

        {/* Campo de Conteo Físico */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Efectivo Real Contado en Gaveta (S/)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
              S/
            </span>
            <input
              type="number"
              step="0.10"
              min="0"
              required
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-lg font-bold focus:outline-none focus:border-emerald-600"
              placeholder="0.00"
              autoFocus
            />
          </div>

          {/* Comparación y Diferencia en Vivo */}
          {actualCash !== '' && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                Math.abs(difference) < 0.01
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : difference > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {Math.abs(difference) < 0.01 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Novedades / Observaciones de Entrega
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
            placeholder="Detalles sobre huéspedes, pendientes para el relevo o justificación de diferencias..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            <span>{loading ? 'Cerrando...' : 'Confirmar Cierre de Turno'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

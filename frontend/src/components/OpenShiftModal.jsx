import React, { useState } from 'react';
import { Modal } from './Modal';
import { useShift } from '../context/ShiftContext';
import { Wallet, AlertCircle } from 'lucide-react';

export function OpenShiftModal({ isOpen, onClose }) {
  const { openShift } = useShift();
  const [initialCash, setInitialCash] = useState('50.00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cashNum = parseFloat(initialCash);
    if (isNaN(cashNum) || cashNum < 0) {
      setError('Por favor ingresa un monto válido de fondo inicial en Soles.');
      return;
    }

    try {
      setLoading(true);
      await openShift(cashNum, notes);
      onClose();
    } catch (err) {
      setError(err.message || 'Error abriendo turno de caja.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apertura de Turno de Caja (Perú)">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Fondo Inicial en Efectivo (Caja Chica S/)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
              S/
            </span>
            <input
              type="number"
              step="0.50"
              min="0"
              required
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-base font-bold focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Monto de cambio/sencillo disponible físicamente en gaveta al iniciar el turno.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Observaciones Iniciales (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            placeholder="Ej: Recepción del turno mañana sin novedades, llaves completas..."
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
            className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>{loading ? 'Abriendo...' : 'Iniciar Turno'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

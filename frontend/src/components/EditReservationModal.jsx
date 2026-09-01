import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { validateAmount, validateDate, validateDateRange } from '../utils/validators';
import { Calendar, AlertCircle, Check, Edit2 } from 'lucide-react';

export function EditReservationModal({ isOpen, onClose, reservation = null, rooms = [], onSuccess }) {
  const [roomId, setRoomId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('0.00');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && reservation) {
      setRoomId(reservation.room_id || '');
      setDepositAmount(String(reservation.deposit_amount_pen || '0.00'));
      setNotes(reservation.notes || '');

      const toISOStringLocal = (dStr) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      setStartDate(toISOStringLocal(reservation.start_date));
      setEndDate(toISOStringLocal(reservation.end_date));
      setError('');
    }
  }, [isOpen, reservation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const startErr = validateDate(startDate, 'Fecha de llegada', false);
    const endErr = validateDate(endDate, 'Fecha de salida', false);
    const rangeErr = startDate && endDate ? validateDateRange(startDate, endDate) : null;
    const firstErr = startErr || endErr || rangeErr;
    if (firstErr) {
      setError(firstErr);
      return;
    }

    try {
      setSaving(true);
      await api.put(`/reservations/${reservation.id}`, {
        room_id: roomId,
        start_date: startDate,
        end_date: endDate,
        deposit_amount_pen: parseFloat(depositAmount) || 0,
        notes: notes.trim()
      });

      alert('✅ Reserva reprogramada y actualizada correctamente.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error actualizando reserva.');
    } finally {
      setSaving(false);
    }
  };

  if (!reservation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar / Reprogramar Reserva — Hab. ${reservation.room_number}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
          <span className="text-slate-500 font-medium">Huésped:</span>
          <strong className="text-slate-900 block text-sm">{reservation.customer_name}</strong>
          <span className="text-slate-400 font-mono">{reservation.customer_document}</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Reasignar Habitación</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Hab. {r.room_number} — {r.room_type_name} (Piso {r.floor})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Entrada</label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Salida</label>
            <input
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Abono / Adelanto Registrado (S/)</label>
          <input
            type="number"
            step="0.50"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notas u Observaciones</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

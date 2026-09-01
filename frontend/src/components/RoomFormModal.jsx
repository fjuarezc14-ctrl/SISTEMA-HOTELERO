import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { useGlobalStore } from '../context/GlobalStoreContext';
import { validateText, validateQuantity } from '../utils/validators';
import { Bed, Plus, AlertCircle, Check, Settings } from 'lucide-react';

export function RoomFormModal({ isOpen, onClose, room = null, onSuccess }) {
  const { getRoomTypes } = useGlobalStore();
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [floor, setFloor] = useState(1);
  const [status, setStatus] = useState('available');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const loadTypes = async () => {
        try {
          const types = await getRoomTypes();
          setRoomTypes(types || []);
          if (types && types.length > 0 && !roomTypeId) {
            setRoomTypeId(types[0].id);
          }
        } catch (err) {
          console.error('Error cargando tipos de habitación:', err.message);
        }
      };
      loadTypes();

      if (room) {
        setRoomNumber(room.room_number || '');
        setRoomTypeId(room.room_type_id || '');
        setFloor(room.floor || 1);
        setStatus(room.status || 'available');
        setNotes(room.notes || '');
      } else {
        setRoomNumber('');
        setFloor(1);
        setStatus('available');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, room, getRoomTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numErr = validateText(roomNumber, 'Número de habitación', 1, 10);
    const floorErr = validateQuantity(floor, 'Piso', 1, 99);
    const firstErr = numErr || floorErr;
    if (firstErr) {
      setError(firstErr);
      return;
    }

    if (!roomTypeId) {
      setError('Debes seleccionar el tipo/categoría de habitación.');
      return;
    }

    try {
      setSaving(true);
      if (room) {
        await api.put(`/rooms/${room.id}`, {
          room_number: roomNumber.trim(),
          room_type_id: roomTypeId,
          floor: Number(floor),
          status,
          notes: notes.trim()
        });
        alert(`✅ Habitación ${roomNumber} actualizada con éxito.`);
      } else {
        await api.post('/rooms', {
          room_number: roomNumber.trim(),
          room_type_id: roomTypeId,
          floor: Number(floor),
          status: 'available',
          notes: notes.trim()
        });
        alert(`✅ Habitación ${roomNumber} registrada con éxito.`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la habitación.');
    } finally {
      setSaving(false);
    }
  };

  const isOccupied = room && room.status === 'occupied';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={room ? `Editar Habitación ${room.room_number}` : 'Crear Nueva Habitación'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {isOccupied && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Habitación Ocupada por: {room.customer_name}</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Los cambios que realices en la tarifa o categoría aplicarán <strong>únicamente para futuros Check-ins</strong>. La cuenta actual de la estadía activa no se alterará de forma retroactiva.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nro. Habitación</label>
            <input
              type="text"
              required
              placeholder="Ej: 101, 204"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Piso</label>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría / Tipo de Habitación</label>
          <select
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
          >
            {roomTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (S/{t.price_hours_default} 3h | S/{t.price_overnight_default} Noche)
              </option>
            ))}
          </select>
        </div>

        {room && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de Habitación</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              <option value="available">Disponible (Libre)</option>
              <option value="occupied">Ocupada</option>
              <option value="cleaning">En Limpieza</option>
              <option value="maintenance">Mantenimiento / Bloqueada</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Equipamiento & Características (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Jacuzzi hidromasaje, Cama King, Smart TV 55', Vista a la calle, Aire Acondicionado..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : room ? 'Actualizar Habitación' : 'Crear Habitación'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

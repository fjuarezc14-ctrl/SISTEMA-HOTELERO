import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { useGlobalStore } from '../context/GlobalStoreContext';
import { validateText, validateQuantity } from '../utils/validators';
import { formatPEN } from '../utils/formatters';
import {
  BedDouble,
  Sparkles,
  Layers,
  AlertCircle,
  Check,
  Building,
  Eye,
  Tag,
  Hash
} from 'lucide-react';

const QUICK_AMENITIES = [
  'WiFi 5G',
  'Smart TV 55"',
  'Aire Acondicionado',
  'Jacuzzi Hidromasaje',
  'Agua Caliente',
  'Cama King Size',
  'Frigobar',
  'Vista Exterior'
];

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

  const toggleAmenity = (amenity) => {
    const currentItems = notes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = currentItems.some((item) => item.toLowerCase() === amenity.toLowerCase());
    let updated;
    if (exists) {
      updated = currentItems.filter((item) => item.toLowerCase() !== amenity.toLowerCase());
    } else {
      updated = [...currentItems, amenity];
    }
    setNotes(updated.join(', '));
  };

  const isAmenityActive = (amenity) => {
    return notes
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .includes(amenity.toLowerCase());
  };

  const selectedType = roomTypes.find((t) => t.id === roomTypeId);

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
        const targetStatus = isOccupied ? room.status : status;
        await api.put(`/rooms/${room.id}`, {
          room_number: roomNumber.trim(),
          room_type_id: roomTypeId,
          floor: Number(floor),
          status: targetStatus,
          notes: notes.trim()
        });
        if (!isOccupied && targetStatus !== room.status) {
          await api.patch(`/rooms/${room.id}/status`, { status: targetStatus });
        }
      } else {
        await api.post('/rooms', {
          room_number: roomNumber.trim(),
          room_type_id: roomTypeId,
          floor: Number(floor),
          status: 'available',
          notes: notes.trim()
        });
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
      title={room ? `Editar Habitación ${room.room_number}` : 'Nueva Habitación'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
              Los cambios que realices en la tarifa o categoría aplicarán <strong>únicamente para futuros Check-ins</strong>. La cuenta actual de la estadía activa no se alterará.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Columna Izquierda: Formulario (7 columnas) */}
          <div className="md:col-span-7 space-y-4">
            {/* Número y Piso */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nro. Habitación</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Hab.
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="101"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-black focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Piso</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                    Nivel
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Categoría / Tipo de Habitación */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Categoría / Tipo de Habitación</span>
              </label>
              <select
                value={roomTypeId}
                onChange={(e) => setRoomTypeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
              >
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (S/{t.price_hours_default} base · S/{t.price_overnight_default} noche)
                  </option>
                ))}
              </select>
            </div>

            {/* Estado (solo al editar) */}
            {room && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado de Habitación</label>
                {isOccupied ? (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                    🔴 Ocupada actualmente (cambia tras check-out).
                  </div>
                ) : (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="available">🟢 Disponible (Libre para alquilar)</option>
                    <option value="cleaning">🟡 En Limpieza / Aseo</option>
                    <option value="maintenance">⚪ En Mantenimiento / Bloqueada</option>
                  </select>
                )}
              </div>
            )}

            {/* Chips rápidos de equipamiento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Comodidades Rápidas (Clic para activar)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_AMENITIES.map((amenity) => {
                  const active = isAmenityActive(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      {active ? `✓ ${amenity}` : `+ ${amenity}`}
                    </button>
                  );
                })}
              </div>

              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Equipamiento adicional: ej. Cama Queen, Frigobar, Tina..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Columna Derecha: Vista Previa en Vivo (5 columnas) */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vista Previa en Panel</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 font-bold text-slate-600">
                Piso {floor || 1}
              </span>
            </div>

            {/* Tarjeta simulada de habitación */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                    Habitación
                  </span>
                  <p className="text-2xl font-black font-mono text-slate-900 leading-none mt-0.5">
                    {roomNumber ? roomNumber.trim() : '—'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {room ? (status === 'cleaning' ? 'Limpieza' : status === 'maintenance' ? 'Mantenimiento' : 'Disponible') : 'Disponible'}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5" />
                  {selectedType?.name || 'Categoría no seleccionada'}
                </span>
                {selectedType && (
                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Horas ({selectedType.hours_quantity_default || 3}h)</span>
                      <strong>{formatPEN(selectedType.price_hours_default)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Noche</span>
                      <strong>{formatPEN(selectedType.price_overnight_default)}</strong>
                    </div>
                  </div>
                )}
              </div>

              {notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 block mb-1">Equipamiento registrado:</span>
                  <div className="flex flex-wrap gap-1">
                    {notes
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((item, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    {notes.split(',').filter(Boolean).length > 4 && (
                      <span className="text-[10px] text-slate-400 font-bold self-center">
                        +{notes.split(',').filter(Boolean).length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-tight">
              Así se visualizará la habitación en la cuadrícula principal de recepción.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : room ? 'Guardar Cambios' : 'Registrar Habitación'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

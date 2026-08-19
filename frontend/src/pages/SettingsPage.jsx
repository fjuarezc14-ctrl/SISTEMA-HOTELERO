import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { Sliders, Bed, Hotel, Edit2, Plus, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('rates'); // rates, rooms, hotel
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hotelInfo, setHotelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal Editar Tarifas
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [priceHours, setPriceHours] = useState('');
  const [priceOvernight, setPriceOvernight] = useState('');
  const [priceFullDay, setPriceFullDay] = useState('');
  const [priceExtraHour, setPriceExtraHour] = useState('');
  const [hoursCount, setHoursCount] = useState(3);
  const [savingRates, setSavingRates] = useState(false);
  const [ratesError, setRatesError] = useState('');

  // Modal Crear Habitación
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomError, setRoomError] = useState('');

  // Form Hotel Info
  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [ruc, setRuc] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [savingHotel, setSavingHotel] = useState(false);
  const [hotelSuccess, setHotelSuccess] = useState('');
  const [hotelError, setHotelError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typesRes, roomsRes, infoRes] = await Promise.all([
        api.get('/rooms/types'),
        api.get('/rooms'),
        api.get('/settings/hotel-info')
      ]);
      setRoomTypes(typesRes.data || []);
      setRooms(roomsRes.data || []);
      if (infoRes.data) {
        setHotelInfo(infoRes.data);
        setBusinessName(infoRes.data.business_name || '');
        setTradeName(infoRes.data.trade_name || '');
        setRuc(infoRes.data.ruc || '');
        setAddress(infoRes.data.address || '');
        setPhone(infoRes.data.phone || '');
      }
    } catch (err) {
      console.error('Error cargando configuración:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEditRates = (type) => {
    setEditingType(type);
    setPriceHours(type.price_hours_default);
    setPriceOvernight(type.price_overnight_default);
    setPriceFullDay(type.price_full_day_default);
    setPriceExtraHour(type.price_extra_hour_default);
    setHoursCount(type.hours_quantity_default || 3);
    setRatesError('');
    setIsRatesModalOpen(true);
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    setRatesError('');
    try {
      setSavingRates(true);
      await api.put(`/rooms/types/${editingType.id}/rates`, {
        price_hours_default: parseFloat(priceHours),
        price_overnight_default: parseFloat(priceOvernight),
        price_full_day_default: parseFloat(priceFullDay),
        price_extra_hour_default: parseFloat(priceExtraHour),
        hours_quantity_default: parseInt(hoursCount, 10)
      });
      setIsRatesModalOpen(false);
      await fetchData();
    } catch (err) {
      setRatesError(err.message || 'Error guardando tarifas.');
    } finally {
      setSavingRates(false);
    }
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setRoomError('');
    if (!newRoomNumber.trim() || !newRoomTypeId) {
      setRoomError('Número y tipo de habitación son obligatorios.');
      return;
    }

    try {
      setSavingRoom(true);
      await api.post('/rooms', {
        room_number: newRoomNumber.trim(),
        room_type_id: newRoomTypeId,
        floor: parseInt(newRoomFloor, 10) || 1
      });
      setIsRoomModalOpen(false);
      setNewRoomNumber('');
      await fetchData();
    } catch (err) {
      setRoomError(err.message || 'Error creando habitación.');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleSaveHotelInfo = async (e) => {
    e.preventDefault();
    setHotelError('');
    setHotelSuccess('');
    try {
      setSavingHotel(true);
      await api.put('/settings/hotel-info', {
        business_name: businessName.trim(),
        trade_name: tradeName.trim(),
        ruc: ruc.trim(),
        address: address.trim(),
        phone: phone.trim()
      });
      setHotelSuccess('Información fiscal y del hotel actualizada con éxito.');
    } catch (err) {
      setHotelError(err.message || 'Error guardando datos del hotel.');
    } finally {
      setSavingHotel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <span>Configuración de Tarifas, Habitaciones & Hotel</span>
        </h2>
        <p className="text-xs text-slate-400">
          Personaliza los precios por hora y pernocta en Soles, gestiona habitaciones y datos de RUC.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rates'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tarifas por Categoría (S/)
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rooms'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Gestión de Habitaciones
        </button>
        <button
          onClick={() => setActiveTab('hotel')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'hotel'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Datos de la Empresa / RUC
        </button>
      </div>

      {/* TAB 1: TARIFAS EDITABLES */}
      {activeTab === 'rates' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Tarifas por Defecto en Soles (PEN - S/)</h3>
            <span className="text-xs text-slate-400">Precios base aplicados al hacer Check-in</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomTypes.map((type) => (
              <div
                key={type.id}
                className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white">{type.name}</h4>
                  <button
                    onClick={() => handleOpenEditRates(type)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modificar Precios</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400">{type.description || 'Sin descripción'}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-xs">
                  <div className="p-2 bg-slate-900/80 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Horas ({type.hours_quantity_default}h)</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatPEN(type.price_hours_default)}</span>
                  </div>
                  <div className="p-2 bg-slate-900/80 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Pernocta</span>
                    <span className="font-bold text-indigo-400 text-sm">{formatPEN(type.price_overnight_default)}</span>
                  </div>
                  <div className="p-2 bg-slate-900/80 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Día Completo</span>
                    <span className="font-bold text-amber-400 text-sm">{formatPEN(type.price_full_day_default)}</span>
                  </div>
                  <div className="p-2 bg-slate-900/80 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Hora Extra</span>
                    <span className="font-bold text-slate-300 text-sm">{formatPEN(type.price_extra_hour_default)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HABITACIONES */}
      {activeTab === 'rooms' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Inventario de Habitaciones</h3>
            <button
              onClick={() => {
                if (roomTypes.length > 0) setNewRoomTypeId(roomTypes[0].id);
                setIsRoomModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Habitación</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Número</th>
                  <th className="py-3 px-3">Piso</th>
                  <th className="py-3 px-3">Tipo de Habitación</th>
                  <th className="py-3 px-3">Estado Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-black text-white text-sm">{r.room_number}</td>
                    <td className="py-3 px-3 text-slate-300">Piso {r.floor}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">{r.room_type_name}</td>
                    <td className="py-3 px-3 capitalize text-slate-300">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATOS DEL HOTEL */}
      {activeTab === 'hotel' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl max-w-2xl">
          <h3 className="text-sm font-bold text-white">Información Fiscal & Comercial (Perú)</h3>
          
          {hotelSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{hotelSuccess}</span>
            </div>
          )}

          {hotelError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{hotelError}</span>
            </div>
          )}

          <form onSubmit={handleSaveHotelInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Razón Social (SUNAT)</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">RUC (11 dígitos)</label>
                <input
                  type="text"
                  required
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dirección Fiscal</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono de Recepción</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingHotel}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <span>{savingHotel ? 'Guardando...' : 'Guardar Información del Hotel'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Modal Editar Tarifas */}
      <Modal
        isOpen={isRatesModalOpen}
        onClose={() => setIsRatesModalOpen(false)}
        title={`Modificar Tarifas: ${editingType?.name}`}
      >
        <form onSubmit={handleSaveRates} className="space-y-4">
          {ratesError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{ratesError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Horas Base</label>
              <input
                type="number"
                min="1"
                max="12"
                required
                value={hoursCount}
                onChange={(e) => setHoursCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tarifa por Horas (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceHours}
                onChange={(e) => setPriceHours(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pernocta (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceOvernight}
                onChange={(e) => setPriceOvernight(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-indigo-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Día Completo (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceFullDay}
                onChange={(e) => setPriceFullDay(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hora Extra (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceExtraHour}
                onChange={(e) => setPriceExtraHour(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRatesModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingRates}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              {savingRates ? 'Guardando...' : 'Guardar Tarifas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear Habitación */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title="Añadir Nueva Habitación"
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {roomError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{roomError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Habitación</label>
              <input
                type="text"
                required
                placeholder="Ej: 305"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Piso</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={newRoomFloor}
                onChange={(e) => setNewRoomFloor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría / Tipo</label>
            <select
              value={newRoomTypeId}
              onChange={(e) => setNewRoomTypeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (3h: S/{t.price_hours_default} | Pernocta: S/{t.price_overnight_default})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingRoom}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              {savingRoom ? 'Creando...' : 'Crear Habitación'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

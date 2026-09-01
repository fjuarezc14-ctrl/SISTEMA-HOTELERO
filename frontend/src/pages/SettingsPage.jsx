import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { useGlobalStore } from '../context/GlobalStoreContext';
import { validateDocument, validateAmount, validateQuantity, validatePhone, validateFullName, validateText } from '../utils/validators';
import { Sliders, Bed, Hotel, Edit2, Plus, Check, AlertCircle, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export function SettingsPage() {
  const { getRoomTypes, getHotelInfo, invalidateCache } = useGlobalStore();
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

  // Modal Crear / Editar Habitación
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomStatus, setNewRoomStatus] = useState('available');
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

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const [typesData, roomsRes, infoData] = await Promise.all([
        getRoomTypes(forceRefresh),
        api.get('/rooms'),
        getHotelInfo(forceRefresh)
      ]);
      setRoomTypes(typesData || []);
      setRooms(roomsRes.data || []);
      if (infoData) {
        setHotelInfo(infoData);
        setBusinessName(infoData.business_name || '');
        setTradeName(infoData.trade_name || '');
        setRuc(infoData.ruc || '');
        setAddress(infoData.address || '');
        setPhone(infoData.phone || '');
      }
    } catch (err) {
      console.error('Error cargando ajustes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [getRoomTypes, getHotelInfo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    const pHoursErr = validateAmount(priceHours, 'Tarifa por horas');
    const pOverErr = validateAmount(priceOvernight, 'Tarifa por noche');
    const pFullErr = validateAmount(priceFullDay, 'Tarifa día completo');
    const pExtraErr = validateAmount(priceExtraHour, 'Tarifa hora extra');
    const hQtyErr = validateQuantity(hoursCount, 'Horas base', 1, 24);
    const firstErr = pHoursErr || pOverErr || pFullErr || pExtraErr || hQtyErr;
    if (firstErr) {
      setRatesError(firstErr);
      return;
    }

    try {
      setSavingRates(true);
      await api.put(`/rooms/types/${editingType.id}/rates`, {
        price_hours_default: parseFloat(priceHours),
        price_overnight_default: parseFloat(priceOvernight),
        price_full_day_default: parseFloat(priceFullDay),
        price_extra_hour_default: parseFloat(priceExtraHour),
        hours_quantity_default: parseInt(hoursCount, 10)
      });
      invalidateCache('room_types');
      setIsRatesModalOpen(false);
      await fetchData(true);
    } catch (err) {
      setRatesError(err.message || 'Error guardando tarifas.');
    } finally {
      setSavingRates(false);
    }
  };

  const handleOpenCreateRoom = () => {
    setEditingRoom(null);
    setNewRoomNumber('');
    if (roomTypes.length > 0) setNewRoomTypeId(roomTypes[0].id);
    setNewRoomFloor(1);
    setNewRoomStatus('available');
    setRoomError('');
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room) => {
    setEditingRoom(room);
    setNewRoomNumber(room.room_number || '');
    setNewRoomTypeId(room.room_type_id || (roomTypes[0] ? roomTypes[0].id : ''));
    setNewRoomFloor(room.floor || 1);
    setNewRoomStatus(room.status || 'available');
    setRoomError('');
    setIsRoomModalOpen(true);
  };

  const handleDeleteRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`¿Estás seguro de eliminar la Habitación ${roomNumber}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      await fetchData();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar la habitación. Asegúrate de que no tenga estadías asociadas.');
    }
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setRoomError('');

    const numErr = validateText(newRoomNumber, 'Número de habitación', 1, 10);
    const floorErr = validateQuantity(newRoomFloor, 'Piso', 1, 99);
    const firstErr = numErr || floorErr;
    if (firstErr) {
      setRoomError(firstErr);
      return;
    }

    if (!newRoomTypeId) {
      setRoomError('Selecciona el tipo de habitación.');
      return;
    }

    try {
      setSavingRoom(true);
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, {
          room_number: newRoomNumber.trim(),
          room_type_id: newRoomTypeId,
          floor: parseInt(newRoomFloor, 10) || 1,
          status: newRoomStatus
        });
      } else {
        await api.post('/rooms', {
          room_number: newRoomNumber.trim(),
          room_type_id: newRoomTypeId,
          floor: parseInt(newRoomFloor, 10) || 1,
          status: 'available'
        });
      }
      setIsRoomModalOpen(false);
      setNewRoomNumber('');
      await fetchData();
    } catch (err) {
      setRoomError(err.message || 'Error guardando habitación.');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleSaveHotelInfo = async (e) => {
    e.preventDefault();
    setHotelError('');
    setHotelSuccess('');

    const rucErr = validateDocument('RUC', ruc);
    const bNameErr = validateFullName(businessName);
    const phoneErr = validatePhone(phone, false);
    const firstErr = rucErr || bNameErr || phoneErr;
    if (firstErr) {
      setHotelError(firstErr);
      return;
    }

    try {
      setSavingHotel(true);
      await api.put('/settings/hotel-info', {
        business_name: businessName.trim(),
        trade_name: tradeName.trim(),
        ruc: ruc.trim(),
        address: address.trim(),
        phone: phone.trim()
      });
      invalidateCache('hotel_info');
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
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-600" />
          <span>Configuración de Tarifas, Habitaciones & Hotel</span>
        </h2>
        <p className="text-xs text-slate-500">
          Personaliza los precios por hora y por noche en Soles, gestiona habitaciones y datos de RUC.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rates'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tarifas por Categoría (S/)
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rooms'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Gestión de Habitaciones
        </button>
        <button
          onClick={() => setActiveTab('hotel')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'hotel'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Datos de la Empresa / RUC
        </button>
      </div>

      {/* TAB 1: TARIFAS EDITABLES */}
      {activeTab === 'rates' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Tarifas por Defecto en Soles (PEN - S/)</h3>
            <span className="text-xs text-slate-500">Precios base aplicados al hacer Check-in</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomTypes.map((type) => (
              <div
                key={type.id}
                className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900">{type.name}</h4>
                  <button
                    onClick={() => handleOpenEditRates(type)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modificar Precios</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">{type.description || 'Sin descripción'}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Horas ({type.hours_quantity_default}h)</span>
                    <span className="font-bold text-emerald-700 text-sm">{formatPEN(type.price_hours_default)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Por Noche</span>
                    <span className="font-bold text-indigo-700 text-sm">{formatPEN(type.price_overnight_default)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Día Completo</span>
                    <span className="font-bold text-amber-700 text-sm">{formatPEN(type.price_full_day_default)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Hora Extra</span>
                    <span className="font-bold text-slate-700 text-sm">{formatPEN(type.price_extra_hour_default)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HABITACIONES */}
      {activeTab === 'rooms' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Inventario de Habitaciones</h3>
            <button
              onClick={handleOpenCreateRoom}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Habitación</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Número</th>
                  <th className="py-3 px-3">Piso</th>
                  <th className="py-3 px-3">Tipo de Habitación</th>
                  <th className="py-3 px-3">Estado Actual</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">{r.room_number}</td>
                    <td className="py-3 px-3 text-slate-600">Piso {r.floor}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-700">{r.room_type_name}</td>
                    <td className="py-3 px-3 capitalize text-slate-700">{r.status}</td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditRoom(r)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(r.id, r.room_number)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1 border border-rose-200"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATOS DEL HOTEL */}
      {activeTab === 'hotel' && (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900">Información Fiscal & Comercial (Perú)</h3>
          
          {hotelSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{hotelSuccess}</span>
            </div>
          )}

          {hotelError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{hotelError}</span>
            </div>
          )}

          <form onSubmit={handleSaveHotelInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Razón Social (SUNAT)</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">RUC (11 dígitos)</label>
                <input
                  type="text"
                  required
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Fiscal</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono Recepción</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingHotel}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                {savingHotel ? 'Guardando...' : 'Guardar Información del Hotel'}
              </button>
            </div>
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
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{ratesError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Base</label>
              <input
                type="number"
                min="1"
                max="12"
                required
                value={hoursCount}
                onChange={(e) => setHoursCount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Precio por Horas (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceHours}
                onChange={(e) => setPriceHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Por Noche (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceOvernight}
                onChange={(e) => setPriceOvernight(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-indigo-700 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Día Completo (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceFullDay}
                onChange={(e) => setPriceFullDay(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-amber-700 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Extra (S/)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={priceExtraHour}
                onChange={(e) => setPriceExtraHour(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRatesModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingRates}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
            >
              {savingRates ? 'Guardando...' : 'Guardar Tarifas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear / Editar Habitación */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={editingRoom ? `Modificar Habitación ${editingRoom.room_number}` : "Añadir Nueva Habitación"}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {roomError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{roomError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Habitación</label>
              <input
                type="text"
                required
                placeholder="Ej: 305"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Piso</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={newRoomFloor}
                onChange={(e) => setNewRoomFloor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría / Tipo</label>
            <select
              value={newRoomTypeId}
              onChange={(e) => setNewRoomTypeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (3h: S/{t.price_hours_default} | Por Noche: S/{t.price_overnight_default})
                </option>
              ))}
            </select>
          </div>

          {editingRoom && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de Operación</label>
              <select
                value={newRoomStatus}
                onChange={(e) => setNewRoomStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="available">Disponible (Libre)</option>
                <option value="cleaning">En Limpieza</option>
                <option value="maintenance">En Mantenimiento</option>
                <option value="occupied">Ocupada</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingRoom}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
            >
              {savingRoom ? 'Guardando...' : (editingRoom ? 'Guardar Cambios' : 'Crear Habitación')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

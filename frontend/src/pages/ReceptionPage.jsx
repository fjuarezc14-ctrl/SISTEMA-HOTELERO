import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, getRemainingTime, ROOM_STATUS_CONFIG } from '../utils/formatters';
import { CheckInModal } from '../components/CheckInModal';
import { CheckOutModal } from '../components/CheckOutModal';
import { ConsumptionModal } from '../components/ConsumptionModal';
import { ExtraHoursModal } from '../components/ExtraHoursModal';
import { CreateReservationModal } from '../components/CreateReservationModal';
import { RoomFormModal } from '../components/RoomFormModal';
import {
  BedDouble,
  UserCheck,
  LogOut,
  Sparkles,
  ShoppingBag,
  Clock,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Plus,
  Lock,
  ChevronRight,
  Plane,
  Key,
  Wrench,
  PhoneCall,
  User,
  Ticket,
  Bell,
  Settings
} from 'lucide-react';

export function ReceptionPage() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modales
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
  const [isExtraHoursOpen, setIsExtraHoursOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [editingRoomForForm, setEditingRoomForForm] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, resRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/reservations?status=confirmed')
      ]);
      setRooms(roomsRes.data || []);
      setReservations(resRes.data || []);
    } catch (err) {
      console.error('Error cargando datos de recepción:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresco automático cada 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleQuickStatusChange = async (roomId, newStatus) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status: newStatus });
      await fetchData();
    } catch (err) {
      alert(err.message || 'Error actualizando estado de habitación.');
    }
  };

  const handleOpenCheckIn = (room) => {
    setSelectedRoom(room);
    setIsCheckInOpen(true);
  };

  const handleOpenCheckOut = (room) => {
    setSelectedRoom(room);
    setIsCheckOutOpen(true);
  };

  const handleOpenConsumption = (room) => {
    setSelectedRoom(room);
    setIsConsumptionOpen(true);
  };

  const handleOpenExtraHours = (room) => {
    setSelectedRoom(room);
    setIsExtraHoursOpen(true);
  };

  const handleDirectCheckInReservation = async (reservationId) => {
    if (!window.confirm('¿Deseas realizar el Check-in directo de esta reserva?')) return;
    try {
      await api.post(`/reservations/${reservationId}/checkin`, { stay_type: 'hours', hours_count: 3 });
      alert(' Check-in desde reserva procesado exitosamente.');
      await fetchData();
    } catch (err) {
      alert(err.message || 'Error al procesar Check-in desde reserva.');
    }
  };

  // Filtrado de pisos y estados
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  const filteredRooms = rooms.filter((r) => {
    const matchFloor = floorFilter === 'all' || r.floor === Number(floorFilter);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchFloor && matchStatus;
  });

  // Reservas próximas (Pendientes de llegada: hoy o en los próximos 1-2 días)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingReservations = reservations.filter((res) => {
    if (res.status !== 'confirmed') return false;
    const start = new Date(res.start_date);
    start.setHours(0, 0, 0, 0);

    const diffMs = start.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2; // Hoy, mañana (1d) o pasado mañana (2d)
  });

  // Mapear reservas por habitación
  const reservationMapByRoom = {};
  upcomingReservations.forEach((res) => {
    // Si hay múltiples reservas para la misma habitación, priorizar la más cercana
    if (!reservationMapByRoom[res.room_id]) {
      reservationMapByRoom[res.room_id] = res;
    }
  });

  // Estadísticas rápidas para las tarjetas superiores
  const totalCount = rooms.length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const cleaningCount = rooms.filter((r) => r.status === 'cleaning').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'maintenance').length;

  const handleOpenCreateRoom = () => {
    setEditingRoomForForm(null);
    setIsRoomFormOpen(true);
  };

  const handleOpenEditRoom = (room) => {
    setEditingRoomForForm(room);
    setIsRoomFormOpen(true);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header Bar: Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Dashboard de Recepción</span>
          </h1>
          <p className="text-xs text-slate-500">Gestión visual en tiempo real de ocupación y tarifas en Soles.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateRoom}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Habitación</span>
          </button>
          <button
            onClick={() => setIsReservationModalOpen(true)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            <span>+ Nueva Reserva</span>
          </button>
        </div>
      </div>

      {/* Top Summary KPI Cards Row (5 Tarjetas Superiores Estilo Dashboard UI) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: Llegadas Pendientes */}
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">LLEGADAS PEND.</span>
            <span className="text-xl font-black text-slate-900">{upcomingReservations.length}</span>
          </div>
        </div>

        {/* KPI 2: Hab. Libres */}
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">HAB. LIBRES</span>
            <span className="text-xl font-black text-slate-900">{availableCount}</span>
          </div>
        </div>

        {/* KPI 3: Hab. Ocupadas */}
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">HAB. OCUPADAS</span>
            <span className="text-xl font-black text-slate-900">{occupiedCount}</span>
          </div>
        </div>

        {/* KPI 4: En Limpieza */}
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">EN LIMPIEZA</span>
            <span className="text-xl font-black text-slate-900">{cleaningCount}</span>
          </div>
        </div>

        {/* KPI 5: Mantenimiento / Total */}
        <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">TOTAL HAB.</span>
            <span className="text-xl font-black text-slate-900">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Mapa de Habitaciones + Sidebar Llegadas Pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Mapa de Habitaciones (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5">
          
          {/* Header Sub-Bar: Title & Status Legend Dots */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Mapa de Habitaciones {floorFilter !== 'all' ? `(Piso ${floorFilter})` : ''}
            </h2>

            {/* Legend Dots */}
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Libre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span> Reservada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Ocupada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Limpieza
              </span>
            </div>
          </div>

          {/* Filters Bar: Piso and Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            {/* Floor Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-bold mr-1">Piso:</span>
              <button
                onClick={() => setFloorFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  floorFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Todos
              </button>
              {floors.map((f) => (
                <button
                  key={f}
                  onClick={() => setFloorFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    floorFilter === f
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  Piso {f}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {['all', 'available', 'occupied', 'cleaning', 'maintenance'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st === 'all' ? 'Todos' : ROOM_STATUS_CONFIG[st]?.label || st}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Room Cards (Estilo Limpio Vertical Dashboard) */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs animate-pulse">Cargando mapa de habitaciones...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRooms.map((room) => {
                const isOccupied = room.status === 'occupied';
                const isCleaning = room.status === 'cleaning';
                const isAvailable = room.status === 'available';
                const remaining = isOccupied ? getRemainingTime(room.expected_end_time) : null;
                const upcomingRes = reservationMapByRoom[room.id];

                return (
                  <div
                    key={room.id}
                    className={`border-2 rounded-3xl p-4 flex flex-col justify-between items-center text-center transition-all duration-200 shadow-sm relative ${
                      upcomingRes && isAvailable
                        ? 'border-violet-500 bg-violet-50 ring-4 ring-violet-400/30 shadow-md'
                        : isOccupied
                        ? 'border-rose-400 bg-rose-50/80 shadow-rose-500/10'
                        : isCleaning
                        ? 'border-amber-400 bg-amber-50/90 ring-2 ring-amber-400/40 shadow-amber-500/10'
                        : isAvailable
                        ? 'border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-emerald-500/10'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {/* Botón rápido para editar habitación */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditRoom(room)}
                      title="Configurar / Editar Habitación"
                      className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white/80 rounded-xl transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    {/* Room Number Centered & Bold */}
                    <div className="w-full space-y-1">
                      <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                        {room.room_number}
                      </h3>
                      <p className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                        {room.room_type_name}
                      </p>
                      
                      {/* Pricing Tag in Soles */}
                      <p className="text-xs font-bold text-emerald-800 font-mono">
                        {formatPEN(room.price_hours_default)} <span className="text-[10px] text-slate-500 font-sans font-normal">(3h)</span>
                      </p>

                      {/* Pill Badge Centered Resaltado con Colores Vibrantes */}
                      <div className="pt-2 flex justify-center">
                        <span
                          className={`px-3.5 py-1 rounded-full text-[11px] font-black tracking-wide uppercase shadow-md flex items-center gap-1.5 ${
                            isOccupied
                              ? 'bg-rose-600 text-white shadow-rose-600/30'
                              : isCleaning
                              ? 'bg-amber-500 text-amber-950 shadow-amber-500/40 animate-pulse border border-amber-600/30'
                              : isAvailable
                              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                              : 'bg-slate-600 text-white'
                          }`}
                        >
                          {isAvailable && <Sparkles className="w-3.5 h-3.5 text-emerald-200" />}
                          {isCleaning && <Sparkles className="w-3.5 h-3.5 text-amber-900 animate-spin" />}
                          {ROOM_STATUS_CONFIG[room.status]?.label || room.status}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Body Info according to Status */}
                    <div className="w-full my-3 space-y-2">
                      {isOccupied ? (() => {
                        const stayPrice = Number(room.total_stay_price_pen || 0);
                        const consumptionsPrice = Number(room.total_consumptions_price_pen || 0);
                        const totalAmount = stayPrice + consumptionsPrice;
                        const paidAmount = Number(room.total_paid_pen || 0);
                        const pendingDebt = Math.max(0, totalAmount - paidAmount);

                        return (
                          <div className="space-y-2 pt-1.5 border-t border-rose-200">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-rose-950 truncate">
                              <User className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                              <span className="truncate">{room.customer_name}</span>
                            </div>

                            {/* Badge de Deuda / Saldo Pendiente */}
                            <div className="text-[11px] font-bold p-1.5 bg-white/90 rounded-xl border border-rose-200 flex items-center justify-between shadow-2xs">
                              <span className="text-slate-600 text-[10px]">Deuda / Saldo:</span>
                              <span className={`font-mono text-xs font-black ${pendingDebt > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {pendingDebt > 0 ? formatPEN(pendingDebt) : 'S/ 0.00 (Pagado)'}
                              </span>
                            </div>

                            {/* Live Remaining Time Badge */}
                            <div className="bg-emerald-600 text-white text-[11px] font-black py-1 px-2.5 rounded-full flex items-center justify-center gap-1 shadow-xs">
                              <Clock className="w-3 h-3" />
                              <span>QUEDAN: {remaining?.text?.toUpperCase()}</span>
                            </div>

                            {/* + AGREGAR HORAS Button (Blue) */}
                            <button
                              onClick={() => handleOpenExtraHours(room)}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] rounded-xl transition-all shadow-xs flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>AGREGAR HORAS</span>
                            </button>
                          </div>
                        );
                      })() : isCleaning ? (
                        <div className="pt-2 border-t border-amber-200">
                          <p className="text-[11px] text-amber-900 font-black flex items-center justify-center gap-1 bg-amber-100/90 py-1 px-2 rounded-xl border border-amber-300">
                            <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                            <span>En desinfección / limpieza</span>
                          </p>
                        </div>
                      ) : upcomingRes ? (() => {
                        const start = new Date(upcomingRes.start_date);
                        start.setHours(0,0,0,0);
                        const tDay = new Date();
                        tDay.setHours(0,0,0,0);
                        const diffDays = Math.round((start.getTime() - tDay.getTime()) / (1000 * 60 * 60 * 24));
                        const labelDays = diffDays === 0 ? 'LLEGA HOY' : diffDays === 1 ? 'LLEGA MAÑANA (1d)' : 'LLEGA EN 2 DÍAS';

                        return (
                          <div className="p-2.5 bg-violet-100/90 border border-violet-300 rounded-xl text-left space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="px-1.5 py-0.5 bg-violet-600 text-white text-[9px] font-black rounded-md uppercase">
                                🔔 {labelDays}
                              </span>
                              <strong className="text-violet-900 font-mono text-[10px]">{formatPEN(upcomingRes.deposit_amount_pen)}</strong>
                            </div>
                            <div className="text-[11px] font-extrabold text-violet-950 truncate">
                              Huésped: {upcomingRes.customer_name}
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="text-[10px] text-emerald-800 font-medium pt-2 border-t border-emerald-200 space-y-0.5">
                          <div>Noche: <strong className="text-slate-800 font-mono">{formatPEN(room.price_overnight_default)}</strong></div>
                          <div>24h: <strong className="text-slate-800 font-mono">{formatPEN(room.price_full_day_default)}</strong></div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="w-full pt-2 border-t border-slate-200/60 space-y-1.5">
                      {isAvailable && (
                        <button
                          onClick={() => handleOpenCheckIn(room)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Check-in (Ingreso)</span>
                        </button>
                      )}

                      {isOccupied && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenConsumption(room)}
                            className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1"
                            title="Frigobar / Snacks"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tienda</span>
                          </button>
                          <button
                            onClick={() => handleOpenCheckOut(room)}
                            className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Salida</span>
                          </button>
                        </div>
                      )}

                      {isCleaning && (
                        <button
                          onClick={() => handleQuickStatusChange(room.id, 'available')}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/30 border border-amber-600 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-4 h-4 text-amber-950 animate-pulse" />
                          <span>Aseo Listo → Habitación Limpia</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Llegadas Pendientes (Reservas) Panel (lg:col-span-1) */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Llegadas Pendientes (Reservas)</span>
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-black flex items-center justify-center">
                {upcomingReservations.length}
              </span>
            </h2>

            {upcomingReservations.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No hay llegadas pendientes hoy.</p>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {upcomingReservations.map((res) => {
                  const start = new Date(res.start_date);
                  start.setHours(0,0,0,0);
                  const tDay = new Date();
                  tDay.setHours(0,0,0,0);
                  const diffDays = Math.round((start.getTime() - tDay.getTime()) / (1000 * 60 * 60 * 24));
                  const labelDays = diffDays === 0 ? 'LLEGA HOY' : diffDays === 1 ? 'MAÑANA' : 'EN 2 DÍAS';

                  return (
                    <div
                      key={res.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs hover:border-violet-300 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-900 block text-sm">{res.customer_name}</span>
                          <span className="text-slate-500 font-semibold text-[11px]">Habitación {res.room_number}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-violet-600 text-white text-[10px] font-black rounded-lg">
                          {labelDays}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-200">
                        <span className="text-slate-500">Fecha Llegada:</span>
                        <span className="font-mono text-slate-700 font-bold">{formatDatePeru(res.start_date)}</span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Abono:</span>
                        <strong className="text-emerald-700 font-mono">{formatPEN(res.deposit_amount_pen)}</strong>
                      </div>

                      <button
                        onClick={() => handleDirectCheckInReservation(res.id)}
                        className="w-full mt-1 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Check-in Reserva</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-1">
            <span className="font-bold text-slate-800 block">SISTEMA HOTEL ZAFIRO</span>
            <span>Estándar Perú (Mediodía Check-out)</span>
          </div>
        </div>

      </div>

      {/* Modales globales */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        room={selectedRoom}
        onSuccess={fetchData}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        room={selectedRoom}
        onSuccess={fetchData}
      />

      <ConsumptionModal
        isOpen={isConsumptionOpen}
        onClose={() => setIsConsumptionOpen(false)}
        room={selectedRoom}
        onSuccess={fetchData}
      />

      <ExtraHoursModal
        isOpen={isExtraHoursOpen}
        onClose={() => setIsExtraHoursOpen(false)}
        room={selectedRoom}
        onSuccess={fetchData}
      />

      <CreateReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        rooms={rooms.filter(r => r.status !== 'maintenance')}
        onSuccess={fetchData}
      />

      <RoomFormModal
        isOpen={isRoomFormOpen}
        onClose={() => setIsRoomFormOpen(false)}
        room={editingRoomForForm}
        onSuccess={fetchData}
      />
    </div>
  );
}

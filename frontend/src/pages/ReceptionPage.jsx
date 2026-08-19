import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, getRemainingTime, ROOM_STATUS_CONFIG } from '../utils/formatters';
import { CheckInModal } from '../components/CheckInModal';
import { CheckOutModal } from '../components/CheckOutModal';
import { ConsumptionModal } from '../components/ConsumptionModal';
import {
  BedDouble,
  UserCheck,
  LogOut,
  Sparkles,
  Wrench,
  ShoppingBag,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export function ReceptionPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data || []);
    } catch (err) {
      console.error('Error cargando habitaciones:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 15000); // Refresco automático
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Cambiar estado rápido de habitación (ej: Limpieza -> Disponible, etc.)
  const handleQuickStatusChange = async (roomId, newStatus) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status: newStatus });
      await fetchRooms();
    } catch (err) {
      alert(err.message || 'Error actualizando estado de habitación.');
    }
  };

  // Contadores
  const totalCount = rooms.length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const cleaningCount = rooms.filter((r) => r.status === 'cleaning').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'maintenance').length;

  // Filtrado
  const filteredRooms = rooms.filter((room) => {
    if (floorFilter !== 'all' && room.floor !== Number(floorFilter)) return false;
    if (statusFilter !== 'all' && room.status !== statusFilter) return false;
    return true;
  });

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Top Header & Summary Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-emerald-400" />
            <span>Panel de Recepción y Habitaciones</span>
          </h2>
          <p className="text-xs text-slate-400">Control visual en tiempo real de ocupación y tarifas en Soles.</p>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center gap-2">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white">{totalCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Libres: <strong>{availableCount}</strong></span>
          </div>
          <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs flex items-center gap-2 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Ocupadas: <strong>{occupiedCount}</strong></span>
          </div>
          <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-center gap-2 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Limpieza: <strong>{cleaningCount}</strong></span>
          </div>
          <div className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span>Mtto: <strong>{maintenanceCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Floor Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1">Piso:</span>
          <button
            onClick={() => setFloorFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              floorFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos
          </button>
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => setFloorFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                floorFilter === f
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Piso {f}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
          {['all', 'available', 'occupied', 'cleaning', 'maintenance'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {st === 'all' ? 'Todos los estados' : ROOM_STATUS_CONFIG[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs animate-pulse">Cargando habitaciones...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const config = ROOM_STATUS_CONFIG[room.status] || ROOM_STATUS_CONFIG.available;
            const remaining = room.status === 'occupied' ? getRemainingTime(room.expected_end_time) : null;

            return (
              <div
                key={room.id}
                className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-lg ${config.cardBg}`}
              >
                {/* Header Card */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white font-mono">{room.room_number}</span>
                        <span className="text-xs text-slate-400">Piso {room.floor}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-300 mt-0.5">{room.room_type_name}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${config.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}></span>
                      <span>{config.label}</span>
                    </span>
                  </div>

                  {/* Body Content by Status */}
                  {room.status === 'occupied' ? (
                    <div className="mt-3.5 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Huésped:</span>
                        <span className="font-semibold text-white truncate max-w-[130px]">{room.customer_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Modalidad:</span>
                        <span className="capitalize text-slate-300 font-medium">{room.stay_type}</span>
                      </div>
                      
                      {/* Live Timer */}
                      <div
                        className={`mt-1.5 p-2 rounded-lg flex items-center justify-between text-[11px] font-bold ${
                          remaining?.isExpired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Tiempo:</span>
                        </div>
                        <span className="font-mono">{remaining?.text}</span>
                      </div>

                      {/* Tarifa y saldo */}
                      <div className="flex justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800/80">
                        <span>Total: {formatPEN(Number(room.total_stay_price_pen || 0) + Number(room.total_consumptions_price_pen || 0))}</span>
                        <span className="text-emerald-400 font-medium">Pagado: {formatPEN(room.total_paid_pen)}</span>
                      </div>
                    </div>
                  ) : room.status === 'available' ? (
                    <div className="mt-3.5 p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl text-xs space-y-1.5 text-slate-400">
                      <div className="flex justify-between">
                        <span>3 Horas:</span>
                        <span className="font-bold text-white">{formatPEN(room.price_hours_default)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pernocta:</span>
                        <span className="font-bold text-white">{formatPEN(room.price_overnight_default)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Día Completo:</span>
                        <span className="font-bold text-white">{formatPEN(room.price_full_day_default)}</span>
                      </div>
                    </div>
                  ) : room.status === 'cleaning' ? (
                    <div className="mt-3.5 p-3 bg-amber-950/30 border border-amber-900/40 rounded-xl text-xs text-amber-300/80 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Habitación en proceso de aseo y cambio de lencería.</span>
                    </div>
                  ) : (
                    <div className="mt-3.5 p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{room.observations || 'En mantenimiento preventivo / correctivo.'}</span>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  {room.status === 'available' && (
                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setIsCheckInOpen(true);
                      }}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Check-in</span>
                    </button>
                  )}

                  {room.status === 'cleaning' && (
                    <button
                      onClick={() => handleQuickStatusChange(room.id, 'available')}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Marcar Limpia (Disponible)</span>
                    </button>
                  )}

                  {room.status === 'maintenance' && (
                    <button
                      onClick={() => handleQuickStatusChange(room.id, 'available')}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Habilitar Habitación</span>
                    </button>
                  )}

                  {room.status === 'occupied' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          setIsConsumptionOpen(true);
                        }}
                        title="Cargar Consumo"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors text-xs flex items-center gap-1"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Tienda</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          setIsCheckOutOpen(true);
                        }}
                        className="flex-1 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check-out</span>
                      </button>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {selectedRoom && (
        <>
          <CheckInModal
            isOpen={isCheckInOpen}
            onClose={() => {
              setIsCheckInOpen(false);
              setSelectedRoom(null);
            }}
            room={selectedRoom}
            onSuccess={fetchRooms}
          />
          <CheckOutModal
            isOpen={isCheckOutOpen}
            onClose={() => {
              setIsCheckOutOpen(false);
              setSelectedRoom(null);
            }}
            room={selectedRoom}
            onSuccess={fetchRooms}
          />
          <ConsumptionModal
            isOpen={isConsumptionOpen}
            onClose={() => {
              setIsConsumptionOpen(false);
              setSelectedRoom(null);
            }}
            room={selectedRoom}
            onSuccess={fetchRooms}
          />
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { CreateReservationModal } from '../components/CreateReservationModal';
import { EditReservationModal } from '../components/EditReservationModal';
import { ReservationTimeline } from '../components/ReservationTimeline';
import {
  Calendar,
  Plus,
  Share2,
  Search,
  Filter,
  Edit2,
  UserX,
  List,
  CalendarDays,
  UserCheck
} from 'lucide-react';

export function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'timeline'

  // Filtros & Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('confirmed'); // 'all', 'confirmed', 'checked_in', 'cancelled', 'no_show'

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReservationForEdit, setSelectedReservationForEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const [resData, roomsData] = await Promise.all([
        api.get('/reservations'),
        api.get('/rooms')
      ]);
      setReservations(resData.data || []);
      setRooms((roomsData.data || []).filter((r) => r.status !== 'maintenance'));
    } catch (err) {
      console.error('Error cargando reservaciones:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleConvertToCheckIn = async (resId) => {
    if (!window.confirm('¿Deseas convertir esta reserva en un Check-in de hospedaje activo?')) return;
    try {
      await api.post(`/reservations/${resId}/checkin`, { stay_type: 'hours', hours_count: 3 });
      alert('✅ Reserva convertida a Check-in activo exitosamente.');
      fetchReservations();
    } catch (err) {
      alert(err.message || 'Error convirtiendo reserva.');
    }
  };

  const handleCancelReservation = async (resId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;
    try {
      await api.patch(`/reservations/${resId}/cancel`);
      fetchReservations();
    } catch (err) {
      alert(err.message || 'Error cancelando reserva.');
    }
  };

  const handleNoShowReservation = async (resId) => {
    if (!window.confirm('¿Marcar esta reserva como Inasistencia (No-Show)?')) return;
    try {
      await api.patch(`/reservations/${resId}/no-show`);
      fetchReservations();
    } catch (err) {
      alert(err.message || 'Error marcando No-Show.');
    }
  };

  const handleOpenEdit = (res) => {
    setSelectedReservationForEdit(res);
    setIsEditModalOpen(true);
  };

  const handleSendWhatsAppConfirmation = (res) => {
    const rawPhone = (res.customer_phone || '').replace(/\D/g, '');
    const clientName = res.customer_name || 'Huésped';
    const room = `Hab. ${res.room_number}`;
    const abono = formatPEN(res.deposit_amount_pen || 0);

    const message =
      `*Hotel Zafiro - Confirmación de Reserva*%0A` +
      `Hola *${clientName}*, tu reserva ha sido confirmada con éxito. 🏨✨%0A%0A` +
      `📌 *Habitación:* ${room}%0A` +
      `📅 *Llegada:* ${formatDatePeru(res.start_date)}%0A` +
      `💰 *Abono Registrado:* ${abono}%0A%0A` +
      `¡Te esperamos en Hotel Zafiro!`;

    const waUrl = rawPhone ? `https://wa.me/51${rawPhone}?text=${message}` : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank');
  };

  // Filtrado dinámico
  const filteredReservations = reservations.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (r.customer_name && r.customer_name.toLowerCase().includes(query)) ||
      (r.customer_document && r.customer_document.toLowerCase().includes(query)) ||
      (r.room_number && String(r.room_number).includes(query));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>Módulo de Reservaciones Futuras</span>
          </h2>
          <p className="text-xs text-slate-500">
            Agenda previa de cuartos, Anti-Overbooking, abonos en Soles y notificaciones por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Vista: Tabla / Timeline */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendario Timeline</span>
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Reserva</span>
          </button>
        </div>
      </div>

      {/* Bar de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-3xl shadow-sm">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por Huésped, DNI o Habitación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Pestañas de Filtros de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({reservations.length})
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'confirmed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Confirmadas ({reservations.filter((r) => r.status === 'confirmed').length})
          </button>
          <button
            onClick={() => setStatusFilter('checked_in')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'checked_in'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            En Hospedaje ({reservations.filter((r) => r.status === 'checked_in').length})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'cancelled'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Canceladas / No-Show ({reservations.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length})
          </button>
        </div>
      </div>

      {/* Renderizado de Vista: Tabla o Timeline */}
      {viewMode === 'timeline' ? (
        <ReservationTimeline
          rooms={rooms}
          reservations={reservations}
          onSelectReservation={handleOpenEdit}
        />
      ) : (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando reservaciones...</div>
          ) : filteredReservations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No se encontraron reservas con los filtros aplicados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Habitación</th>
                    <th className="py-3 px-3">Huésped / Documento</th>
                    <th className="py-3 px-3">Fecha Llegada</th>
                    <th className="py-3 px-3">Fecha Salida</th>
                    <th className="py-3 px-3 text-right">Abono Inicial</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        Hab. {r.room_number} <span className="text-slate-500 text-[11px]">({r.room_type_name})</span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{r.customer_name}</p>
                        <p className="text-[11px] text-slate-500">{r.customer_document} • {r.customer_phone || 'Sin telf.'}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{formatDatePeru(r.start_date)}</td>
                      <td className="py-3 px-3 text-slate-700">{formatDatePeru(r.end_date)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatPEN(r.deposit_amount_pen)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.status === 'confirmed' ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Confirmada
                          </span>
                        ) : r.status === 'checked_in' ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                            En Hospedaje
                          </span>
                        ) : r.status === 'no_show' ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            No-Show
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            Cancelada
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleSendWhatsAppConfirmation(r)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-lg hover:bg-emerald-100 transition-all text-[11px] inline-flex items-center gap-1"
                          title="Enviar comprobante a WhatsApp"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg transition-all text-[11px] inline-flex items-center gap-1"
                          title="Reprogramar o editar reserva"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                          <span>Editar</span>
                        </button>

                        {r.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleConvertToCheckIn(r.id)}
                              className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-all text-[11px]"
                            >
                              Check-in
                            </button>
                            <button
                              onClick={() => handleNoShowReservation(r.id)}
                              className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold rounded-lg transition-all text-[11px]"
                              title="Marcar Inasistencia"
                            >
                              No-Show
                            </button>
                            <button
                              onClick={() => handleCancelReservation(r.id)}
                              className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all text-[11px]"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <CreateReservationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        rooms={rooms}
        onSuccess={fetchReservations}
      />

      <EditReservationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        reservation={selectedReservationForEdit}
        rooms={rooms}
        onSuccess={fetchReservations}
      />
    </div>
  );
}

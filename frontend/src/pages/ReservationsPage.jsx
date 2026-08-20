import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { Calendar, Plus, UserCheck, AlertCircle, QrCode, CheckCircle2, XCircle, Search } from 'lucide-react';

export function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [roomId, setRoomId] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [docType, setDocType] = useState('DNI');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState('YAPE_PLIN');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const [resData, roomsData] = await Promise.all([
        api.get('/reservations'),
        api.get('/rooms')
      ]);
      setReservations(resData.data || []);
      setRooms((roomsData.data || []).filter(r => r.status !== 'maintenance'));
    } catch (err) {
      console.error('Error cargando reservaciones:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleLookupDoc = async () => {
    if (!docNumber.trim()) return;
    try {
      const res = await api.get(`/customers/lookup/${docNumber.trim()}`);
      if (res.data && res.data.found) {
        setFullName(res.data.full_name || '');
        if (res.data.phone) setPhone(res.data.phone);
        if (res.data.document_type) setDocType(res.data.document_type);
      }
    } catch (err) {
      console.error('Error en lookup:', err.message);
    }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    setError('');

    if (!roomId || !docNumber.trim() || !fullName.trim() || !startDate || !endDate) {
      setError('Por favor completa habitación, documento, cliente y rango de fechas.');
      return;
    }

    try {
      setSaving(true);
      await api.post('/reservations', {
        room_id: roomId,
        customer_data: {
          document_type: docType,
          document_number: docNumber.trim(),
          full_name: fullName.trim(),
          phone: phone.trim()
        },
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        deposit_amount_pen: parseFloat(depositAmount) || 0,
        payment_method: paymentMethod,
        notes: notes.trim()
      });
      setIsModalOpen(false);
      fetchReservations();
    } catch (err) {
      setError(err.message || 'Error guardando la reserva.');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToCheckIn = async (resId) => {
    if (!window.confirm('¿Deseas convertir esta reserva en un Check-in de hospedaje activo?')) return;
    try {
      await api.post(`/reservations/${resId}/checkin`, { stay_type: 'hours', hours_count: 3 });
      alert('Reserva convertida a Check-in activo exitosamente.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Módulo de Reservaciones Futuras (Perú)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Agenda previa de cuartos, abonos en Soles (Yape/Plin/POS) y pase directo a Check-in.
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nueva Reserva Futura</span>
        </button>
      </div>

      {/* Reservation List */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Listado de Reservas Programadas</h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Cargando reservaciones...</div>
        ) : reservations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No hay reservas registradas en el sistema.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Habitación</th>
                  <th className="py-3 px-3">Huésped / Documento</th>
                  <th className="py-3 px-3">Fecha LLegada</th>
                  <th className="py-3 px-3">Fecha Salida</th>
                  <th className="py-3 px-3 text-right">Abono Inicial</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      Hab. {r.room_number} <span className="text-slate-400 text-[11px]">({r.room_type_name})</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-white">{r.customer_name}</p>
                      <p className="text-[11px] text-slate-400">{r.customer_document} • {r.customer_phone || 'Sin telf.'}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{formatDatePeru(r.start_date)}</td>
                    <td className="py-3 px-3 text-slate-300">{formatDatePeru(r.end_date)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatPEN(r.deposit_amount_pen)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {r.status === 'confirmed' ? (
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Confirmada
                        </span>
                      ) : r.status === 'checked_in' ? (
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          En Hospedaje
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Cancelada
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      {r.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleConvertToCheckIn(r.id)}
                            className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-all text-[11px]"
                          >
                            Hacer Check-in
                          </button>
                          <button
                            onClick={() => handleCancelReservation(r.id)}
                            className="px-2.5 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg transition-all text-[11px]"
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

      {/* Modal Nueva Reserva */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Reserva Futura (Perú)" maxWidth="max-w-lg">
        <form onSubmit={handleCreateReservation} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Habitación</label>
              <select
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar Hab.</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>Hab. {r.room_number} ({r.room_type_name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">DNI / RUC del Huésped</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  onBlur={handleLookupDoc}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Número..."
                />
                <button
                  type="button"
                  onClick={handleLookupDoc}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                  title="Consultar Padrón"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Nombre del cliente..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="987654321"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha y Hora Llegada</label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha y Hora Salida</label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Abono Inicial / Seña (S/)</label>
              <input
                type="number"
                step="5.00"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Medio de Pago Abono</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="YAPE_PLIN">Yape / Plin</option>
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta POS</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              {saving ? 'Guardando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

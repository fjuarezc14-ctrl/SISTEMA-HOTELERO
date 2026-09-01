import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Search,
  Plus,
  Filter,
  Bed,
  User,
  Ban,
  Printer,
  AlertCircle,
  X
} from 'lucide-react';
import { Modal } from '../components/Modal';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal Crear Incidente
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [incidentType, setIncidentType] = useState('damage');
  const [description, setDescription] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('0.00');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      let query = '/incidents?limit=100';
      if (typeFilter) query += `&incident_type=${typeFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const [incRes, roomsRes, custRes] = await Promise.all([
        api.get(query),
        api.get('/rooms'),
        api.get('/customers?limit=200')
      ]);

      setIncidents(incRes.data?.data || incRes.data || []);
      setRooms(roomsRes.data || []);
      setCustomers(custRes.data?.data || custRes.data || []);
    } catch (err) {
      console.error('Error cargando incidentes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [typeFilter, statusFilter]);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!selectedRoomId) {
      setCreateError('Debes seleccionar una habitación.');
      return;
    }
    if (!description.trim()) {
      setCreateError('Por favor ingresa la descripción del incidente.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/incidents', {
        room_id: selectedRoomId,
        customer_id: selectedCustomerId || null,
        incident_type: incidentType,
        description: description.trim(),
        penalty_amount_pen: parseFloat(penaltyAmount) || 0.0
      });

      setIsCreateModalOpen(false);
      setSelectedRoomId('');
      setSelectedCustomerId('');
      setDescription('');
      setPenaltyAmount('0.00');
      await fetchInitialData();
    } catch (err) {
      setCreateError(err.message || 'Error al registrar el incidente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveIncident = async (inc, newStatus) => {
    try {
      if (newStatus === 'resolved' && Number(inc.penalty_amount_pen) > 0) {
        if (window.confirm(`¿Deseas ingresar el cobro de la penalidad por ${formatPEN(inc.penalty_amount_pen)} a la Caja Chica del turno?`)) {
          await api.post('/cash/transaction', {
            transaction_type: 'income',
            concept: `Cobro de Incidente Hab. ${inc.room_number}: ${inc.description.slice(0, 40)}`,
            category: 'incident',
            amount_pen: Number(inc.penalty_amount_pen),
            payment_method: 'CASH'
          });
        }
      }

      await api.patch(`/incidents/${inc.id}/resolve`, { status: newStatus });
      await fetchInitialData();
    } catch (err) {
      alert(err.message || 'Error al actualizar el estado del incidente.');
    }
  };

  // PUNTO 2: Veto Directo al Cliente desde el Incidente
  const handleToggleBlacklist = async (customerId, customerName) => {
    if (!window.confirm(`¿Seguro que deseas VETAR a ${customerName || 'este huésped'} y agregarle a la Lista Negra?`)) return;

    try {
      await api.patch(`/customers/${customerId}/toggle-blacklist`, { reason: 'Registrado desde Módulo de Incidentes' });
      alert(`🛑 El huésped ${customerName} ha sido enviado a la Lista Negra.`);
      await fetchInitialData();
    } catch (err) {
      alert(err.message || 'Error al actualizar estado del cliente.');
    }
  };

  // PUNTO 4: Emisión / Impresión de Acta de Penalidad por Daños
  const printIncidentAct = (inc) => {
    const printWindow = window.open('', '_blank');
    const nowStr = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acta de Ocurrencia y Penalidad por Daño - Hotel Zafiro</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
            h1 { font-size: 18px; margin: 0; text-transform: uppercase; color: #0f172a; }
            h2 { font-size: 13px; margin: 5px 0 0 0; color: #e11d48; font-weight: bold; }
            .card { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; background: #f8fafc; margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
            .label { font-weight: bold; color: #475569; }
            .value { font-weight: bold; color: #0f172a; }
            .box-desc { border: 1px solid #fecdd3; background: #fff1f2; padding: 12px; border-radius: 8px; color: #9f1239; margin-top: 10px; font-[11px]; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; }
            .line { width: 180px; border-top: 1px solid #475569; margin-bottom: 5px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HOTEL ZAFIRO S.A.C.</h1>
            <h2>ACTA FORMAL DE NOTIFICACIÓN DE INCIDENTE & PENALIDAD</h2>
          </div>

          <div class="card">
            <div class="row"><span class="label">Fecha y Hora de Emisión:</span><span class="value">${nowStr}</span></div>
            <div class="row"><span class="label">Habitación Afectada:</span><span class="value">Hab. ${inc.room_number}</span></div>
            <div class="row"><span class="label">Huésped Responsable:</span><span class="value">${inc.customer_name || 'Huésped Registrado'} ${inc.customer_document ? `(Doc: ${inc.customer_document})` : ''}</span></div>
            <div class="row"><span class="label">Registrado Por:</span><span class="value">${inc.registered_by_user || 'Recepción'}</span></div>
            <div class="row"><span class="label">Monto de Penalidad / Daño:</span><span class="value" style="color: #e11d48; font-size: 14px;">${formatPEN(inc.penalty_amount_pen)}</span></div>
          </div>

          <div class="box-desc">
            <strong>Descripción Detallada del Incidente / Ocurrencia:</strong><br/>
            "${inc.description}"
          </div>

          <p style="margin-top: 25px; font-size: 11px; color: #334155;">
            Por medio de la presente, la administración del Hotel Zafiro notifica la ocurrencia del incidente detallado precedentemente. El huésped declara haber sido informado sobre los cargos o penalidades aplicables conforme al reglamento interno del establecimiento.
          </p>

          <div class="signatures">
            <div>
              <div class="line"></div>
              <strong>Firma Recepción / Administración</strong>
            </div>
            <div>
              <div class="line"></div>
              <strong>Firma / Conformidad Huésped</strong>
            </div>
          </div>

          <div class="footer">
            Documento emitido por el Sistema de Gestión Hotelera - Hotel Zafiro Lima.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getIncidentTypeBadge = (type) => {
    switch (type) {
      case 'damage':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-lg">Rotura / Daño</span>;
      case 'loss':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-lg">Faltante / Pérdida</span>;
      case 'unpaid_debt':
        return <span className="px-2.5 py-1 bg-violet-100 text-violet-800 text-xs font-black rounded-lg">Deuda Sin Pagar</span>;
      case 'disturbance':
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-800 text-xs font-black rounded-lg">Disturbio / Ruidos</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-black rounded-lg">Otro Incidente</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Módulo de Incidentes & Ocurrencias</span>
          </h2>
          <p className="text-xs text-slate-500">
            Registro de eventualidades, faltantes de lencería, roturas, multas e impagos reportados.
          </p>
        </div>

        {/* Filtros y Botón Nuevo Incidente */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none"
            >
              <option value="">Todos los Tipos</option>
              <option value="damage">Roturas / Daños</option>
              <option value="loss">Faltantes</option>
              <option value="unpaid_debt">Deudas</option>
              <option value="disturbance">Disturbios</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none"
            >
              <option value="">Todos los Estados</option>
              <option value="reported">Reportado (Pendiente)</option>
              <option value="resolved">Resuelto / Cobrado</option>
              <option value="waived">Condonado / Anulado</option>
            </select>
          </div>

          {/* PUNTO 1: Botón + Registrar Incidente Manual */}
          <button
            onClick={() => {
              setCreateError('');
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Incidente</span>
          </button>
        </div>
      </div>

      {/* Lista de Incidentes */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Cargando reporte de incidentes...</div>
      ) : incidents.length === 0 ? (
        <div className="py-16 bg-white border border-slate-200 rounded-3xl text-center text-slate-400 text-xs space-y-2 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">No hay incidentes registrados</p>
          <p className="text-slate-400">Todas las habitaciones y estadías operan sin novedades.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-rose-300 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hab. {inc.room_number}</span>
                  </span>
                  {getIncidentTypeBadge(inc.incident_type)}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-xs font-semibold text-slate-800 line-clamp-3">"{inc.description}"</p>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Huésped:</span>
                    <strong className="text-slate-900 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {inc.customer_name || 'Sin especificar'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Reportado Por:</span>
                    <span className="text-slate-700 font-semibold">{inc.registered_by_user || 'Recepción'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Fecha:</span>
                    <span className="text-slate-700 font-mono text-[11px]">{formatDatePeru(inc.created_at)}</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">Penalidad / Cobro:</span>
                  <strong className="text-base font-black text-rose-700 font-mono">{formatPEN(inc.penalty_amount_pen)}</strong>
                </div>
              </div>

              {/* Acciones del Incidente: Marcar Resuelto, Vetar y Actas */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-500">
                    Estado: <span className="uppercase text-slate-800 font-mono">{inc.status}</span>
                  </span>
                  {inc.status === 'reported' && (
                    <button
                      onClick={() => handleResolveIncident(inc, 'resolved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Marcar Resuelto</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  {/* PUNTO 2: Botón de Veto Directo */}
                  {inc.customer_id && (
                    <button
                      onClick={() => handleToggleBlacklist(inc.customer_id, inc.customer_name)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition-colors inline-flex items-center gap-1"
                      title="Enviar huésped a Lista Negra / Vetado"
                    >
                      <Ban className="w-3 h-3 text-rose-600" />
                      <span>🛑 Vetar</span>
                    </button>
                  )}

                  {/* PUNTO 4: Botón de Imprimir Acta / Comprobante */}
                  <button
                    onClick={() => printIncidentAct(inc)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                    title="Emitir Acta formal de Notificación de Penalidad"
                  >
                    <Printer className="w-3 h-3 text-slate-600" />
                    <span>Acta PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PUNTO 1: Modal + Registrar Incidente Manual */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Registrar Ocurrencia / Incidente Manual"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Habitación Afectada</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
              >
                <option value="">Selecciona Habitación</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Habitación {r.room_number} ({r.room_type_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Huésped Responsable (Opcional)</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
              >
                <option value="">Ninguno / Daño Interno</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.document_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Incidente</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
              >
                <option value="damage">Rotura / Daño a Bienes</option>
                <option value="loss">Faltante de Lencería / Toallas</option>
                <option value="unpaid_debt">Deuda / Impago de Estadía</option>
                <option value="disturbance">Disturbios / Ruidos Molestos</option>
                <option value="other">Otro Motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monto de Penalidad (S/)</label>
              <input
                type="number"
                step="1.00"
                min="0"
                required
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción del Incidente</label>
            <textarea
              required
              rows={3}
              placeholder="Detalla lo sucedido (ej: Mancha imborrable en juego de sábanas matrimonial por tinte o control remoto roto)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md"
            >
              {submitting ? 'Guardando...' : 'Registrar Incidente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

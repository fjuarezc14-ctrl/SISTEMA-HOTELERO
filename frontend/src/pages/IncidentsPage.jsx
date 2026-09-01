import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { AlertTriangle, ShieldAlert, CheckCircle2, Search, Plus, Filter, Bed, User } from 'lucide-react';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      let query = '/incidents?limit=100';
      if (typeFilter) query += `&incident_type=${typeFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      const res = await api.get(query);
      setIncidents(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Error cargando incidentes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [typeFilter, statusFilter]);

  const handleResolveIncident = async (id, newStatus) => {
    try {
      await api.patch(`/incidents/${id}/resolve`, { status: newStatus });
      await fetchIncidents();
    } catch (err) {
      alert(err.message || 'Error al actualizar el estado del incidente.');
    }
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
            Registro de eventualidades, faltantes de lencería, roturas y multas reportadas durante el Check-out.
          </p>
        </div>

        {/* Filtros */}
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
        </div>
      </div>

      {/* Lista de Incidentes */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Cargando reporte de incidentes...</div>
      ) : incidents.length === 0 ? (
        <div className="py-16 bg-white border border-slate-200 rounded-3xl text-center text-slate-400 text-xs space-y-2 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">No hay incidentes registrados</p>
          <p className="text-slate-400">Todas las salidas se han completado sin novedades.</p>
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
                      {inc.customer_name || 'Desconocido'}
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

              {/* Botón de Resolver */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-slate-500">
                  Estado: <span className="uppercase text-slate-800 font-mono">{inc.status}</span>
                </span>
                {inc.status === 'reported' && (
                  <button
                    onClick={() => handleResolveIncident(inc.id, 'resolved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marcar Resuelto</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

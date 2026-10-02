import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Bed, User, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api/apiClient';
import { formatPEN, formatDatePeru } from '../../utils/formatters';

const INCIDENT_TYPES = {
  damage: { label: 'Rotura / Daño', className: 'bg-rose-100 text-rose-800' },
  loss: { label: 'Faltante / Pérdida', className: 'bg-amber-100 text-amber-800' },
  unpaid_debt: { label: 'Deuda Sin Pagar', className: 'bg-violet-100 text-violet-800' },
  disturbance: { label: 'Disturbio / Ruidos', className: 'bg-orange-100 text-orange-800' },
  other: { label: 'Otro Incidente', className: 'bg-slate-100 text-slate-800' }
};

const INCIDENT_STATUS = {
  reported: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Resuelto', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  waived: { label: 'Condonado', className: 'bg-slate-50 text-slate-600 border-slate-200' }
};

/** Detalle del veto y de los incidentes registrados de un cliente */
export function CustomerRecordModal({ isOpen, onClose, customer }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !customer) return;
    setLoading(true);
    setError('');
    api
      .get(`/customers/${customer.id}/incidents`)
      .then((res) => setIncidents(res.data || []))
      .catch((err) => setError(err.message || 'No se pudieron cargar los incidentes.'))
      .finally(() => setLoading(false));
  }, [isOpen, customer]);

  if (!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Historial: ${customer.full_name}`}>
      <div className="space-y-4">
        <div className="text-xs text-slate-500 font-mono font-bold">
          {customer.document_type}: {customer.document_number}
        </div>

        {/* Veto */}
        {customer.is_blacklisted && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Cliente vetado</span>
            </div>
            <p className="text-xs text-rose-900">
              <span className="font-semibold">Motivo:</span> {customer.blacklist_reason || 'Sin motivo registrado.'}
            </p>
          </div>
        )}

        {/* Incidentes */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Incidentes registrados ({loading ? '…' : incidents.length})</span>
          </h4>

          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400">Cargando incidentes...</div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">{error}</div>
          ) : incidents.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              Este cliente no tiene incidentes registrados.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {incidents.map((inc) => {
                const type = INCIDENT_TYPES[inc.incident_type] || INCIDENT_TYPES.other;
                const status = INCIDENT_STATUS[inc.status] || INCIDENT_STATUS.reported;
                return (
                  <div key={inc.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${type.className}`}>{type.label}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${status.className}`}>{status.label}</span>
                    </div>

                    <p className="text-slate-800">{inc.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDatePeru(inc.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bed className="w-3 h-3" />
                        Hab. {inc.room_number}
                      </span>
                      {inc.registered_by_user && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {inc.registered_by_user}
                        </span>
                      )}
                      {Number(inc.penalty_amount_pen) > 0 && (
                        <span className="ml-auto font-mono font-black text-rose-700">Penalidad: {formatPEN(inc.penalty_amount_pen)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

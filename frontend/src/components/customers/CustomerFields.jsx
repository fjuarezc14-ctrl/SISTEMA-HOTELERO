import React from 'react';
import { CustomerSearchAutocomplete } from './CustomerSearchAutocomplete';
import { getDocumentConstraints } from '../../utils/validators';
import { Lock, ShieldAlert } from 'lucide-react';

export const EMPTY_CUSTOMER = { document_type: 'DNI', document_number: '', full_name: '', phone: '' };

/** Convierte un cliente guardado al formato del formulario */
export const customerToForm = (c) => ({
  document_type: c?.document_type || 'DNI',
  document_number: c?.document_number || '',
  full_name: c?.full_name || '',
  phone: c?.phone || ''
});

/**
 * Datos del cliente reutilizables (reserva, check-in…).
 * - Buscador de clientes guardados.
 * - Al seleccionar uno, sus datos quedan bloqueados (solo lectura).
 * - Muestra la alerta si el cliente está vetado.
 *
 * Props:
 *  customer / setCustomer: { document_type, document_number, full_name, phone }
 *  selectedCustomer / setSelectedCustomer: cliente guardado elegido (o null)
 *  locked: fuerza bloqueo (ej. cliente que viene de una reserva)
 *  showSearch: muestra el buscador (por defecto sí, salvo bloqueo forzado)
 */
export function CustomerFields({ customer, setCustomer, selectedCustomer, setSelectedCustomer, locked = false, showSearch = !locked, children }) {
  const isLocked = locked || Boolean(selectedCustomer);
  const update = (field, value) => setCustomer({ ...customer, [field]: value });
  const lockedClass = isLocked ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-50 text-slate-900';
  const inputClass = `w-full border border-slate-300 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-600 ${lockedClass}`;

  return (
    <div className="space-y-3">
      {showSearch && (
        <CustomerSearchAutocomplete
          selectedCustomer={selectedCustomer}
          onSelectCustomer={(c) => {
            setSelectedCustomer(c);
            setCustomer(customerToForm(c));
          }}
          onClearCustomer={() => {
            setSelectedCustomer(null);
            setCustomer(EMPTY_CUSTOMER);
          }}
        />
      )}

      {selectedCustomer?.is_blacklisted && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2 font-semibold">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>
            Cliente VETADO (lista negra). Motivo: {selectedCustomer.blacklist_reason || 'No especificado'}.
          </span>
        </div>
      )}

      {isLocked && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>
            {locked ? 'Datos del cliente de la reserva (bloqueados).' : 'Datos del cliente registrado (bloqueados). Quita la selección para registrar otro cliente.'}
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipo Doc.</label>
          <select
            value={customer.document_type}
            disabled={isLocked}
            onChange={(e) => update('document_type', e.target.value)}
            className={inputClass}
          >
            <option value="DNI">DNI (8 dígitos)</option>
            <option value="CE">Carné de Extranjería</option>
            <option value="PASSPORT">Pasaporte</option>
            <option value="RUC">RUC (11 dígitos)</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nro. Documento</label>
          <input
            type="text"
            required
            readOnly={isLocked}
            {...getDocumentConstraints(customer.document_type)}
            value={customer.document_number}
            onChange={(e) => update('document_number', e.target.value.trim())}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombres y Apellidos / Razón Social</label>
          <input
            type="text"
            required
            maxLength={150}
            readOnly={isLocked}
            placeholder="Nombre del cliente"
            value={customer.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono / Celular (Opcional)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={9}
            readOnly={isLocked}
            placeholder="Ej: 987654321"
            value={customer.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </div>
      </div>

      {children}
    </div>
  );
}

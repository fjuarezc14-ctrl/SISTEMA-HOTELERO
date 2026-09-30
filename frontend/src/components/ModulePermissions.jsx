import React from 'react';
import { Lock } from 'lucide-react';
import { ASSIGNABLE_MODULES, isAdminRole } from '../utils/modules';

/**
 * Selector de módulos permitidos para un usuario.
 * value: array de ids, o null (= todos). Para administradores se muestra todo marcado y bloqueado.
 */
export function ModulePermissions({ role, value, onChange }) {
  const locked = isAdminRole(role);
  const selected = locked || !Array.isArray(value) ? ASSIGNABLE_MODULES.map((m) => m.id) : value;

  const toggle = (id) => {
    if (locked) return;
    onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">Módulos permitidos</label>
      {locked && (
        <p className="mb-2 text-[11px] text-slate-500 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>El administrador tiene acceso a todos los módulos y no se le pueden quitar.</span>
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {ASSIGNABLE_MODULES.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-colors ${
              locked
                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                : selected.includes(m.id)
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 cursor-pointer'
                : 'bg-slate-50 border-slate-200 text-slate-600 cursor-pointer hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              disabled={locked}
              onChange={() => toggle(m.id)}
              className="accent-emerald-600"
            />
            <span className="font-semibold">{m.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

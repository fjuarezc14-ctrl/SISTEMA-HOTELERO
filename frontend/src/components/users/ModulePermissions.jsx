import React from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { ASSIGNABLE_MODULES, isAdminRole, ROLE_DEFAULT_MODULES } from '../../utils/modules';

/**
 * Selector de módulos permitidos para un usuario.
 * value: array de ids, o null (= predeterminado según rol).
 */
export function ModulePermissions({ role, value, onChange }) {
  const locked = isAdminRole(role);
  const defaultForRole = ROLE_DEFAULT_MODULES[role] || ROLE_DEFAULT_MODULES.receptionist;
  const selected = locked
    ? ASSIGNABLE_MODULES.map((m) => m.id)
    : !Array.isArray(value)
    ? defaultForRole
    : value;

  const toggle = (id) => {
    if (locked) return;
    const next = selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id];
    onChange(next);
  };

  const setAll = () => {
    if (locked) return;
    onChange(ASSIGNABLE_MODULES.map((m) => m.id));
  };

  const setDefault = () => {
    if (locked) return;
    onChange(defaultForRole);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">Módulos permitidos</label>
        {!locked && (
          <div className="flex items-center gap-2 text-[10px]">
            <button
              type="button"
              onClick={setDefault}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Sugerido ({role === 'housekeeper' ? 'Limpieza' : 'Recepción'})</span>
            </button>
            <button
              type="button"
              onClick={setAll}
              className="text-slate-600 hover:text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
            >
              Todos
            </button>
          </div>
        )}
      </div>

      {locked && (
        <p className="p-2 bg-violet-50 border border-violet-200 rounded-xl text-[11px] text-violet-800 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 shrink-0 text-violet-600" />
          <span>El administrador tiene acceso irrestricto a todos los módulos del hotel.</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {ASSIGNABLE_MODULES.map((m) => {
          const isChecked = selected.includes(m.id);
          return (
            <label
              key={m.id}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs transition-all ${
                locked
                  ? 'bg-slate-100/70 border-slate-200 text-slate-500 cursor-not-allowed'
                  : isChecked
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium cursor-pointer shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500 cursor-pointer hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={locked}
                onChange={() => toggle(m.id)}
                className="accent-emerald-600 w-3.5 h-3.5 rounded"
              />
              <span className={isChecked ? 'font-bold text-emerald-900' : 'font-normal'}>{m.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

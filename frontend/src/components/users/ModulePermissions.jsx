import React from 'react';
import { Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { ALL_SYSTEM_MODULES, isAdminRole, ROLE_DEFAULT_MODULES } from '../../utils/modules';

/**
 * Selector de módulos permitidos para un usuario con cobertura total de los 10 módulos.
 * value: array de ids, o null (= predeterminado según rol).
 */
export function ModulePermissions({ role, value, onChange }) {
  const locked = isAdminRole(role);
  const defaultForRole = ROLE_DEFAULT_MODULES[role] || ROLE_DEFAULT_MODULES.receptionist;
  const selected = locked
    ? ALL_SYSTEM_MODULES.map((m) => m.id)
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
    onChange(ALL_SYSTEM_MODULES.map((m) => m.id));
  };

  const setDefault = () => {
    if (locked) return;
    onChange(defaultForRole);
  };

  const groups = [
    {
      title: 'Operaciones de Hospedaje & Huéspedes',
      moduleIds: ['reception', 'reservations', 'customers', 'incidents', 'textiles']
    },
    {
      title: 'Ventas, Caja & Facturación',
      moduleIds: ['cash', 'store']
    },
    {
      title: 'Administración, Finanzas & Configuración',
      moduleIds: ['reports', 'users', 'settings']
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">Módulos y Permisos del Sistema</label>
        {!locked && (
          <div className="flex items-center gap-2 text-[10px]">
            <button
              type="button"
              onClick={setDefault}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Sugerido ({role === 'housekeeper' ? 'Limpieza' : 'Recepción'})</span>
            </button>
            <button
              type="button"
              onClick={setAll}
              className="text-slate-600 hover:text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
            >
              Todos (10)
            </button>
          </div>
        )}
      </div>

      {locked && (
        <p className="p-2.5 bg-violet-50 border border-violet-200 rounded-xl text-[11px] text-violet-800 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 shrink-0 text-violet-600" />
          <span>El Administrador General tiene acceso irrestricto garantizado a los 10 módulos.</span>
        </p>
      )}

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {groups.map((group) => {
          const groupModules = ALL_SYSTEM_MODULES.filter((m) => group.moduleIds.includes(m.id));

          return (
            <div key={group.title} className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {group.title}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {groupModules.map((m) => {
                  const isChecked = selected.includes(m.id);
                  const isAdministrative = ['reports', 'users', 'settings'].includes(m.id);

                  return (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                        locked
                          ? 'bg-slate-100/70 border-slate-200 text-slate-500 cursor-not-allowed'
                          : isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium cursor-pointer shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-500 cursor-pointer hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={locked}
                          onChange={() => toggle(m.id)}
                          className="accent-emerald-600 w-3.5 h-3.5 rounded shrink-0"
                        />
                        <span className={`truncate text-xs ${isChecked ? 'font-bold text-emerald-900' : 'font-normal'}`}>
                          {m.label}
                        </span>
                      </div>
                      {isAdministrative && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 shrink-0 ml-1">
                          Admin
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

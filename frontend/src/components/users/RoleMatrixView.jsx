import React from 'react';
import {
  Crown,
  ConciergeBell,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Lock,
  Layers,
  Info
} from 'lucide-react';
import { ALL_SYSTEM_MODULES, ROLE_DEFINITIONS } from '../../utils/modules';

export function RoleMatrixView() {
  const roles = [
    {
      id: 'admin',
      label: 'Administrador General',
      icon: Crown,
      color: 'violet',
      badge: 'bg-violet-100 text-violet-800 border-violet-200',
      allowed: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles', 'reports', 'users', 'settings']
    },
    {
      id: 'receptionist',
      label: 'Recepcionista / Cajero',
      icon: ConciergeBell,
      color: 'emerald',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      allowed: ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles']
    },
    {
      id: 'housekeeper',
      label: 'Personal Limpieza / Camarera',
      icon: Sparkles,
      color: 'blue',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      allowed: ['reception', 'incidents', 'textiles']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tarjetas Informativas de Roles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLE_DEFINITIONS.filter(r => r.role !== 'super_admin').map((r) => {
          const Icon = r.role === 'admin' ? Crown : r.role === 'receptionist' ? ConciergeBell : Sparkles;
          return (
            <div
              key={r.role}
              className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1.5 ${r.badgeClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.name}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {r.allowed.length} módulos
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                {r.role === 'admin' && '🔑 Autoriza anulaciones, cierres y vetos.'}
                {r.role === 'receptionist' && '💰 Maneja turnos, caja, cobros y ventas.'}
                {r.role === 'housekeeper' && '🧹 Mantiene estado de cuartos y textiles.'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla Matriz de Acceso */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Matriz de Acceso por Módulo del Sistema</span>
            </h3>
            <p className="text-xs text-slate-500">
              Distribución de permisos por defecto para cada perfil de usuario en los 10 módulos.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl w-fit">
            10 Módulos Activos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Módulo / Sección</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 text-center">
                  <span className="inline-flex items-center gap-1 text-violet-700 font-bold">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <ConciergeBell className="w-3 h-3" /> Recepcionista
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                    <Sparkles className="w-3 h-3" /> Limpieza
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ALL_SYSTEM_MODULES.map((m) => {
                const adminHas = true;
                const recHas = ['reception', 'reservations', 'store', 'cash', 'customers', 'incidents', 'textiles'].includes(m.id);
                const hkHas = ['reception', 'incidents', 'textiles'].includes(m.id);

                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{m.label}</div>
                      <div className="text-[10px] text-slate-400">{m.description}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                        m.category === 'Administración'
                          ? 'bg-violet-50 text-violet-700 border border-violet-200'
                          : m.category === 'Finanzas'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {m.category}
                      </span>
                    </td>

                    {/* Admin */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    </td>

                    {/* Recepcionista */}
                    <td className="py-3 px-3 text-center">
                      {recHas ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>

                    {/* Limpieza */}
                    <td className="py-3 px-3 text-center">
                      {hkHas ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Nota de Permisos Granulares */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-800">Permisos Personalizados por Usuario:</span>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Al editar o crear un usuario, puedes marcar o desmarcar módulos específicos. La matriz superior muestra la configuración predeterminada recomendada para cada cargo del hotel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

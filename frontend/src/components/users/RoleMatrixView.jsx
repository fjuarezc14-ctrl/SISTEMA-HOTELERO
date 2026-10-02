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
  Info,
  Key,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import { ALL_SYSTEM_MODULES, ROLE_DEFINITIONS } from '../../utils/modules';

export function RoleMatrixView() {
  const matrixSections = [
    {
      category: 'Operaciones de Hospedaje & Huéspedes',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      modules: [
        {
          id: 'reception',
          name: 'Recepción & Habitaciones',
          description: 'Rack interactivo, Check-in (horas, pernocte, días), Check-out, consumos y cambio de estado de cuartos.',
          admin: 'Acceso Total',
          receptionist: 'Check-in, Check-out, Consumos y Estados',
          housekeeper: 'Solo cambio de estado (Limpieza / Disponible)'
        },
        {
          id: 'reservations',
          name: 'Reservaciones & Calendario',
          description: 'Línea de tiempo interactiva (día, semana, mes), cotización automática, bloqueo anti-overbooking y abonos.',
          admin: 'Acceso Total',
          receptionist: 'Crear, cotizar, check-in desde reserva',
          housekeeper: 'Sin Acceso'
        },
        {
          id: 'customers',
          name: 'Clientes & Huéspedes (DNI / RUC)',
          description: 'Directorio general, autocompletado, historial de visitas, incidencias y marcación en Lista Negra.',
          admin: 'Acceso Total + Levantar Veto con PIN',
          receptionist: 'Registro, búsqueda y consulta de visitas',
          housekeeper: 'Sin Acceso'
        },
        {
          id: 'incidents',
          name: 'Incidentes & Daños',
          description: 'Registro de roturas, pérdidas, averías en cuartos y cargos por penalidad en el check-out.',
          admin: 'Acceso Total y anulación de cargos',
          receptionist: 'Reportar incidente y cobrar penalidad',
          housekeeper: 'Reportar incidentes encontrados en limpieza'
        },
        {
          id: 'textiles',
          name: 'Gestión Textiles & Lavandería',
          description: 'Inventario de sábanas/toallas, envíos y recepciones de lavandería, asignación a cuartos y bajas.',
          admin: 'Acceso Total + Bajas y ajustes',
          receptionist: 'Consultar stock y registrar movimientos',
          housekeeper: 'Asignar sábanas a cuartos, recambio y conteo'
        }
      ]
    },
    {
      category: 'Ventas, Caja & Facturación',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      modules: [
        {
          id: 'cash',
          name: 'Caja & Movimientos de Turno',
          description: 'Apertura de turno, libro de ingresos/egresos, buscador reactivo, emisión de comprobantes y cuadre.',
          admin: 'Acceso Total + Autorizar Anulaciones',
          receptionist: 'Apertura, cobros, egresos y arqueo de su turno',
          housekeeper: 'Sin Acceso'
        },
        {
          id: 'store',
          name: 'Tienda & Frigobar',
          description: 'Venta rápida de mostrador, catálogo con iconos, control de stock y compras a proveedores.',
          admin: 'Acceso Total + Compras de Stock',
          receptionist: 'Venta directa en mostrador y vinculada a cuartos',
          housekeeper: 'Sin Acceso'
        }
      ]
    },
    {
      category: 'Administración, Finanzas & Control',
      badgeColor: 'bg-violet-50 text-violet-800 border-violet-200',
      modules: [
        {
          id: 'reports',
          name: 'Reportes & KPIs Ejecutivos',
          description: 'Ingresos por período, RevPAR, ADR, Ocupación, historial de turnos cerrados y exportación a Excel.',
          admin: 'Acceso Total (Auditoría contable y financiera)',
          receptionist: 'Sin Acceso (Protegido por políticas)',
          housekeeper: 'Sin Acceso'
        },
        {
          id: 'users',
          name: 'Usuarios & Roles del Sistema',
          description: 'Creación de cuentas de personal, asignación de permisos granulares, claves visibles y restablecimiento.',
          admin: 'Acceso Total',
          receptionist: 'Sin Acceso',
          housekeeper: 'Sin Acceso'
        },
        {
          id: 'settings',
          name: 'Configuración del Hotel',
          description: 'Tarifas por horas/días/pernoctes, habitaciones, horarios de salida (12:00 Lima), datos SUNAT y Logo.',
          admin: 'Acceso Total',
          receptionist: 'Sin Acceso',
          housekeeper: 'Sin Acceso'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tarjetas Superiores de Perfiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLE_DEFINITIONS.filter((r) => r.role !== 'super_admin').map((r) => {
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
                    {r.allowed.length} de 10 módulos
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                {r.role === 'admin' && '👑 Acceso total a configuración, finanzas y auditoría.'}
                {r.role === 'receptionist' && '🛎️ Operación integral de cuartos, reservas y cobros.'}
                {r.role === 'housekeeper' && '🧹 Operación de limpieza, textiles e incidencias.'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla Matriz Desglosada por Categorías */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Matriz Integral de Permisos & Módulos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Cobertura completa de los 10 módulos y funciones operativas del Sistema Hotelero.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl w-fit">
            10 Módulos Oficiales
          </span>
        </div>

        <div className="space-y-6">
          {matrixSections.map((sec) => (
            <div key={sec.category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${sec.badgeColor}`}>
                  {sec.category}
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-1/3">Módulo & Funcionalidad</th>
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
                    {sec.modules.map((m) => {
                      const hasAdmin = true;
                      const hasRec = m.receptionist !== 'Sin Acceso';
                      const hasHk = m.housekeeper !== 'Sin Acceso';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{m.description}</div>
                          </td>

                          {/* Admin */}
                          <td className="py-3 px-3 text-center align-middle">
                            <div className="flex flex-col items-center gap-1">
                              <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                                <Check className="w-3 h-3" />
                              </span>
                              <span className="text-[10px] text-violet-800 font-semibold">{m.admin}</span>
                            </div>
                          </td>

                          {/* Recepcionista */}
                          <td className="py-3 px-3 text-center align-middle">
                            <div className="flex flex-col items-center gap-1">
                              {hasRec ? (
                                <>
                                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <Check className="w-3 h-3" />
                                  </span>
                                  <span className="text-[10px] text-emerald-800 font-semibold max-w-[130px] leading-tight">
                                    {m.receptionist}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                    <X className="w-3 h-3" />
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">Sin Acceso</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Limpieza */}
                          <td className="py-3 px-3 text-center align-middle">
                            <div className="flex flex-col items-center gap-1">
                              {hasHk ? (
                                <>
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                    <Check className="w-3 h-3" />
                                  </span>
                                  <span className="text-[10px] text-blue-800 font-semibold max-w-[130px] leading-tight">
                                    {m.housekeeper}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                    <X className="w-3 h-3" />
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">Sin Acceso</span>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Políticas de Seguridad & Autorización Especial */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Operaciones con Credencial de Administrador Requerida</span>
          </div>
          <p className="text-[11px] text-indigo-950/80 leading-relaxed">
            Incluso cuando el personal tiene acceso a Caja o Clientes, las siguientes operaciones críticas solicitan usuario y contraseña de un administrador:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-semibold text-indigo-900">
            <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-indigo-200/60">
              <BadgeAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Anulación de movimientos de caja</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-indigo-200/60">
              <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Levantamiento de veto a clientes</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-indigo-200/60">
              <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Apertura de turno con arqueo forzado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import {
  BedDouble,
  Clock,
  Wallet,
  Users,
  ShoppingBag,
  Sliders,
  UserCog,
  BarChart3,
  LogOut,
  Hotel,
  Calendar,
  ShieldAlert,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentTab, setCurrentTab, isMobileOpen = false, setIsMobileOpen = () => {} }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const navItems = [
    { id: 'reception', label: 'Recepción', icon: BedDouble },
    { id: 'reservations', label: 'Reservaciones', icon: Calendar },
    { id: 'store', label: 'Tienda & Consumos', icon: ShoppingBag },
    { id: 'cash', label: 'Caja & Movimientos', icon: Wallet },
    { id: 'shifts', label: 'Turnos de Caja', icon: Clock },
    { id: 'customers', label: 'Clientes / DNI', icon: Users },
    ...(isAdmin
      ? [
          { id: 'settings', label: 'Tarifas & Hotel', icon: Sliders },
          { id: 'users', label: 'Usuarios', icon: UserCog },
          { id: 'reports', label: 'Reportes & KPIs', icon: BarChart3 }
        ]
      : []),
    { id: 'incidents', label: 'Incidentes', icon: ShieldAlert }
  ];

  return (
    <>
      {/* Backdrop para móvil */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">Hotel Zafiro</h1>
              <p className="text-xs text-emerald-600 font-semibold tracking-wide">VT VALETEC • S/ (PEN)</p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name || 'Usuario'}</p>
              <p className="text-[11px] text-slate-500 capitalize">{user?.role?.replace('_', ' ') || 'Recepcionista'}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

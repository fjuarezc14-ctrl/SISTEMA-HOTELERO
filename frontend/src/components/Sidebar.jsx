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
  Hotel
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentTab, setCurrentTab }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const navItems = [
    { id: 'reception', label: 'Recepción', icon: BedDouble },
    { id: 'shifts', label: 'Turnos de Caja', icon: Clock },
    { id: 'cash', label: 'Caja & Movimientos', icon: Wallet },
    { id: 'customers', label: 'Clientes / DNI', icon: Users },
    { id: 'store', label: 'Tienda & Consumos', icon: ShoppingBag },
    ...(isAdmin
      ? [
          { id: 'settings', label: 'Tarifas & Hotel', icon: Sliders },
          { id: 'users', label: 'Usuarios', icon: UserCog },
          { id: 'reports', label: 'Reportes', icon: BarChart3 }
        ]
      : [])
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Hotel className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight">Hotel Zafiro</h1>
          <p className="text-xs text-emerald-400 font-medium tracking-wide">VT VALETEC • S/ (PEN)</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Usuario'}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user?.role?.replace('_', ' ') || 'Recepcionista'}</p>
          </div>
          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

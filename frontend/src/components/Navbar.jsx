import React, { useState, useEffect } from 'react';
import { Clock, Wallet, AlertCircle, CheckCircle2, Maximize2, Menu } from 'lucide-react';
import { useShift } from '../context/ShiftContext';
import { formatPEN } from '../utils/formatters';

export function Navbar({ onOpenShiftModal, onCloseShiftModal, onToggleMobileSidebar = () => {} }) {
  const { activeShift, hasActiveShift } = useShift();
  const [time, setTime] = useState('');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat('es-PE', {
          timeZone: 'America/Lima',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(now)
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Hamburger & Clock */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Abrir Menú"
        >
          <Menu className="w-5 h-5 text-emerald-600" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hora Lima (UTC-5):</span>
          <span className="font-mono font-bold text-slate-900">{time || '00:00:00'}</span>
        </div>
      </div>

      {/* Right: Shift Status & Kiosk Mode */}
      <div className="flex items-center gap-3">
        {hasActiveShift ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">Turno Abierto:</span>
              <span className="font-mono font-bold text-emerald-800">
                {formatPEN(activeShift.initial_cash_pen || 0)}
              </span>
            </div>

            <button
              onClick={onCloseShiftModal}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Cerrar Turno</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Sin Turno Abierto</span>
            </div>

            <button
              onClick={onOpenShiftModal}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Abrir Turno</span>
            </button>
          </div>
        )}

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        <button
          onClick={toggleFullscreen}
          title="Pantalla Completa (Modo Kiosco)"
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { Clock, Wallet, AlertCircle, CheckCircle2, Maximize2 } from 'lucide-react';
import { useShift } from '../context/ShiftContext';
import { formatPEN } from '../utils/formatters';

export function Navbar({ onOpenShiftModal, onCloseShiftModal }) {
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
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
      {/* Left: Clock & Timezone */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hora Lima (UTC-5):</span>
          <span className="text-white font-semibold font-mono">{time || '--:--:--'}</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span>Moneda Oficial: S/ (Soles)</span>
        </div>
      </div>

      {/* Right: Work Shift Status */}
      <div className="flex items-center gap-3">
        {hasActiveShift ? (
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-slate-300">Turno Activo:</span>
              <span className="text-xs font-semibold text-white">
                Fondo: {formatPEN(activeShift.initial_cash_pen)}
              </span>
            </div>
            <button
              onClick={onCloseShiftModal}
              className="text-xs px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg transition-colors font-medium"
            >
              Cerrar Turno
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>Sin Turno Abierto</span>
            </div>
            <button
              onClick={onOpenShiftModal}
              className="text-xs px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 rounded-lg transition-all shadow-md shadow-emerald-500/20"
            >
              + Abrir Turno
            </button>
          </div>
        <button
          onClick={toggleFullscreen}
          title="Pantalla Completa (Modo Kiosco)"
          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

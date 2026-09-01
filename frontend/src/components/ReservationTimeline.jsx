import React, { useState } from 'react';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, User, Bed } from 'lucide-react';

export function ReservationTimeline({ rooms = [], reservations = [], onSelectReservation }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Generar los 7 días de la semana a partir de currentWeekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWeekStart);
    day.setDate(day.getDate() + i);
    return day;
  });

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentWeekStart(d);
  };

  // Saber si un día dado está cubierto por una reserva
  const isDayReserved = (roomID, day) => {
    const dayTime = day.getTime();
    return reservations.find((r) => {
      if (r.room_id !== roomID || r.status === 'cancelled' || r.status === 'no_show') return false;
      const start = new Date(r.start_date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(r.end_date);
      end.setHours(23, 59, 59, 999);
      return dayTime >= start.getTime() && dayTime <= end.getTime();
    });
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
          >
            Hoy
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="font-extrabold text-slate-800 text-sm">
          {weekDays[0].toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })} —{' '}
          {weekDays[6].toLocaleDateString('es-PE', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>

        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span> Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-md bg-violet-600 inline-block"></span> Reservada
          </span>
        </div>
      </div>

      {/* Grid Timeline */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-4 w-40 shrink-0 sticky left-0 bg-slate-100 border-r border-slate-200 z-10">
                  Habitación
                </th>
                {weekDays.map((day, idx) => {
                  const isToday = new Date().toDateString() === day.toDateString();
                  return (
                    <th
                      key={idx}
                      className={`py-3 px-2 text-center border-r border-slate-200 ${
                        isToday ? 'bg-emerald-100 text-emerald-950 font-black' : ''
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-500">{dayNames[day.getDay()]}</div>
                      <div className="text-sm font-black">{day.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white border-r border-slate-200 shadow-2xs z-10">
                    <div className="font-mono text-sm">Hab. {room.room_number}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{room.room_type_name}</div>
                  </td>

                  {weekDays.map((day, idx) => {
                    const res = isDayReserved(room.id, day);
                    const isToday = new Date().toDateString() === day.toDateString();

                    return (
                      <td
                        key={idx}
                        className={`p-1 border-r border-slate-100 text-center ${
                          isToday ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        {res ? (
                          <div
                            onClick={() => onSelectReservation(res)}
                            title={`Reserva: ${res.customer_name} (${formatPEN(res.deposit_amount_pen)})`}
                            className="bg-violet-600 hover:bg-violet-700 text-white p-1.5 rounded-xl cursor-pointer shadow-xs transition-all text-[10px] font-bold truncate space-y-0.5"
                          >
                            <div className="truncate font-extrabold">{res.customer_name}</div>
                            <div className="text-[9px] text-violet-200 font-mono">S/ {res.deposit_amount_pen}</div>
                          </div>
                        ) : (
                          <div className="w-full h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-medium">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

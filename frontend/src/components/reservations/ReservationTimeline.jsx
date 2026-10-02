import React, { useState } from 'react';
import { formatPEN } from '../../utils/formatters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MODES = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' }
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Ancho mínimo (px) de cada columna según el modo; todas las columnas miden lo mismo
const COL_WIDTH = { day: 44, week: 104, month: 38 };
const ROOM_COL_WIDTH = 144;

const pad = (n) => String(n).padStart(2, '0');

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// La semana empieza el lunes
const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

/** Columnas visibles: 24 horas (día), 7 días (semana) o los días del mes */
function buildColumns(mode, anchor) {
  const now = new Date();
  if (mode === 'day') {
    const base = startOfDay(anchor);
    return Array.from({ length: 24 }, (_, h) => {
      const start = new Date(base);
      start.setHours(h);
      const end = new Date(base);
      end.setHours(h + 1);
      return { start, end, top: '', bottom: `${pad(h)}h`, isCurrent: now >= start && now < end };
    });
  }

  const first = mode === 'week' ? startOfWeek(anchor) : new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const count = mode === 'week' ? 7 : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(first, i);
    const end = addDays(first, i + 1);
    return { start, end, top: DAY_NAMES[start.getDay()], bottom: start.getDate(), isCurrent: now >= start && now < end };
  });
}

function periodTitle(mode, columns, anchor) {
  if (mode === 'day') {
    return anchor.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (mode === 'month') {
    return anchor.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  }
  const first = columns[0].start;
  const last = columns[columns.length - 1].start;
  return `${first.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} — ${last.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })}`;
}

const overlaps = (res, col) => res._start < col.end && res._end > col.start;

export function ReservationTimeline({ rooms = [], reservations = [], onSelectReservation }) {
  const [mode, setMode] = useState('week');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  const columns = buildColumns(mode, anchor);

  const activeReservations = reservations
    .filter((r) => r.status !== 'cancelled' && r.status !== 'no_show')
    .map((r) => {
      const start = new Date(r.start_date);
      const end = r.end_date ? new Date(r.end_date) : new Date(start.getTime() + 3600000);
      return { ...r, _start: start, _end: end };
    });

  // Agrupa las celdas de una habitación: cada reserva ocupa un solo bloque continuo
  const rowSegments = (roomId) => {
    const list = activeReservations.filter((r) => r.room_id === roomId);
    const segments = [];
    let i = 0;
    while (i < columns.length) {
      const res = list.find((r) => overlaps(r, columns[i]));
      let span = 1;
      if (res) {
        while (i + span < columns.length && overlaps(res, columns[i + span])) span++;
      }
      segments.push({ col: columns[i], span, res });
      i += span;
    }
    return segments;
  };

  const shift = (direction) => {
    if (mode === 'day') setAnchor(addDays(anchor, direction));
    else if (mode === 'week') setAnchor(addDays(anchor, 7 * direction));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1));
  };

  const handleToday = () => setAnchor(startOfDay(new Date()));

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setAnchor(startOfDay(new Date()));
  };

  const timeRange = (res) =>
    `${res._start.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} → ${res._end.toLocaleString(
      'es-PE',
      { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    )}`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
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
            onClick={() => shift(1)}
            className="p-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 ml-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => changeMode(m.id)}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  mode === m.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <span className="font-extrabold text-slate-800 text-sm first-letter:uppercase">{periodTitle(mode, columns, anchor)}</span>

        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200 inline-block"></span> Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-md bg-violet-600 inline-block"></span> Reservada
          </span>
        </div>
      </div>

      {/* Grid Timeline */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed text-left text-xs border-collapse"
            style={{ minWidth: ROOM_COL_WIDTH + columns.length * COL_WIDTH[mode] }}
          >
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <th style={{ width: ROOM_COL_WIDTH }} className="py-3 px-4 sticky left-0 bg-slate-100 border-r border-slate-200 z-10">
                  Habitación
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-2 px-1 text-center border-r border-slate-200 ${
                      col.isCurrent ? 'bg-emerald-100 text-emerald-950 font-black' : ''
                    }`}
                  >
                    {col.top && <div className="text-[10px] uppercase font-bold text-slate-500">{col.top}</div>}
                    <div className={mode === 'day' ? 'text-[11px] font-black font-mono' : 'text-sm font-black'}>{col.bottom}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white border-r border-slate-200 shadow-2xs z-10">
                    <div className="font-mono text-sm">Hab. {room.room_number}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{room.room_type_name}</div>
                  </td>

                  {rowSegments(room.id).map(({ col, span, res }, idx) => {
                    if (!res) {
                      return (
                        <td key={idx} className={`p-1 border-r border-slate-100 ${col.isCurrent ? 'bg-emerald-50/40' : ''}`}>
                          <div className="w-full h-9 rounded-lg bg-slate-50 border border-slate-100" />
                        </td>
                      );
                    }

                    // En día y mes las celdas son angostas: el texto solo cabe si la reserva abarca varias
                    const showName = mode === 'week' || span >= 3;
                    const showDeposit = mode === 'week' || span >= 6;

                    return (
                      <td key={idx} colSpan={span} className="p-1 border-r border-slate-100">
                        <div
                          onClick={() => onSelectReservation(res)}
                          title={`Reserva: ${res.customer_name} · ${timeRange(res)} · Abono ${formatPEN(res.deposit_amount_pen)}`}
                          className="h-9 bg-violet-600 hover:bg-violet-700 text-white px-2 rounded-lg cursor-pointer shadow-xs transition-all text-[10px] font-bold flex flex-col justify-center overflow-hidden"
                        >
                          {showName && <div className="truncate font-extrabold">{res.customer_name}</div>}
                          {showDeposit && <div className="text-[9px] text-violet-200 font-mono truncate">{formatPEN(res.deposit_amount_pen)}</div>}
                        </div>
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

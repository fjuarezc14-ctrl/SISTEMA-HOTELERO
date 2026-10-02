import React from 'react';
import { Moon, Sun, Clock } from 'lucide-react';
import { formatPEN } from '../../utils/formatters';
import { useGlobalStore } from '../../context/GlobalStoreContext';
import { schedule, formatTime12 } from '../../utils/schedule';

export const STAY_TYPES = [
  { id: 'overnight', label: 'Por Noche', unit: 'noche', units: 'noches', icon: Moon, priceField: 'price_overnight_default', selected: 'bg-indigo-50 border-indigo-300' },
  { id: 'full_day', label: 'Por Días', unit: 'día', units: 'días', icon: Sun, priceField: 'price_full_day_default', selected: 'bg-amber-50 border-amber-300' },
  { id: 'hours', label: 'Por Horas', unit: 'hora', units: 'horas', icon: Clock, priceField: 'price_hours_default', selected: 'bg-emerald-50 border-emerald-300' }
];

const QUICK_DAYS = [1, 2, 3, 4, 5, 6, 7];
const MAX_DAYS = 60;

/** Cantidad por defecto al cambiar de modalidad */
export function defaultUnits(stayType, room) {
  return stayType === 'hours' ? Number(room?.hours_quantity_default) || 3 : 1;
}

/**
 * Selector de duración único para reservas y check-in:
 * - Por noche (pernocte): una sola noche, sin cantidad; sale a la hora de salida del pernocte.
 * - Por días: cantidad de días; sale el último día a la hora de salida del hotel.
 * - Por horas: horas base + horas extra.
 * El precio y la salida los calcula el backend; aquí solo se muestra `quote` si llega.
 */
export function StayDurationPicker({ room, stayType, units, onChange, quote = null }) {
  const { hotelInfo } = useGlobalStore();
  const times = schedule(hotelInfo);
  const baseHours = Number(room?.hours_quantity_default) || 3;
  const config = STAY_TYPES.find((t) => t.id === stayType) || STAY_TYPES[0];

  const selectType = (id) => onChange({ stayType: id, units: defaultUnits(id, room) });
  const setUnits = (n) => onChange({ stayType, units: n });

  const quickOptions = stayType === 'hours' ? [0, 1, 2, 3, 4, 5, 6].map((e) => baseHours + e) : QUICK_DAYS;
  const min = stayType === 'hours' ? baseHours : 1;
  const max = stayType === 'hours' ? 24 : MAX_DAYS;

  return (
    <div className="space-y-3">
      {/* Modalidad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {STAY_TYPES.map(({ id, label, unit, icon: Icon, priceField, selected }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectType(id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              stayType === id ? `${selected} text-slate-900 shadow-sm` : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </div>
            <p className="text-[11px] font-mono mt-1">
              {formatPEN(room?.[priceField])} {id === 'hours' ? `(${baseHours}h)` : `/ ${unit}`}
            </p>
          </button>
        ))}
      </div>

      {/* Cantidad (el pernocte es siempre una noche) */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        {stayType === 'overnight' ? (
          <p className="text-xs text-slate-700">
            <strong>1 noche (pernocte).</strong> Se vende desde las {formatTime12(times.pernocteStart)} y sale a las{' '}
            {formatTime12(times.pernocteCheckout)}. Para más noches usa <strong>Por Días</strong>.
          </p>
        ) : (
        <>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-800">
            {stayType === 'hours' ? `Horas (base ${baseHours}h)` : `Cantidad de ${config.units}`}
          </span>
          {stayType === 'hours' && (
            <span className="text-[11px] text-slate-500">+{formatPEN(room?.price_extra_hour_default)} por hora adicional</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {quickOptions.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setUnits(n)}
              className={`min-w-[2.75rem] py-1.5 px-2 rounded-lg text-xs font-extrabold border transition-colors ${
                Number(units) === n ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {stayType === 'hours' ? `${n}h` : n}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 ml-1">
            <span>Otra:</span>
            <input
              type="number"
              min={min}
              max={max}
              step="1"
              value={units}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setUnits(Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : min);
              }}
              className="w-16 bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-center font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
            <span>{stayType === 'hours' ? 'h' : config.units}</span>
          </label>
        </div>

        </>
        )}

        {quote && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
            <span className="text-slate-600">
              {quote.breakdown?.nights
                ? `${quote.breakdown.nights} ${quote.breakdown.nights === 1 ? config.unit : config.units} × ${formatPEN(quote.breakdown.nightly_rate)}`
                : quote.breakdown?.hours
                ? `${quote.breakdown.hours} horas${quote.breakdown.extra_hours ? ` (${quote.breakdown.extra_hours} extra)` : ''}`
                : ''}
            </span>
            <span className="font-mono font-black text-emerald-700 text-sm">{formatPEN(quote.price)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

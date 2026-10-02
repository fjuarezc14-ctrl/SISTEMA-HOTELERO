import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

// El input nativo muestra la fecha según el idioma del navegador (a veces mm/dd/aaaa).
// Estos campos siempre muestran dd/mm/aaaa y usan el calendario nativo para elegir.

const toDMY = (value) => {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const withoutWidth = (className) => className.replace(/\bw-full\b/g, '').trim();

/** Fecha 'YYYY-MM-DD' mostrada como dd/mm/aaaa. onChange recibe el valor (string). */
export function DateInput({ value = '', onChange, min, max, required = false, className = '', placeholder = 'dd/mm/aaaa' }) {
  const inputRef = useRef(null);
  const fullWidth = /\bw-full\b/.test(className);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };

  return (
    <div className={`relative ${fullWidth ? 'block w-full' : 'inline-block'}`}>
      <button
        type="button"
        onClick={openPicker}
        className={`${className} ${fullWidth ? 'w-full' : ''} flex items-center justify-between gap-2 text-left font-mono`}
      >
        <span className={value ? '' : 'text-slate-400'}>{value ? toDMY(value) : placeholder}</span>
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />
    </div>
  );
}

/** Fecha y hora 'YYYY-MM-DDTHH:mm': fecha dd/mm/aaaa + hora. onChange recibe el valor (string). */
export function DateTimeInput({ value = '', onChange, min, required = false, className = '' }) {
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  const fieldClass = withoutWidth(className);

  const emit = (nextDate, nextTime) => onChange(nextDate ? `${nextDate}T${nextTime || '12:00'}` : '');

  return (
    <div className="flex gap-2">
      <div className="flex-1 min-w-0">
        <DateInput
          value={date}
          min={min ? min.slice(0, 10) : undefined}
          required={required}
          onChange={(d) => emit(d, time)}
          className={`${fieldClass} w-full`}
        />
      </div>
      <input
        type="time"
        value={time}
        required={required}
        onChange={(e) => emit(date, e.target.value)}
        className={`${fieldClass} w-28 shrink-0 font-mono`}
      />
    </div>
  );
}

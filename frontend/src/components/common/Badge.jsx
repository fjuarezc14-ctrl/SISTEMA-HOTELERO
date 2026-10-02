import React from 'react';

// Colores disponibles para las etiquetas
const TONES = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  rose: 'bg-rose-100 text-rose-800 border-rose-300',
  violet: 'bg-violet-100 text-violet-800 border-violet-300',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  slate: 'bg-slate-100 text-slate-700 border-slate-300',
  solidViolet: 'bg-violet-600 text-white border-violet-600'
};

/**
 * Etiqueta resaltada que crece según su contenido (no se corta si el texto ocupa dos líneas).
 */
export function Badge({ tone = 'slate', icon: Icon = null, className = '', children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center gap-1 max-w-full px-2 py-1 rounded-lg border text-[10px] font-black leading-tight text-center whitespace-normal break-words align-middle ${TONES[tone] || TONES.slate} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

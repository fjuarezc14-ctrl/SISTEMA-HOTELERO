import React, { useState } from 'react';
import { Calculator, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { formatPEN } from '../utils/formatters';

// Denominaciones vigentes en soles, en céntimos para evitar errores de redondeo
const BILLS = [20000, 10000, 5000, 2000, 1000];
const COINS = [500, 200, 100, 50, 20, 10];

const labelFor = (cents) =>
  cents >= 100 ? `S/ ${cents / 100}` : `S/ 0.${String(cents).padStart(2, '0')}`;

/** Botón para mostrar/ocultar la calculadora */
export function CashCounterToggle({ isOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
        isOpen
          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
      }`}
    >
      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
      <span>{isOpen ? 'Ocultar calculadora' : 'Calculadora de billetes y monedas'}</span>
    </button>
  );
}

/**
 * Panel de calculadora de billetes y monedas peruanas.
 * Llama a onTotalChange(totalEnSoles) cada vez que cambia el conteo.
 */
export function CashCounter({ onTotalChange = () => {}, onClose }) {
  const [counts, setCounts] = useState({});

  const totalCents = [...BILLS, ...COINS].reduce((sum, d) => sum + d * (counts[d] || 0), 0);

  const updateCount = (denom, value) => {
    const qty = Math.max(0, Math.floor(Number(value) || 0));
    const next = { ...counts, [denom]: qty };
    setCounts(next);
    const nextTotal = [...BILLS, ...COINS].reduce((sum, d) => sum + d * (next[d] || 0), 0);
    onTotalChange((nextTotal / 100).toFixed(2));
  };

  const reset = () => {
    setCounts({});
    onTotalChange('0.00');
  };

  const renderRow = (denom) => {
    const qty = counts[denom] || 0;
    return (
      <div key={denom} className="flex items-center gap-2">
        <span className="w-16 text-xs font-bold text-slate-700 font-mono">{labelFor(denom)}</span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => updateCount(denom, qty - 1)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-l-lg text-slate-600"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min="0"
            value={qty || ''}
            placeholder="0"
            onChange={(e) => updateCount(denom, e.target.value)}
            className="w-14 py-1 bg-white border-y border-slate-300 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => updateCount(denom, qty + 1)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-r-lg text-slate-600"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <span className="flex-1 text-right text-xs font-mono text-slate-500">
          {formatPEN((denom * qty) / 100)}
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
          <span>Conteo de billetes y monedas</span>
        </h4>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Billetes</p>
        {BILLS.map(renderRow)}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Monedas</p>
        {COINS.map(renderRow)}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={reset}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Limpiar</span>
        </button>
        <div className="text-sm">
          <span className="text-slate-500 font-semibold mr-2">Total:</span>
          <span className="font-mono font-black text-emerald-700">{formatPEN(totalCents / 100)}</span>
        </div>
      </div>
    </div>
  );
}

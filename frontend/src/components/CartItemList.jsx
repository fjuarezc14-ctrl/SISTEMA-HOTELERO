import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatPEN } from '../utils/formatters';

/** Lista editable de productos del carrito (ver hooks/useCart) */
export function CartItemList({ cart, updateCartQty, emptyText = 'El carrito está vacío.' }) {
  if (cart.length === 0) {
    return (
      <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl max-h-64 overflow-y-auto">
      {cart.map(({ product, qty }) => (
        <div key={product.id} className="flex items-center gap-2 p-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{product.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{formatPEN(product.sale_price_pen)} c/u</p>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => updateCartQty(product.id, qty - 1)}
              className="p-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-l-lg text-slate-600"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              min="1"
              max={product.stock}
              value={qty}
              onChange={(e) => updateCartQty(product.id, parseInt(e.target.value, 10) || 1)}
              className="w-10 py-0.5 bg-white border-y border-slate-300 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => updateCartQty(product.id, qty + 1)}
              disabled={qty >= product.stock}
              className="p-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-r-lg text-slate-600 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="w-16 text-right text-xs font-mono font-bold text-slate-900">
            {formatPEN(Number(product.sale_price_pen || 0) * qty)}
          </span>
          <button
            type="button"
            onClick={() => updateCartQty(product.id, 0)}
            className="p-1 text-slate-400 hover:text-rose-600"
            title="Quitar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

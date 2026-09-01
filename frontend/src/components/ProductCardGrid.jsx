import React, { useState } from 'react';
import { formatPEN } from '../utils/formatters';
import { Search, ShoppingBag, Coffee, Wine, Sparkles, Check, PackageX, PackageCheck, AlertTriangle } from 'lucide-react';

export function ProductCardGrid({ products = [], selectedProductId, onSelectProduct, disabled = false }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Determinar icono visual según el nombre del producto
  const getProductIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('agua') || lower.includes('gaseosa') || lower.includes('inCA') || lower.includes('coca') || lower.includes('jugo') || lower.includes('red bull') || lower.includes('energizante')) {
      return <Coffee className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('cerveza') || lower.includes('vino') || lower.includes('whisky') || lower.includes('ron') || lower.includes('pisco')) {
      return <Wine className="w-5 h-5 text-amber-600" />;
    }
    if (lower.includes('preservativo') || lower.includes('shampoo') || lower.includes('jabon') || lower.includes('toalla') || lower.includes('cepillo')) {
      return <Sparkles className="w-5 h-5 text-rose-600" />;
    }
    return <ShoppingBag className="w-5 h-5 text-emerald-600" />;
  };

  // Filtrado de productos por texto y stock
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase().trim());
    if (categoryFilter === 'IN_STOCK') return matchesSearch && p.stock > 0;
    if (categoryFilter === 'LOW_STOCK') return matchesSearch && p.stock > 0 && p.stock <= 5;
    return matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Buscador & Filtro Rápido */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('IN_STOCK')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              categoryFilter === 'IN_STOCK'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            En Stock
          </button>
        </div>
      </div>

      {/* Grid de Tarjetas Visuales de Productos */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
          No se encontraron productos coincidentes.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isSelected = selectedProductId === p.id;
            const isOutOfStock = p.stock <= 0;
            const isLowStock = p.stock > 0 && p.stock <= 3;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!isOutOfStock && !disabled) {
                    onSelectProduct(p);
                  }
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all duration-200 relative flex flex-col justify-between select-none ${
                  isOutOfStock
                    ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                    : isSelected
                    ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs cursor-pointer'
                }`}
              >
                {/* Header de la Tarjeta */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className="p-1.5 rounded-xl bg-slate-100/80 shrink-0">
                    {getProductIcon(p.name)}
                  </div>
                  {isSelected ? (
                    <span className="p-1 bg-emerald-600 text-white rounded-full">
                      <Check className="w-3 h-3" />
                    </span>
                  ) : isOutOfStock ? (
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold text-[9px] rounded-md">
                      Agotado
                    </span>
                  ) : isLowStock ? (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[9px] rounded-md flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                      Quedan {p.stock}
                    </span>
                  ) : null}
                </div>

                {/* Info del Producto */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                    {p.name}
                  </h4>
                  <div className="flex items-baseline justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                    <span className="text-xs font-mono font-black text-emerald-700">
                      {formatPEN(p.sale_price_pen)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Stock: <strong className="text-slate-700">{p.stock}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

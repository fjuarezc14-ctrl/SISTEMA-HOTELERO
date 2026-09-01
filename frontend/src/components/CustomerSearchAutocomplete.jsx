import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/apiClient';
import { Search, UserCheck, UserPlus, AlertTriangle, X, Check } from 'lucide-react';

/**
 * Buscador de clientes desacoplado con Debounce (300ms)
 * Permite buscar clientes por DNI, RUC, Nombre o Teléfono.
 * Al seleccionar uno, notifica mediante onSelectCustomer.
 * Si es un cliente nuevo, permite limpiar para tipeo manual.
 */
export function CustomerSearchAutocomplete({ onSelectCustomer, onClearCustomer, selectedCustomer = null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Debounce 300ms para evitar llamadas API por cada tecla
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/customers?search=${encodeURIComponent(trimmed)}&limit=6`);
        setResults(res.data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Error buscando clientes:', err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer) => {
    onSelectCustomer(customer);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onClearCustomer();
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-emerald-600" />
          <span>Buscar Huésped Registrado (Frecuente / Base de Datos)</span>
        </span>
        <span className="text-[10px] text-slate-400 font-normal">Por DNI, RUC o Nombre</span>
      </label>

      {selectedCustomer ? (
        /* Badge cuando ya fue seleccionado */
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 block">{selectedCustomer.full_name}</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {selectedCustomer.document_type || 'DNI'}: {selectedCustomer.document_number} {selectedCustomer.phone ? `• Cel: ${selectedCustomer.phone}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            title="Cambiar o limpiar cliente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Buscador con Debounce + Dropdown Desplegable */
        <div ref={dropdownRef} className="relative">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setIsOpen(true); }}
              placeholder="🔍 Escribe DNI, RUC o Nombre del huésped para autocompletar..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-sans shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            ) : query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Menú Desplegable Flotante */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
              {results.length > 0 ? (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="w-full text-left p-3 hover:bg-emerald-50/60 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                        <span>{c.full_name}</span>
                        {c.is_blacklisted && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black rounded-md flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> VETADO
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {c.document_type || 'DNI'}: {c.document_number} {c.phone ? `• Tel: ${c.phone}` : ''}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-1 rounded-lg shrink-0">
                      Seleccionar →
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-500">
                  <span>No se encontró cliente con "{query}".</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Llana las casillas de abajo para registrarlo como huésped nuevo.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

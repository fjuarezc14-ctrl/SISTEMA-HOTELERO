import React, { useState, useEffect } from 'react';
import { AlertCircle, Wand2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api/apiClient';
import { validateText, validatePrice, validateQuantity } from '../../utils/validators';
import { PRODUCT_ICONS, ProductIcon } from './ProductIcon';

/** Crear / editar un producto de la tienda (nombre, precio, stock e icono) */
export function ProductFormModal({ isOpen, onClose, product = null, onSaved }) {
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodIcon, setProdIcon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setProdName(product?.name || '');
    setProdPrice(product?.sale_price_pen ?? '');
    setProdStock(product?.stock ?? '');
    setProdIcon(product?.icon || '');
    setError('');
  }, [isOpen, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nameErr = validateText(prodName, 'Nombre del producto', 2, 100);
    const priceErr = validatePrice(prodPrice, 'Precio de venta');
    const stockErr = validateQuantity(prodStock, 'Stock inicial', 0, 99999);
    const firstErr = nameErr || priceErr || stockErr;
    if (firstErr) {
      setError(firstErr);
      return;
    }

    const payload = {
      name: prodName.trim(),
      sale_price_pen: parseFloat(prodPrice),
      stock: parseInt(prodStock, 10) || 0,
      icon: prodIcon
    };

    try {
      setSubmitting(true);
      if (product) {
        await api.put(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onClose();
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Error guardando producto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Editar Producto / Stock' : 'Nuevo Producto en Tienda'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Producto</label>
          <input
            type="text"
            required
            value={prodName}
            onChange={(e) => setProdName(e.target.value)}
            placeholder="Ej: Gaseosa Coca Cola 500ml"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Precio de Venta (S/)</label>
            <input
              type="number"
              step="0.50"
              min="0.50"
              required
              value={prodPrice}
              onChange={(e) => setProdPrice(e.target.value)}
              placeholder="4.00"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Disponible</label>
            <input
              type="number"
              min="0"
              required
              value={prodStock}
              onChange={(e) => setProdStock(e.target.value)}
              placeholder="20"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Icono del producto */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">Icono</label>
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Vista previa:</span>
              <span className="p-1 rounded-lg bg-slate-100">
                <ProductIcon product={{ name: prodName, icon: prodIcon }} className="w-4 h-4" />
              </span>
            </span>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => setProdIcon('')}
              title="Automático (según el nombre)"
              className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
                prodIcon === ''
                  ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <Wand2 className="w-4 h-4 text-slate-500" />
            </button>
            {PRODUCT_ICONS.map(({ key, label, Icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => setProdIcon(key)}
                title={label}
                className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
                  prodIcon === key
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${color}`} />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {prodIcon === '' ? 'Automático: se elige según el nombre del producto.' : PRODUCT_ICONS.find((i) => i.key === prodIcon)?.label}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
          >
            {submitting ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

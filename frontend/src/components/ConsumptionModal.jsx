import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { ShoppingBag, Plus, AlertCircle, Check } from 'lucide-react';

export function ConsumptionModal({ isOpen, onClose, room, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        try {
          const res = await api.get('/products');
          setProducts(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedProduct(res.data[0].id);
          }
        } catch (err) {
          setError('Error cargando catálogo de productos.');
        }
      };
      fetchProducts();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!room?.active_stay_id || !selectedProduct) return;

    try {
      setLoading(true);
      setError('');
      await api.post('/products/charge-room', {
        stay_id: room.active_stay_id,
        product_id: selectedProduct,
        quantity: Number(quantity)
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al cargar consumo.');
    } finally {
      setLoading(false);
    }
  };

  if (!room) return null;

  const currentProduct = products.find((p) => p.id === selectedProduct);
  const subtotal = (Number(currentProduct?.sale_price_pen || 0) * Number(quantity || 1)).toFixed(2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cargar Consumo: Habitación ${room.room_number}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Seleccionar Producto
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                {p.name} - {formatPEN(p.sale_price_pen)} (Stock: {p.stock})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cantidad</label>
            <input
              type="number"
              min="1"
              max={currentProduct?.stock || 99}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subtotal a Cargar</label>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold text-sm text-right">
              {formatPEN(subtotal)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !currentProduct || currentProduct.stock <= 0}
            className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Cargando...' : 'Añadir a Cuenta'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { validateQuantity } from '../utils/validators';
import { useGlobalStore } from '../context/GlobalStoreContext';
import { ShoppingBag, Plus, AlertCircle, Check } from 'lucide-react';

export function ConsumptionModal({ isOpen, onClose, room, onSuccess }) {
  const { getProducts, invalidateCache } = useGlobalStore();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        try {
          // Utiliza la caché TTL (2 min), acelerando la apertura a 0ms
          const data = await getProducts();
          setProducts(data || []);
          if (data && data.length > 0) {
            setSelectedProduct(data[0].id);
          }
        } catch (err) {
          setError('Error cargando catálogo de productos.');
        }
      };
      fetchProducts();
    }
  }, [isOpen, getProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const activeStayId = room?.active_stay_id || room?.stay_id;
    if (!activeStayId) {
      setError('No hay una estadía activa identificada para esta habitación.');
      return;
    }

    if (!selectedProduct) {
      setError('Debes seleccionar un producto.');
      return;
    }

    const qtyErr = validateQuantity(quantity, 'Cantidad', 1, currentProduct?.stock || 99);
    if (qtyErr) {
      setError(qtyErr);
      return;
    }

    try {
      setLoading(true);
      await api.post('/products/charge-room', {
        stay_id: activeStayId,
        product_id: selectedProduct,
        quantity: Number(quantity)
      });
      invalidateCache('products');
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
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Seleccionar Producto
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cantidad</label>
            <input
              type="number"
              min="1"
              max={currentProduct?.stock || 99}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subtotal a Cargar</label>
            <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-emerald-700 font-mono font-bold text-sm text-right">
              {formatPEN(subtotal)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !currentProduct || currentProduct.stock <= 0}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Cargando...' : 'Añadir a Cuenta'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

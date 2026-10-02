import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/apiClient';
import { formatPEN } from '../../utils/formatters';
import { useGlobalStore } from '../../context/GlobalStoreContext';
import { useCart } from '../../hooks/useCart';
import { ProductCardGrid } from '../store/ProductCardGrid';
import { CartItemList } from '../store/CartItemList';
import { Plus, AlertCircle, ShoppingCart } from 'lucide-react';

export function ConsumptionModal({ isOpen, onClose, room, onSuccess }) {
  const { getProducts, invalidateCache } = useGlobalStore();
  const { cart, cartQuantities, cartTotal, itemCount, addToCart, updateCartQty, clearCart, toApiItems } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      clearCart();
      setError('');
      const fetchProducts = async () => {
        try {
          // Utiliza la caché TTL (2 min), acelerando la apertura a 0ms
          const data = await getProducts();
          setProducts(data || []);
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

    if (cart.length === 0) {
      setError('Agrega al menos un producto al carrito.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/products/charge-room', {
        stay_id: activeStayId,
        items: toApiItems()
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cargar Consumo: Habitación ${room.room_number}`} maxWidth="max-w-5xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 items-start">
          {/* Catálogo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Catálogo · toca un producto para agregarlo
            </label>
            <ProductCardGrid products={products} cartQuantities={cartQuantities} onSelectProduct={addToCart} />
          </div>

          {/* Carrito */}
          <div className="space-y-3 md:sticky md:top-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                <span>Productos a cargar{itemCount > 0 ? ` (${itemCount})` : ''}</span>
              </label>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                >
                  Vaciar
                </button>
              )}
            </div>

            <CartItemList cart={cart} updateCartQty={updateCartQty} emptyText="Aún no agregas productos." />

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-700">Total a cargar</span>
              <span className="text-lg font-black font-mono text-emerald-700">{formatPEN(cartTotal)}</span>
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
            disabled={loading || cart.length === 0}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Cargando...' : 'Añadir a Cuenta'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

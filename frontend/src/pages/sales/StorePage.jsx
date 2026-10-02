import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/apiClient';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { formatPEN } from '../../utils/formatters';
import { useShift } from '../../context/ShiftContext';
import { useGlobalStore } from '../../context/GlobalStoreContext';
import { ProductCardGrid } from '../../components/store/ProductCardGrid';
import { CartItemList } from '../../components/store/CartItemList';
import { ProductIcon } from '../../components/store/ProductIcon';
import { ProductFormModal } from '../../components/store/ProductFormModal';
import { StockPurchaseModal } from '../../components/store/StockPurchaseModal';
import { StoreCheckoutModal } from '../../components/store/StoreCheckoutModal';
import { useCart } from '../../hooks/useCart';
import { ShoppingBag, ShoppingCart, Plus, Wallet, AlertCircle, Check } from 'lucide-react';

export function StorePage() {
  const { hasActiveShift } = useShift();
  const { getProducts, invalidateCache } = useGlobalStore();
  const [products, setProducts] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Venta Rápida de Mostrador
  const { cart, cartQuantities, cartTotal, itemCount, addToCart, updateCartQty, clearCart, toApiItems } = useCart();
  const [sellSuccess, setSellSuccess] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Modales de producto y de compra de stock (Kardex)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const [data, staysRes] = await Promise.all([
        getProducts(forceRefresh),
        api.get('/stays/active').catch(() => ({ data: [] }))
      ]);
      setProducts(data || []);
      setActiveStays(staysRes.data || []);
    } catch (err) {
      console.error('Error cargando datos de tienda:', err.message);
    } finally {
      setLoading(false);
    }
  }, [getProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const refreshProducts = async () => {
    invalidateCache('products');
    await fetchProducts(true);
  };

  const openCheckout = () => {
    setSellSuccess('');
    setIsCheckoutOpen(true);
  };

  const handleSold = async (message) => {
    setSellSuccess(message);
    clearCart();
    await refreshProducts();
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const inventoryPage = usePagination(products, { resetKey: products.length });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <span>Tienda / Snack Bar & Frigobar (Perú)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Venta directa por mostrador en Soles y control de inventario de bebidas/snacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ingreso Almacén / Kardex</span>
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Catálogo de productos (arriba izquierda) */}
        <div className="xl:col-span-7 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Catálogo · toca un producto para agregarlo</span>
          </h3>
          <ProductCardGrid products={products} cartQuantities={cartQuantities} onSelectProduct={(p) => {
              setSellSuccess('');
              addToCart(p);
            }} />
        </div>

        {/* Carrito y cobro (arriba derecha) */}
        <div className="xl:col-span-5 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm xl:sticky xl:top-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Carrito de Venta</span>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="ml-auto text-[11px] font-semibold text-slate-400 hover:text-rose-600"
              >
                Vaciar
              </button>
            )}
          </h3>

          {!hasActiveShift && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Abre un turno de caja para procesar ventas.</span>
            </div>
          )}

          {sellSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{sellSuccess}</span>
            </div>
          )}

          <CartItemList cart={cart} updateCartQty={updateCartQty} />

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-700">Total</span>
            <span className="text-lg font-black font-mono text-emerald-700">{formatPEN(cartTotal)}</span>
          </div>

          <button
            type="button"
            onClick={openCheckout}
            disabled={cart.length === 0 || !hasActiveShift}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Pagar {formatPEN(cartTotal)}</span>
          </button>
        </div>
      </div>

      {/* Inventario de Productos (lista inferior) */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Inventario de Productos & Precios</h3>
          <button
            onClick={() => fetchProducts(true)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Refrescar
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando inventario...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Producto</th>
                  <th className="py-3 px-3 text-right">Precio Venta</th>
                  <th className="py-3 px-3 text-center">Stock Actual</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryPage.pageItems.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <span className="flex items-center gap-2">
                        <ProductIcon product={p} className="w-4 h-4 shrink-0" />
                        <span>{p.name}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatPEN(p.sale_price_pen)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center text-center leading-tight align-middle px-2.5 py-1 rounded-lg text-xs font-bold ${
                          p.stock <= 5
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.stock} unid.
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Editar / Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={inventoryPage.page} totalPages={inventoryPage.totalPages} totalItems={inventoryPage.totalItems} onChange={inventoryPage.setPage} label="productos" />
          </div>
        )}
      </div>

      <StoreCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        itemCount={itemCount}
        toApiItems={toApiItems}
        activeStays={activeStays}
        hasActiveShift={hasActiveShift}
        onSold={handleSold}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        onSaved={refreshProducts}
      />

      <StockPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        products={products}
        onSaved={refreshProducts}
      />
    </div>
  );
}

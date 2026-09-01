import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { useShift } from '../context/ShiftContext';
import { useGlobalStore } from '../context/GlobalStoreContext';
import { validateText, validatePrice, validateQuantity, validateSupplierName } from '../utils/validators';
import { ShoppingBag, Plus, QrCode, Wallet, CreditCard, AlertCircle, Check } from 'lucide-react';
import { Modal } from '../components/Modal';

export function StorePage() {
  const { hasActiveShift } = useShift();
  const { getProducts, invalidateCache } = useGlobalStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Venta Rápida de Mostrador
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [selling, setSelling] = useState(false);
  const [sellSuccess, setSellSuccess] = useState('');
  const [sellError, setSellError] = useState('');

  // Modal para Crear / Editar Producto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [productError, setProductError] = useState('');

  // Modal Registrar Compra de Stock (Kardex)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseProdId, setPurchaseProdId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(10);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('1.50');
  const [supplierName, setSupplierName] = useState('Distribuidora San José');
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await getProducts(forceRefresh);
      setProducts(data || []);
    } catch (err) {
      console.error('Error cargando productos:', err.message);
    } finally {
      setLoading(false);
    }
  }, [getProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRegisterPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseProdId) {
      alert('Selecciona un producto para la compra.');
      return;
    }

    const qtyErr = validateQuantity(purchaseQty, 'Cantidad comprada');
    const costErr = validatePrice(purchaseUnitCost, 'Costo unitario');
    const supErr = validateSupplierName(supplierName);
    const firstErr = qtyErr || costErr || supErr;
    if (firstErr) {
      alert(firstErr);
      return;
    }

    try {
      setSubmittingPurchase(true);
      await api.post('/products/purchase', {
        product_id: purchaseProdId,
        quantity: Number(purchaseQty),
        unit_cost_pen: parseFloat(purchaseUnitCost),
        supplier_name: supplierName.trim()
      });
      invalidateCache('products');
      alert('Compra registrada correctamente. Stock actualizado en Almacén.');
      setIsPurchaseModalOpen(false);
      fetchProducts(true);
    } catch (err) {
      alert(err.message || 'Error registrando compra.');
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const handleDirectSale = async (e) => {
    e.preventDefault();
    setSellError('');
    setSellSuccess('');

    if (!selectedProduct) {
      setSellError('Selecciona un producto para vender.');
      return;
    }

    const qtyErr = validateQuantity(quantity, 'Cantidad a vender', 1, selectedProduct.stock || 999);
    if (qtyErr) {
      setSellError(qtyErr);
      return;
    }

    try {
      setSelling(true);
      await api.post('/products/direct-sale', {
        product_id: selectedProduct.id,
        quantity: Number(quantity),
        payment_method: paymentMethod
      });

      setSellSuccess(`¡Venta registrada con éxito! (${selectedProduct.name} x${quantity})`);
      setQuantity(1);
      setSelectedProduct(null);
      invalidateCache('products');
      await fetchProducts(true);
    } catch (err) {
      setSellError(err.message || 'Error al procesar la venta.');
    } finally {
      setSelling(false);
    }
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice('');
    setProdStock('');
    setProductError('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdPrice(prod.sale_price_pen);
    setProdStock(prod.stock);
    setProductError('');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setProductError('');

    const nameErr = validateText(prodName, 'Nombre del producto', 2, 100);
    const priceErr = validatePrice(prodPrice, 'Precio de venta');
    const stockErr = validateQuantity(prodStock, 'Stock inicial', 0, 99999);
    const firstErr = nameErr || priceErr || stockErr;
    if (firstErr) {
      setProductError(firstErr);
      return;
    }

    try {
      setSubmittingProduct(true);
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, {
          name: prodName.trim(),
          sale_price_pen: parseFloat(prodPrice),
          stock: parseInt(prodStock, 10) || 0
        });
      } else {
        await api.post('/products', {
          name: prodName.trim(),
          sale_price_pen: parseFloat(prodPrice),
          stock: parseInt(prodStock, 10) || 0
        });
      }

      invalidateCache('products');
      setIsProductModalOpen(false);
      await fetchProducts(true);
    } catch (err) {
      setProductError(err.message || 'Error guardando producto.');
    } finally {
      setSubmittingProduct(false);
    }
  };

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
            <span>+ Ingreso Almacén / Kardex</span>
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Producto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Venta Rápida */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Venta Rápida Mostrador</span>
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

          {sellError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sellError}</span>
            </div>
          )}

          <form onSubmit={handleDirectSale} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Producto</label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const prod = products.find((p) => p.id === e.target.value);
                  setSelectedProduct(prod || null);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="">-- Selecciona un producto --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} - {formatPEN(p.sale_price_pen)} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.stock || 99}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Total (S/)</label>
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-emerald-700 font-bold text-sm text-right">
                  {formatPEN((Number(selectedProduct?.sale_price_pen || 0) * Number(quantity || 1)).toFixed(2))}
                </div>
              </div>
            </div>

            {/* Medio de pago */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Medio de Pago</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('YAPE_PLIN')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'YAPE_PLIN'
                      ? 'bg-violet-50 border-violet-200 text-violet-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <QrCode className="w-3 h-3 text-violet-600" />
                  <span>Yape/Plin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Wallet className="w-3 h-3 text-emerald-600" />
                  <span>Efectivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CARD'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <CreditCard className="w-3 h-3 text-blue-600" />
                  <span>Tarjeta</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={selling || !selectedProduct || !hasActiveShift || selectedProduct.stock <= 0}
              className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2"
            >
              <span>{selling ? 'Procesando...' : 'Cobrar Venta'}</span>
            </button>
          </form>
        </div>

        {/* Catálogo e Inventario de Productos */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Inventario de Productos & Precios</h3>
            <button
              onClick={fetchProducts}
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
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatPEN(p.sale_price_pen)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
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
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar Producto */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Editar Producto / Stock' : 'Nuevo Producto en Tienda'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {productError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{productError}</span>
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingProduct}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
            >
              {submittingProduct ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Registrar Compra Almacén / Kardex */}
      <Modal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} title="Ingreso a Almacén / Registro de Compra (Kardex)">
        <form onSubmit={handleRegisterPurchase} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Producto</label>
            <select
              required
              value={purchaseProdId}
              onChange={(e) => setPurchaseProdId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            >
              <option value="">Seleccionar Producto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock actual: {p.stock})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad Comprada</label>
              <input
                type="number"
                min="1"
                required
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Unitario (S/)</label>
              <input
                type="number"
                step="0.10"
                min="0.10"
                required
                value={purchaseUnitCost}
                onChange={(e) => setPurchaseUnitCost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Proveedor / Distribuidor</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Ej: Distribuidora San José..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 flex justify-between font-bold">
            <span>Costo Total Compra:</span>
            <span>S/ {(Number(purchaseQty) * parseFloat(purchaseUnitCost || 0)).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingPurchase}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"
            >
              {submittingPurchase ? 'Registrando...' : 'Registrar en Almacén'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

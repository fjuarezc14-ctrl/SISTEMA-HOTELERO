import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { useShift } from '../context/ShiftContext';
import { ShoppingBag, Plus, QrCode, Wallet, CreditCard, AlertCircle, Check } from 'lucide-react';
import { Modal } from '../components/Modal';

export function StorePage() {
  const { hasActiveShift } = useShift();
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error('Error cargando productos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRegisterPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseProdId || purchaseQty <= 0 || !purchaseUnitCost) return;
    try {
      setSubmittingPurchase(true);
      await api.post('/products/purchase', {
        product_id: purchaseProdId,
        quantity: Number(purchaseQty),
        unit_cost_pen: parseFloat(purchaseUnitCost),
        supplier_name: supplierName
      });
      alert('Compra registrada correctamente. Stock actualizado en Almacén.');
      setIsPurchaseModalOpen(false);
      fetchProducts();
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

    try {
      setSelling(true);
      await api.post('/products/direct-sale', {
        product_id: selectedProduct.id,
        quantity: Number(quantity),
        payment_method: paymentMethod
      });

      setSellSuccess(`¡Venta realizada con éxito! (${selectedProduct.name} x${quantity})`);
      setSelectedProduct(null);
      setQuantity(1);
      await fetchProducts();
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
    setProdStock('10');
    setProductError('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.sale_price_pen);
    setProdStock(p.stock);
    setProductError('');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setProductError('');

    if (!prodName.trim() || !prodPrice) {
      setProductError('El nombre y el precio de venta son obligatorios.');
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

      setIsProductModalOpen(false);
      await fetchProducts();
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
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>Tienda / Snack Bar & Frigobar (Perú)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Venta directa por mostrador en Soles y control de inventario de bebidas/snacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Ingreso Almacén / Kardex</span>
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Producto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Venta Rápida */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Venta Rápida Mostrador</span>
          </h3>

          {!hasActiveShift && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Abre un turno de caja para procesar ventas.</span>
            </div>
          )}

          {sellSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{sellSuccess}</span>
            </div>
          )}

          {sellError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sellError}</span>
            </div>
          )}

          <form onSubmit={handleDirectSale} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Producto</label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const prod = products.find((p) => p.id === e.target.value);
                  setSelectedProduct(prod || null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.stock || 99}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Total (S/)</label>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold text-sm text-right">
                  {formatPEN((Number(selectedProduct?.sale_price_pen || 0) * Number(quantity || 1)).toFixed(2))}
                </div>
              </div>
            </div>

            {/* Medio de pago */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Medio de Pago</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('YAPE_PLIN')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'YAPE_PLIN'
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>Yape/Plin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Wallet className="w-3 h-3" />
                  <span>Efectivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CARD'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Tarjeta</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={selling || !selectedProduct || !hasActiveShift || selectedProduct.stock <= 0}
              className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-xs flex items-center justify-center gap-2"
            >
              <span>{selling ? 'Procesando...' : 'Cobrar Venta'}</span>
            </button>
          </form>
        </div>

        {/* Catálogo e Inventario de Productos */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Inventario de Productos & Precios</h3>
            <button
              onClick={fetchProducts}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Refrescar
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Cargando inventario...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Producto</th>
                    <th className="py-3 px-3 text-right">Precio Venta</th>
                    <th className="py-3 px-3 text-center">Stock Actual</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">{p.name}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatPEN(p.sale_price_pen)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            p.stock <= 5
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {p.stock} unid.
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="text-xs text-slate-400 hover:text-white transition-colors"
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
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{productError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Producto</label>
            <input
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="Ej: Gaseosa Coca Cola 500ml"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Precio de Venta (S/)</label>
              <input
                type="number"
                step="0.50"
                min="0.50"
                required
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="4.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Disponible</label>
              <input
                type="number"
                min="0"
                required
                value={prodStock}
                onChange={(e) => setProdStock(e.target.value)}
                placeholder="20"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingProduct}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Producto</label>
            <select
              required
              value={purchaseProdId}
              onChange={(e) => setPurchaseProdId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Seleccionar Producto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock actual: {p.stock})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cantidad Comprada</label>
              <input
                type="number"
                min="1"
                required
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Costo Unitario (S/)</label>
              <input
                type="number"
                step="0.10"
                min="0.10"
                required
                value={purchaseUnitCost}
                onChange={(e) => setPurchaseUnitCost(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Proveedor / Distribuidor</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Ej: Distribuidora San José..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex justify-between font-bold">
            <span>Costo Total Compra:</span>
            <span>S/ {(Number(purchaseQty) * parseFloat(purchaseUnitCost || 0)).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingPurchase}
              className="px-5 py-2 text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-500/20"
            >
              {submittingPurchase ? 'Registrando...' : 'Registrar en Almacén'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

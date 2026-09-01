import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, printElectronicVoucherTicket } from '../utils/formatters';
import { useShift } from '../context/ShiftContext';
import { useGlobalStore } from '../context/GlobalStoreContext';
import { validateText, validatePrice, validateQuantity, validateSupplierName } from '../utils/validators';
import { ProductCardGrid } from '../components/ProductCardGrid';
import { PaymentSelector } from '../components/PaymentSelector';
import { VoucherSelector } from '../components/VoucherSelector';
import { TicketPrintModal } from '../components/TicketPrintModal';
import { ShoppingBag, Plus, QrCode, Wallet, CreditCard, AlertCircle, Check, Bed, Printer } from 'lucide-react';
import { Modal } from '../components/Modal';

export function StorePage() {
  const { hasActiveShift } = useShift();
  const { getProducts, invalidateCache } = useGlobalStore();
  const [products, setProducts] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Venta Rápida de Mostrador
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedStayId, setSelectedStayId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [singleAmount, setSingleAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [selling, setSelling] = useState(false);
  const [sellSuccess, setSellSuccess] = useState('');
  const [sellError, setSellError] = useState('');

  // Comprobante Electrónico (Boleta / Factura SUNAT)
  const [voucherType, setVoucherType] = useState('NONE');
  const [rucNumber, setRucNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Ticket Modal
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState(null);

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
      setSellError('Debes seleccionar un producto del catálogo.');
      return;
    }

    const qtyErr = validateQuantity(quantity, 'Cantidad a vender', 1, selectedProduct.stock || 999);
    if (qtyErr) {
      setSellError(qtyErr);
      return;
    }

    const unitPrice = Number(selectedProduct.sale_price_pen || 0);
    const qtyNum = Number(quantity || 1);
    const totalSaleCost = unitPrice * qtyNum;

    if (paymentMethod === 'MIXED') {
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(splitSum - totalSaleCost) > 0.01) {
        setSellError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al total de la venta (${formatPEN(totalSaleCost)}).`);
        return;
      }
    }

    try {
      setSelling(true);
      const res = await api.post('/products/direct-sale', {
        product_id: selectedProduct.id,
        quantity: qtyNum,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
        stay_id: selectedStayId || null,
        voucher_type: voucherType,
        customer_ruc: rucNumber.trim(),
        customer_business_name: businessName.trim()
      });

      const linkedStay = activeStays.find((s) => s.id === selectedStayId);
      const linkedText = linkedStay ? ` (Vinculado a Hab. ${linkedStay.room_number})` : '';

      // Si seleccionó Boleta o Factura, gatillar impresor de comprobante electrónico
      if (voucherType !== 'NONE') {
        const isFactura = voucherType === 'FACTURA';
        printElectronicVoucherTicket({
          voucherType,
          customerDocType: isFactura ? 'RUC' : (linkedStay?.document_type || 'DNI'),
          customerDocNumber: isFactura ? rucNumber.trim() : (linkedStay?.document_number || '12345678'),
          customerName: isFactura ? businessName.trim() : (linkedStay ? linkedStay.customer_name : 'CLIENTE MOSTRADOR'),
          customerAddress: isFactura ? businessAddress.trim() : '',
          paymentMethod: paymentMethod === 'MIXED' ? 'PAGO MIXTO' : paymentMethod,
          totalAmount: totalSaleCost,
          items: [
            {
              qty: qtyNum,
              description: selectedProduct.name,
              price: totalSaleCost
            }
          ]
        });
      } else {
        // Generar ticket de venta interno estándar
        const newTicketData = {
          ticket_number: `TND-${Date.now().toString().slice(-6)}`,
          date: new Date(),
          customer_name: linkedStay ? linkedStay.customer_name : 'Cliente Mostrador',
          room_number: linkedStay ? linkedStay.room_number : null,
          total_amount: totalSaleCost,
          payment_method: paymentMethod === 'MIXED' ? 'Pago Mixto' : paymentMethod,
          items: [
            {
              name: selectedProduct.name,
              quantity: qtyNum,
              unit_price: unitPrice,
              total_price: totalSaleCost
            }
          ]
        };

        setTicketData(newTicketData);
        setIsTicketModalOpen(true);
      }

      setSellSuccess(`¡Venta procesada con éxito! (${selectedProduct.name} x${qtyNum})${linkedText}`);

      // Resetear estado del formulario
      setQuantity(1);
      setSelectedProduct(null);
      setSelectedStayId('');
      setReferenceNumber('');
      setSplitPayments([]);
      setVoucherType('NONE');
      setRucNumber('');
      setBusinessName('');
      setBusinessAddress('');
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Panel de Venta Rápida (Ampliación Principal) */}
        <div className="xl:col-span-7 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
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
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Seleccionar Producto del Catálogo
              </label>
              <ProductCardGrid
                products={products}
                selectedProductId={selectedProduct?.id}
                onSelectProduct={(p) => {
                  setSelectedProduct(p);
                  setQuantity(1);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            {/* Vincular a Habitación (Opcional) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vincular a Habitación Ocupada (Opcional)</span>
              </label>
              <select
                value={selectedStayId}
                onChange={(e) => setSelectedStayId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
              >
                <option value="">-- Ninguna (Venta a Cliente Externo / Mostrador) --</option>
                {activeStays.map((s) => (
                  <option key={s.id} value={s.id}>
                    Hab. {s.room_number} — Huésped: {s.customer_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Medio de pago con Pago Mixto */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Medio de Pago</label>
              <PaymentSelector
                totalAmount={Number(selectedProduct?.sale_price_pen || 0) * Number(quantity || 1)}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                singleAmount={singleAmount || String(Number(selectedProduct?.sale_price_pen || 0) * Number(quantity || 1))}
                setSingleAmount={setSingleAmount}
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                splitPayments={splitPayments}
                setSplitPayments={setSplitPayments}
              />
            </div>

            {/* Selector de Comprobante Electrónico (Boleta / Factura SUNAT) */}
            <VoucherSelector
              voucherType={voucherType}
              setVoucherType={setVoucherType}
              customerDoc={activeStays.find((s) => s.id === selectedStayId)?.document_number || ''}
              customerName={activeStays.find((s) => s.id === selectedStayId)?.customer_name || ''}
              rucNumber={rucNumber}
              setRucNumber={setRucNumber}
              businessName={businessName}
              setBusinessName={setBusinessName}
              businessAddress={businessAddress}
              setBusinessAddress={setBusinessAddress}
            />

            <button
              type="submit"
              disabled={selling || !selectedProduct || !hasActiveShift || selectedProduct.stock <= 0}
              className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2"
            >
              <span>{selling ? 'Procesando...' : 'Cobrar Venta'}</span>
            </button>
          </form>
        </div>

        {/* Catálogo e Inventario de Productos (Columna Secundaria 5/12) */}
        <div className="xl:col-span-5 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
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

      {/* Ticket Modal para Impresión/WhatsApp de Venta Tienda */}
      <TicketPrintModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        ticketData={ticketData}
      />
    </div>
  );
}

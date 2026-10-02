import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/apiClient';
import { validatePrice, validateQuantity, validateSupplierName } from '../../utils/validators';

/** Ingreso a almacén: registra una compra de stock en el Kardex */
export function StockPurchaseModal({ isOpen, onClose, products = [], onSaved }) {
  const [purchaseProdId, setPurchaseProdId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(10);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('1.50');
  const [supplierName, setSupplierName] = useState('Distribuidora San José');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
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
      setSubmitting(true);
      await api.post('/products/purchase', {
        product_id: purchaseProdId,
        quantity: Number(purchaseQty),
        unit_cost_pen: parseFloat(purchaseUnitCost),
        supplier_name: supplierName.trim()
      });
      alert('Compra registrada correctamente. Stock actualizado en Almacén.');
      onClose();
      await onSaved?.();
    } catch (err) {
      alert(err.message || 'Error registrando compra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ingreso a Almacén / Registro de Compra (Kardex)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Producto</label>
          <select
            required
            value={purchaseProdId}
            onChange={(e) => setPurchaseProdId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          >
            <option value="">Seleccionar Producto</option>
            {products.map((p) => (
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
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-500 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"
          >
            {submitting ? 'Registrando...' : 'Registrar en Almacén'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

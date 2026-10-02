import React, { useState } from 'react';
import { AlertCircle, Bed } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api/apiClient';
import { formatPEN } from '../../utils/formatters';
import { PaymentSelector } from '../payments/PaymentSelector';
import { VoucherSelector } from '../payments/VoucherSelector';
import { useReceipt } from '../../context/ReceiptContext';
import { storeSaleReceipt } from '../../utils/receipts';

/** Cobro de la venta de mostrador: cliente, medios de pago, vuelto y comprobante */
export function StoreCheckoutModal({
  isOpen,
  onClose,
  cart,
  cartTotal,
  itemCount,
  toApiItems,
  activeStays = [],
  hasActiveShift,
  onSold
}) {
  const { printReceipt } = useReceipt();
  const [selectedStayId, setSelectedStayId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [singleAmount, setSingleAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [cashReceived, setCashReceived] = useState('');
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState('');

  // Comprobante Electrónico (Boleta / Factura SUNAT)
  const [voucherType, setVoucherType] = useState('NONE');
  const [rucNumber, setRucNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const linkedStay = activeStays.find((s) => s.id === selectedStayId);

  // Parte de la venta que se paga en efectivo (para calcular el vuelto)
  const cashDue =
    paymentMethod === 'CASH'
      ? cartTotal
      : paymentMethod === 'MIXED'
      ? Number(splitPayments.find((sp) => sp.payment_method === 'CASH')?.amount || 0)
      : 0;
  const change = cashReceived === '' ? 0 : Number(cashReceived) - cashDue;

  const resetForm = () => {
    setSelectedStayId('');
    setSingleAmount('');
    setReferenceNumber('');
    setSplitPayments([]);
    setVoucherType('NONE');
    setRucNumber('');
    setBusinessName('');
    setBusinessAddress('');
    setCashReceived('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSellError('');

    if (cart.length === 0) {
      setSellError('Agrega al menos un producto al carrito.');
      return;
    }

    const totalSaleCost = cartTotal;

    if (paymentMethod === 'MIXED') {
      if (splitPayments.some((p) => parseFloat(p.amount) < 0)) {
        setSellError('Los montos del pago mixto no pueden ser negativos.');
        return;
      }
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(splitSum - totalSaleCost) > 0.01) {
        setSellError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al total de la venta (${formatPEN(totalSaleCost)}).`);
        return;
      }
    }

    if (cashReceived !== '') {
      const rec = Number(cashReceived);
      if (rec < 0) {
        setSellError('El efectivo recibido no puede ser negativo.');
        return;
      }
      if (rec < cashDue - 0.001) {
        setSellError(`El efectivo recibido (${formatPEN(cashReceived)}) es menor al monto en efectivo (${formatPEN(cashDue)}).`);
        return;
      }
    }

    try {
      setSelling(true);
      const res = await api.post('/products/direct-sale', {
        items: toApiItems(),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
        stay_id: selectedStayId || null,
        voucher_type: voucherType,
        customer_ruc: rucNumber.trim(),
        customer_business_name: businessName.trim()
      });

      // Comprobante unificado (ticket, boleta o factura con número correlativo del servidor)
      const tx = res.data;
      printReceipt(
        storeSaleReceipt({
          tx,
          cart,
          customer: linkedStay
            ? { name: linkedStay.customer_name, doc_type: linkedStay.document_type, doc_number: linkedStay.document_number }
            : { name: 'CLIENTE VARIOS' },
          roomNumber: linkedStay?.room_number,
          payments:
            paymentMethod === 'MIXED'
              ? splitPayments.filter((sp) => Number(sp.amount) > 0).map((sp) => ({ method: sp.payment_method, amount: Number(sp.amount), reference: sp.reference_number }))
              : [{ method: paymentMethod, amount: totalSaleCost, reference: referenceNumber.trim() }]
        })
      );

      const linkedText = linkedStay ? ` (Vinculado a Hab. ${linkedStay.room_number})` : '';
      const changeText = cashReceived !== '' && change > 0 ? ` · Vuelto: ${formatPEN(change)}` : '';
      resetForm();
      onClose();
      await onSold?.(`¡Venta procesada con éxito! (${itemCount} producto(s) · ${formatPEN(totalSaleCost)})${linkedText}${changeText}`);
    } catch (err) {
      setSellError(err.message || 'Error al procesar la venta.');
    } finally {
      setSelling(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cobrar Venta" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {sellError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sellError}</span>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-xs font-bold text-emerald-900">
            {itemCount} producto(s)
          </span>
          <span className="text-xl font-black font-mono text-emerald-700">{formatPEN(cartTotal)}</span>
        </div>

        {/* Vincular a Habitación (Opcional) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Bed className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cliente · huésped de una habitación o cliente de mostrador</span>
          </label>
          <select
            value={selectedStayId}
            onChange={(e) => setSelectedStayId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
          >
            <option value="">Cliente de mostrador (sin habitación)</option>
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
            totalAmount={cartTotal}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            singleAmount={singleAmount || String(cartTotal)}
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
          customerDoc={linkedStay?.document_number || ''}
          customerName={linkedStay?.customer_name || ''}
          rucNumber={rucNumber}
          setRucNumber={setRucNumber}
          businessName={businessName}
          setBusinessName={setBusinessName}
          businessAddress={businessAddress}
          setBusinessAddress={setBusinessAddress}
        />

        {/* Efectivo recibido y vuelto */}
        {cashDue > 0 && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Paga con (S/)</label>
              <input
                type="number"
                step="0.10"
                min="0"
                placeholder={cashDue.toFixed(2)}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vuelto</label>
              <div
                className={`p-2.5 rounded-xl border text-sm font-mono font-black text-right ${
                  cashReceived === ''
                    ? 'bg-white border-slate-200 text-slate-400'
                    : change < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                {cashReceived === '' ? formatPEN(0) : change < 0 ? `Falta ${formatPEN(-change)}` : formatPEN(change)}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Volver al carrito
          </button>
          <button
            type="submit"
            disabled={selling || cart.length === 0 || !hasActiveShift}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all text-xs"
          >
            {selling ? 'Procesando...' : `Confirmar cobro ${formatPEN(cartTotal)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

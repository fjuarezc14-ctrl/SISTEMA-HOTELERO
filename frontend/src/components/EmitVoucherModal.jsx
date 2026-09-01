import React, { useState } from 'react';
import { Modal } from './Modal';
import { VoucherSelector } from './VoucherSelector';
import { api } from '../api/apiClient';
import { formatPEN, printElectronicVoucherTicket } from '../utils/formatters';
import { Printer, CheckCircle2, AlertCircle } from 'lucide-react';

export function EmitVoucherModal({ isOpen, onClose, transaction, onSuccess }) {
  const [voucherType, setVoucherType] = useState('BOLETA'); // BOLETA | FACTURA
  const [rucNumber, setRucNumber] = useState(transaction?.customer_ruc || '');
  const [businessName, setBusinessName] = useState(transaction?.customer_business_name || '');
  const [businessAddress, setBusinessAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!transaction) return null;

  const isFactura = voucherType === 'FACTURA';
  const amount = Number(transaction.amount_pen || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (voucherType === 'NONE') {
      setError('Selecciona Boleta o Factura para emitir el comprobante.');
      return;
    }
    if (isFactura && (!rucNumber || rucNumber.length < 11)) {
      setError('Ingresa un RUC válido de 11 dígitos para la Factura.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const generatedSeries = isFactura ? 'F001' : 'B001';
      const generatedNum = transaction.voucher_number || String(Math.floor(Math.random() * 899999 + 100000));
      const fullVoucherNum = `${generatedSeries}-${generatedNum}`;

      // Actualizar transacción en el backend
      await api.patch(`/cash/transactions/${transaction.id}/voucher`, {
        voucher_type: voucherType,
        voucher_number: fullVoucherNum,
        customer_ruc: isFactura ? rucNumber.trim() : '',
        customer_business_name: isFactura ? businessName.trim() : ''
      });

      // Gatillar impresor 80mm en modo simulación SUNAT
      printElectronicVoucherTicket({
        voucherType,
        voucherSeries: generatedSeries,
        voucherNumber: generatedNum,
        customerDocType: isFactura ? 'RUC' : 'DNI',
        customerDocNumber: isFactura ? rucNumber.trim() : '',
        customerName: isFactura ? businessName.trim() : (transaction.concept || 'CLIENTE'),
        customerAddress: isFactura ? businessAddress.trim() : '',
        paymentMethod: transaction.payment_method || 'EFECTIVO',
        totalAmount: amount,
        items: [
          {
            qty: 1,
            description: transaction.concept || 'Servicio General',
            price: amount
          }
        ]
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al emitir el comprobante electrónico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📄 Emitir Comprobante Electrónico (SUNAT)"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Resumen del Movimiento */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Concepto / Operación:</span>
            <span className="font-mono text-slate-700 font-bold">{transaction.category?.toUpperCase()}</span>
          </div>
          <div className="font-black text-slate-900 text-sm truncate">{transaction.concept}</div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
            <span className="text-slate-600 font-bold">Monto Registrado en Caja:</span>
            <span className="font-mono text-base font-black text-emerald-700">{formatPEN(amount)}</span>
          </div>
        </div>

        {/* Selector de Comprobante */}
        <VoucherSelector
          voucherType={voucherType}
          setVoucherType={setVoucherType}
          customerDoc={transaction.reference_number}
          customerName={transaction.concept}
          rucNumber={rucNumber}
          setRucNumber={setRucNumber}
          businessName={businessName}
          setBusinessName={setBusinessName}
          businessAddress={businessAddress}
          setBusinessAddress={setBusinessAddress}
        />

        {/* Botones de acción */}
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
            disabled={loading}
            className="px-5 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>{loading ? 'Generando Comprobante...' : 'Emitir e Imprimir Ticket 80mm'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

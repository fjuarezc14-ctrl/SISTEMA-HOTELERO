import React, { useState, useEffect } from 'react';
import { Wallet, QrCode, CreditCard, Layers, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatPEN } from '../utils/formatters';

export function PaymentSelector({
  totalAmount = 0,
  paymentMethod,
  setPaymentMethod,
  singleAmount,
  setSingleAmount,
  referenceNumber,
  setReferenceNumber,
  splitPayments,
  setSplitPayments
}) {
  const targetTotal = Number(totalAmount || 0);

  // Inicializar o ajustar montos al cambiar a Pago Mixto
  useEffect(() => {
    if (paymentMethod === 'MIXED') {
      if (!splitPayments || splitPayments.length === 0) {
        setSplitPayments([
          { payment_method: 'CASH', amount: (targetTotal / 2).toFixed(2), reference_number: '' },
          { payment_method: 'YAPE_PLIN', amount: (targetTotal / 2).toFixed(2), reference_number: '' },
          { payment_method: 'CARD', amount: '0.00', reference_number: '' }
        ]);
      }
    }
  }, [paymentMethod, targetTotal]);

  const handleSplitAmountChange = (index, value) => {
    const updated = [...splitPayments];
    updated[index].amount = value;
    setSplitPayments(updated);
  };

  const handleSplitRefChange = (index, value) => {
    const updated = [...splitPayments];
    updated[index].reference_number = value;
    setSplitPayments(updated);
  };

  const currentSplitSum = Array.isArray(splitPayments)
    ? splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
    : 0;

  const isBalanced = Math.abs(currentSplitSum - targetTotal) < 0.01;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-700">Medio / Tipo de Pago</label>
      
      {/* 4 Botones de Selección */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setPaymentMethod('CASH')}
          className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'CASH'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Efectivo S/</span>
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod('YAPE_PLIN')}
          className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'YAPE_PLIN'
              ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Yape / Plin</span>
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod('CARD')}
          className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'CARD'
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Tarjeta POS</span>
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod('MIXED')}
          className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'MIXED'
              ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pago Mixto</span>
        </button>
      </div>

      {/* Caso Pago Único (Efectivo / Yape / Tarjeta) */}
      {paymentMethod !== 'MIXED' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Monto a Cobrar (S/)</label>
            <input
              type="number"
              step="0.50"
              min="0"
              value={singleAmount}
              onChange={(e) => setSingleAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {paymentMethod !== 'CASH' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">N° Operación / Voucher (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Op 845920"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}
        </div>
      )}

      {/* Caso Pago Mixto (Desglose por los 3 tipos de pago) */}
      {paymentMethod === 'MIXED' && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Desglose de Pago Mixto</span>
            </span>
            <span className={`text-xs font-mono font-black ${isBalanced ? 'text-emerald-700' : 'text-rose-600'}`}>
              Suma: {formatPEN(currentSplitSum)} / Total: {formatPEN(targetTotal)}
            </span>
          </div>

          {/* Desglose de los 3 medios */}
          <div className="space-y-2">
            {Array.isArray(splitPayments) && splitPayments.map((split, idx) => {
              const label = split.payment_method === 'CASH'
                ? 'Efectivo S/'
                : split.payment_method === 'YAPE_PLIN'
                ? 'Yape / Plin'
                : 'Tarjeta POS';
              
              return (
                <div key={split.payment_method} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {split.payment_method === 'CASH' && <Wallet className="w-3.5 h-3.5 text-emerald-600" />}
                    {split.payment_method === 'YAPE_PLIN' && <QrCode className="w-3.5 h-3.5 text-violet-600" />}
                    {split.payment_method === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                    <span>{label}</span>
                  </span>

                  <div>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      placeholder="Monto S/"
                      value={split.amount}
                      onChange={(e) => handleSplitAmountChange(idx, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {split.payment_method !== 'CASH' ? (
                    <div>
                      <input
                        type="text"
                        placeholder="N° Voucher / Op."
                        value={split.reference_number || ''}
                        onChange={(e) => handleSplitRefChange(idx, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-medium px-2">Efectivo directo en caja</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Estado de Balance */}
          <div className="pt-1">
            {isBalanced ? (
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-100/60 p-2 rounded-xl border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pago mixto verificado y cuadradito correctamente.</span>
              </div>
            ) : (
              <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1.5 bg-rose-100/60 p-2 rounded-xl border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>La suma ({formatPEN(currentSplitSum)}) no coincide con el total a cobrar ({formatPEN(targetTotal)}).</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

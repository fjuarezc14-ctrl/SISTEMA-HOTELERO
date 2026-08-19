import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru, PAYMENT_METHOD_LABELS } from '../utils/formatters';
import { LogOut, AlertCircle, QrCode, Wallet, CreditCard, ShoppingBag, Receipt } from 'lucide-react';

export function CheckOutModal({ isOpen, onClose, room, onSuccess }) {
  const [stayData, setStayData] = useState(null);
  const [loadingStay, setLoadingStay] = useState(false);
  const [finalPaymentAmount, setFinalPaymentAmount] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (room && isOpen) {
      const fetchStay = async () => {
        try {
          setLoadingStay(true);
          const res = await api.get(`/stays/room/${room.id}`);
          setStayData(res.data);
          
          // Calcular saldo pendiente
          if (res.data) {
            const stayPrice = Number(res.data.total_stay_price_pen || 0);
            const consumptions = Number(res.data.total_consumptions_price_pen || 0);
            const paid = Number(res.data.total_paid_pen || 0);
            const pending = Math.max(0, stayPrice + consumptions - paid);
            setFinalPaymentAmount(pending.toFixed(2));
          }
        } catch (err) {
          setError(err.message || 'Error cargando estadía.');
        } finally {
          setLoadingStay(false);
        }
      };
      fetchStay();
    }
  }, [room, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stayData) return;

    try {
      setLoading(true);
      setError('');
      const amountToPay = parseFloat(finalPaymentAmount) || 0;

      await api.post('/stays/checkout', {
        stay_id: stayData.id,
        final_payment: amountToPay > 0 ? {
          amount: amountToPay,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim()
        } : null
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al procesar el Check-out.');
    } finally {
      setLoading(false);
    }
  };

  if (!room) return null;

  const stayPrice = Number(stayData?.total_stay_price_pen || 0);
  const consumptionsPrice = Number(stayData?.total_consumptions_price_pen || 0);
  const totalAmount = stayPrice + consumptionsPrice;
  const totalPaid = Number(stayData?.total_paid_pen || 0);
  const pendingBalance = Math.max(0, totalAmount - totalPaid);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Check-out: Habitación ${room.room_number}`}
      maxWidth="max-w-xl"
    >
      {loadingStay ? (
        <div className="py-8 text-center text-slate-400 text-xs">Cargando estado de la cuenta...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Información del Huésped y Tiempos */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Huésped:</span>
              <span className="font-bold text-white text-sm">{stayData?.customer_name || 'Desconocido'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Documento:</span>
              <span className="font-mono text-slate-200">{stayData?.document_type} {stayData?.document_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Hora Ingreso:</span>
              <span className="text-slate-300">{formatDatePeru(stayData?.start_time)}</span>
            </div>
          </div>

          {/* Desglose de Cuenta */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              <span>Estado de Cuenta (Soles)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Hospedaje ({stayData?.stay_type}):</span>
              <span className="font-semibold">{formatPEN(stayPrice)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Consumos Tienda / Minibar:</span>
              <span className="font-semibold">{formatPEN(consumptionsPrice)}</span>
            </div>
            <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-800">
              <span>Total Abonado Previamente:</span>
              <span className="font-semibold">{formatPEN(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-700">
              <span>Saldo Pendiente de Cobro:</span>
              <span className={pendingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {formatPEN(pendingBalance)}
              </span>
            </div>
          </div>

          {/* Cobro del Saldo Pendiente */}
          {pendingBalance > 0 && (
            <div className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-xl space-y-3">
              <div className="text-xs font-semibold text-amber-400">Registrar Cobro de Liquidación</div>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('YAPE_PLIN')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'YAPE_PLIN'
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Yape / Plin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Efectivo S/</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === 'CARD'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Tarjeta</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Monto a Cobrar (S/)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={finalPaymentAmount}
                    onChange={(e) => setFinalPaymentAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Nro. Voucher / Ref.</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? 'Finalizando...' : 'Completar Salida (Enviar a Limpieza)'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { PaymentSelector } from './PaymentSelector';
import { validateQuantity } from '../utils/validators';
import { AlertCircle, Plus } from 'lucide-react';

export function ExtraHoursModal({ isOpen, onClose, room, onSuccess }) {
  const [hoursCount, setHoursCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [singleAmount, setSingleAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeStayId = room?.active_stay_id || room?.stay_id;

  if (!room || !activeStayId) return null;

  const pricePerExtraHour = Number(room.price_extra_hour_default || 10.00);
  const totalExtraCost = Number(hoursCount) * pricePerExtraHour;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qtyError = validateQuantity(hoursCount, 'Cantidad de horas', 1, 24);
    if (qtyError) { setError(qtyError); return; }

    if (paymentMethod === 'MIXED') {
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(splitSum - totalExtraCost) > 0.01) {
        setError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al monto de las horas extras (${formatPEN(totalExtraCost)}).`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await api.post(`/stays/${activeStayId}/extra-hours`, {
        hours_count: Number(hoursCount),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        split_payments: paymentMethod === 'MIXED' ? splitPayments : null
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar horas extras.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Añadir Horas Extras: Habitación ${room.room_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Cuarto */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium block">Huésped Activo:</span>
            <strong className="text-slate-900 text-sm">{room.customer_name}</strong>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-medium block">Tarifa Hora Extra:</span>
            <strong className="text-emerald-700 font-mono text-sm">{formatPEN(pricePerExtraHour)} / hora</strong>
          </div>
        </div>

        {/* Cantidad de Horas Extras */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cantidad de Horas a Extender</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => setHoursCount(num)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  hoursCount === num
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                +{num} {num === 1 ? 'Hora' : 'Horas'}
              </button>
            ))}
          </div>
          {/* Input libre para cantidades mayores */}
          <div className="mt-2 flex items-center gap-2">
            <label className="text-[11px] text-slate-500 font-medium shrink-0">Otra cantidad (1–24h):</label>
            <input
              type="number"
              min="1"
              max="24"
              value={hoursCount}
              onChange={(e) => setHoursCount(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
              className="w-20 bg-white border border-slate-300 rounded-xl p-1.5 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-emerald-600"
            />
            <span className="text-[11px] text-slate-400">horas</span>
          </div>
        </div>

        {/* Resumen de Cobro */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-900">Monto Total a Cobrar:</span>
          <span className="text-xl font-black text-emerald-700 font-mono">{formatPEN(totalExtraCost)}</span>
        </div>

        {/* Selección de Tipo de Pago con Pago Mixto */}
        <PaymentSelector
          totalAmount={totalExtraCost}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          singleAmount={singleAmount || totalExtraCost}
          setSingleAmount={setSingleAmount}
          referenceNumber={referenceNumber}
          setReferenceNumber={setReferenceNumber}
          splitPayments={splitPayments}
          setSplitPayments={setSplitPayments}
        />

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
            disabled={submitting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Procesando...' : 'Cobrar Horas Extras'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

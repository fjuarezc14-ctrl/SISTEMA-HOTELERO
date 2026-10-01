import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { useReceipt } from '../context/ReceiptContext';
import { checkOutReceipt } from '../utils/receipts';
import { PaymentSelector } from './PaymentSelector';
import { VoucherSelector } from './VoucherSelector';
import { LogOut, AlertCircle, Receipt, AlertTriangle } from 'lucide-react';

import { useGlobalStore } from '../context/GlobalStoreContext';

export function CheckOutModal({ isOpen, onClose, room, onSuccess }) {
  const { hotelInfo } = useGlobalStore();
  const { printReceipt } = useReceipt();
  const graceMinutes = hotelInfo?.grace_period_minutes !== undefined ? Number(hotelInfo.grace_period_minutes) : 10;
  const [stayData, setStayData] = useState(null);
  const [loadingStay, setLoadingStay] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);

  const [hasIncident, setHasIncident] = useState(false);
  const [incidentType, setIncidentType] = useState('damage');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentPenalty, setIncidentPenalty] = useState('0.00');

  // Estados de Comprobante Electrónico (Boleta / Factura SUNAT)
  const [voucherType, setVoucherType] = useState('NONE'); // NONE | BOLETA | FACTURA
  const [rucNumber, setRucNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  useEffect(() => {
    if (room && isOpen) {
      const fetchStay = async () => {
        try {
          setLoadingStay(true);
          const res = await api.get(`/stays/room/${room.id}`);
          setStayData(res.data);
          
        } catch (err) {
          setError(err.message || 'Error cargando estadía.');
        } finally {
          setLoadingStay(false);
        }
      };
      setQuote(null);
      setError('');
      setHasIncident(false);
      setIncidentDescription('');
      setIncidentPenalty('0.00');
      setReferenceNumber('');
      setSplitPayments([]);
      fetchStay();
    }
  }, [room, isOpen]);

  // Saldo calculado por el backend (incluye horas extra por salir tarde y la penalidad)
  const penaltyVal = hasIncident ? Math.max(0, parseFloat(incidentPenalty) || 0) : 0;
  useEffect(() => {
    if (!isOpen || !stayData?.id) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get(`/stays/${stayData.id}/checkout-quote?penalty_amount_pen=${penaltyVal}`)
        .then((res) => !cancelled && setQuote(res.data))
        .catch((err) => !cancelled && setError(err.message || 'No se pudo calcular el saldo.'));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, stayData?.id, penaltyVal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Si la habitación figura como ocupada pero no hay estadía registrada en BD, permitir liberar e ir a limpieza
    if (!stayData) {
      try {
        setLoading(true);
        setError('');
        await api.patch(`/rooms/${room.id}/status`, { status: 'cleaning' });
        onSuccess();
        onClose();
      } catch (err) {
        setError(err.message || 'Error al enviar habitación a limpieza.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!quote) {
      setError('Espera el cálculo del saldo.');
      return;
    }
    if (hasIncident && !incidentDescription.trim()) {
      setError('Describe la novedad o daño de la habitación.');
      return;
    }
    const amountToPay = Number(quote.amount_due || 0);

    if (amountToPay > 0 && paymentMethod === 'MIXED') {
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(splitSum - amountToPay) > 0.01) {
        setError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al saldo a cobrar (${formatPEN(amountToPay)}).`);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      const res = await api.post('/stays/checkout', {
        stay_id: stayData.id,
        final_payment: amountToPay > 0 ? {
          amount: amountToPay,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim(),
          split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
          voucher_type: voucherType,
          customer_ruc: rucNumber.trim(),
          customer_business_name: businessName.trim()
        } : null,
        incident_data: hasIncident ? {
          incident_type: incidentType,
          description: incidentDescription,
          penalty_amount_pen: penaltyVal
        } : null
      });

      // Comprobante del cobro final (ticket, boleta o factura)
      if (res?.data?.checkout_summary?.paid_now > 0) {
        printReceipt(
          checkOutReceipt({
            result: res.data,
            room,
            customer: { name: stayData.customer_name, doc_type: stayData.document_type, doc_number: stayData.document_number }
          })
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al procesar el Check-out.');
    } finally {
      setLoading(false);
    }
  };

  if (!room) return null;

  const stayPrice = Number(quote?.stay_price ?? stayData?.total_stay_price_pen ?? 0);
  const consumptionsPrice = Number(quote?.consumptions ?? stayData?.total_consumptions_price_pen ?? 0);
  const totalPaid = Number(quote?.paid ?? stayData?.total_paid_pen ?? 0);
  const amountDue = Number(quote?.amount_due || 0);

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
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {!stayData && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
              <span>ℹ️ Esta habitación figura como ocupada pero sin registros de estadía activos. Puedes presionar el botón inferior para enviarla directamente a Limpieza y liberarla.</span>
            </div>
          )}

          {quote?.overstay_hours > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                ⏰ SOBRESTADÍA: superó la hora de salida y la tolerancia de {graceMinutes} min. Se cobran {quote.overstay_hours} hora(s)
                adicional(es): {formatPEN(quote.overstay_cost)}.
              </span>
            </div>
          )}

          {/* Información del Huésped y Tiempos */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-semibold">Huésped:</span>
              <span className="font-black text-slate-900 text-base">{stayData?.customer_name || 'Desconocido'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-semibold">Documento:</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{stayData?.document_type} {stayData?.document_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-semibold">Hora Ingreso:</span>
              <span className="text-slate-800 font-medium text-xs">{formatDatePeru(stayData?.start_time)}</span>
            </div>
          </div>

          {/* Desglose de Cuenta */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5 text-xs shadow-sm">
            <div className="font-bold text-emerald-700 uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>ESTADO DE CUENTA (SOLES)</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Hospedaje ({stayData?.stay_type}):</span>
              <span className="font-bold font-mono text-slate-900">{formatPEN(stayPrice)}</span>
            </div>
            {quote?.overstay_cost > 0 && (
              <div className="flex justify-between text-amber-800 font-medium">
                <span>Horas extra por salida tardía ({quote.overstay_hours}h):</span>
                <span className="font-bold font-mono">{formatPEN(quote.overstay_cost)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Consumos Tienda / Minibar:</span>
              <span className="font-bold font-mono text-slate-900">{formatPEN(consumptionsPrice)}</span>
            </div>
            {penaltyVal > 0 && (
              <div className="flex justify-between text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                <span>Penalidad / Daño registrado:</span>
                <span className="font-mono text-rose-800">+{formatPEN(penaltyVal)}</span>
              </div>
            )}
            <div className="flex justify-between text-emerald-700 font-bold pt-1.5 border-t border-slate-100">
              <span>Total Abonado Previamente:</span>
              <span className="font-mono text-sm">{formatPEN(totalPaid)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
              <span className="font-black text-slate-900">Total Saldo a Cobrar:</span>
              <span className={`font-mono text-base font-black ${amountDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {quote ? formatPEN(amountDue) : '—'}
              </span>
            </div>
          </div>

          {/* Sección Opcional: Registrar Incidente en Salida */}
          <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-900">
              <input
                type="checkbox"
                checked={hasIncident}
                onChange={(e) => setHasIncident(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
              />
              <span>⚠️ ¿Ocurrió alguna novedad o daño en la habitación?</span>
            </label>

            {hasIncident && (
              <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-2.5 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipo de Ocurrencia</label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                    >
                      <option value="damage">Rotura / Daño a Propiedad</option>
                      <option value="loss">Faltante de Toalla / Llave / Control</option>
                      <option value="unpaid_debt">Deuda No Sal dada</option>
                      <option value="disturbance">Disturbio / Ruido Molesto</option>
                      <option value="other">Otro Motivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cobro por Penalidad (S/)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={incidentPenalty}
                      onChange={(e) => setIncidentPenalty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-rose-900 font-mono font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Detalle del Incidente</label>
                  <textarea
                    rows={2}
                    required={hasIncident}
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    placeholder="Ej: Copa de vidrio rota en velador, toalla de cuerpo manchada..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cobro del Saldo Pendiente con Pago Mixto */}
          {amountDue > 0 && (
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 shadow-sm">
              <PaymentSelector
                totalAmount={amountDue}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                singleAmount={amountDue.toFixed(2)}
                setSingleAmount={() => {}}
                amountReadOnly
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                splitPayments={splitPayments}
                setSplitPayments={setSplitPayments}
              />
            </div>
          )}

          {/* Selector de Comprobante Electrónico (Boleta / Factura SUNAT) */}
          <VoucherSelector
            voucherType={voucherType}
            setVoucherType={setVoucherType}
            customerDoc={stayData?.document_number || ''}
            customerName={stayData?.customer_name || ''}
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
              disabled={loading || (stayData && !quote)}
              className="px-5 py-2.5 text-xs font-bold bg-rose-600 disabled:opacity-50 hover:bg-rose-500 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? 'Finalizando...' : amountDue > 0 ? `Cobrar ${formatPEN(amountDue)} y Completar Salida` : 'Completar Salida (Enviar a Limpieza)'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

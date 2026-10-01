import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { PaymentSelector } from './PaymentSelector';
import { VoucherSelector } from './VoucherSelector';
import { CustomerFields, EMPTY_CUSTOMER, customerToForm } from './CustomerFields';
import { useReceipt } from '../context/ReceiptContext';
import { checkInReceipt } from '../utils/receipts';
import { UserCheck, AlertCircle, Clock, ShieldAlert, CalendarClock } from 'lucide-react';
import { StayDurationPicker } from './StayDurationPicker';
import { validateDocument, validateFullName, validatePhone } from '../utils/validators';

/**
 * Check-in de una habitación (walk-in o desde una reserva).
 * El precio, la salida y el saldo los calcula el backend (/stays/quote); aquí solo se muestran.
 */
export function CheckInModal({ isOpen, onClose, room, reservationData = null, upcomingReservation = null, onSuccess }) {
  const fromReservation = Boolean(reservationData);

  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [companionName, setCompanionName] = useState('');

  const [stayType, setStayType] = useState('overnight');
  const [units, setUnits] = useState(1); // noches/días u horas según la modalidad

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');

  // Comprobante SUNAT
  const [voucherType, setVoucherType] = useState('NONE');
  const [rucNumber, setRucNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Cobro del saldo
  const [payNow, setPayNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { printReceipt } = useReceipt();


  // Inicializar solo al abrir el modal
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setCompanionName('');
      setStayType('overnight');
      setUnits(1);
      setVoucherType('NONE');
      setRucNumber('');
      setBusinessName('');
      setBusinessAddress('');
      setPayNow(true);
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setSplitPayments([]);
      setError('');
      setQuote(null);
      if (reservationData) {
        // Cliente de la reserva: datos autocompletados y bloqueados
        setCustomer(
          customerToForm({
            document_type: reservationData.document_type,
            document_number: reservationData.customer_document,
            full_name: reservationData.customer_name,
            phone: reservationData.customer_phone
          })
        );
        setSelectedCustomer(null);
      } else {
        setCustomer(EMPTY_CUSTOMER);
        setSelectedCustomer(null);
      }
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Cotización del backend (precio, salida, abono, saldo y conflictos con reservas)
  useEffect(() => {
    if (!isOpen || !room) return;
    let cancelled = false;
    const params = new URLSearchParams({ room_id: room.id });
    if (fromReservation) {
      params.set('reservation_id', reservationData.id);
    } else {
      params.set('stay_type', stayType);
      params.set('units', String(units));
    }
    setQuoteError('');
    api
      .get(`/stays/quote?${params.toString()}`)
      .then((res) => !cancelled && setQuote(res.data))
      .catch((err) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(err.message || 'No se pudo calcular la tarifa.');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, room?.id, fromReservation, reservationData?.id, stayType, units]);

  const amountDue = Number(quote?.amount_due || 0);
  const isBlacklisted = Boolean(selectedCustomer?.is_blacklisted);
  const hasConflict = Boolean(quote?.conflict);
  const charging = payNow && amountDue > 0;

  // Aviso de próxima reserva solo si llega en los próximos 3 días
  const nextReservation = quote?.next_reservation || upcomingReservation;
  const showNextReservation =
    !fromReservation &&
    nextReservation &&
    new Date(nextReservation.start_date).getTime() - Date.now() <= 3 * 86400000;

  const handleClose = () => onClose();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isBlacklisted) {
      setError('⛔ No se puede procesar el Check-in porque el cliente se encuentra en LISTA NEGRA.');
      return;
    }
    if (!quote) {
      setError(quoteError || 'Espera el cálculo de la tarifa.');
      return;
    }
    if (hasConflict) {
      setError(quote.conflict);
      return;
    }

    if (!fromReservation) {
      const err =
        validateDocument(customer.document_type, customer.document_number) ||
        validateFullName(customer.full_name) ||
        validatePhone(customer.phone, false);
      if (err) {
        setError(err);
        return;
      }
    }

    if (charging && paymentMethod === 'MIXED') {
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(splitSum - amountDue) > 0.01) {
        setError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al monto a cobrar (${formatPEN(amountDue)}).`);
        return;
      }
    }

    const initialPayment = charging
      ? {
          amount: amountDue,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim(),
          split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
          voucher_type: voucherType,
          customer_ruc: rucNumber.trim(),
          customer_business_name: businessName.trim()
        }
      : null;

    try {
      setLoading(true);
      let res;
      if (fromReservation) {
        res = await api.post(`/reservations/${reservationData.id}/checkin`, {
          companion_name: companionName.trim(),
          initial_payment: initialPayment
        });
      } else {
        res = await api.post('/stays/checkin', {
          room_id: room.id,
          customer_data: {
            document_type: customer.document_type,
            document_number: customer.document_number.trim(),
            full_name: customer.full_name.trim(),
            phone: customer.phone.trim()
          },
          stay_type: stayType,
          units: Number(units),
          companion_name: companionName.trim(),
          initial_payment: initialPayment
        });
      }
      // Comprobante del cobro realizado al ingresar
      if (res?.data?.paid_now > 0) {
        printReceipt(
          checkInReceipt({
            stay: res.data,
            room,
            quote,
            customer: { name: customer.full_name, doc_type: customer.document_type, doc_number: customer.document_number }
          })
        );
      }
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.message || 'Error al procesar el Check-in.');
    } finally {
      setLoading(false);
    }
  };

  if (!room) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={fromReservation ? `Check-in de Reserva: Habitación ${room.room_number}` : `Check-in: Habitación ${room.room_number} (${room.room_type_name || 'Estándar'})`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Abono de la reserva */}
        {fromReservation && (
          <div className="p-3 bg-violet-100 border border-violet-300 rounded-2xl text-violet-950 text-xs flex flex-wrap items-center justify-between gap-2 font-extrabold">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-700 shrink-0" />
              <span>RESERVA DE: {reservationData.customer_name}</span>
            </div>
            <span className="inline-flex items-center justify-center text-center leading-tight align-middle px-2.5 py-1 bg-violet-700 text-white rounded-xl text-[10px] uppercase tracking-wider font-mono">
              Abono inicial pagado: {formatPEN(reservationData.deposit_amount_pen)}
            </span>
          </div>
        )}

        {/* Conflicto con una reserva (walk-in): bloquea el check-in */}
        {hasConflict ? (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-2 font-bold">
            <CalendarClock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>No se puede ocupar con esta duración: {quote.conflict}</span>
          </div>
        ) : (
          showNextReservation && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs flex items-start gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Próxima reserva de <strong>{nextReservation.customer_name || nextReservation.full_name}</strong> el{' '}
                {formatDatePeru(nextReservation.start_date)}. La estadía elegida termina antes (con margen de limpieza), así que se puede ocupar.
              </span>
            </div>
          )
        )}

        {(error || quoteError) && (
          <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 border font-semibold bg-rose-50 border-rose-200 text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error || quoteError}</span>
          </div>
        )}

        {/* 1. Modalidad */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Modalidad de Hospedaje</div>

          {fromReservation ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
              <p>
                <strong>Estadía reservada:</strong>{' '}
                {quote?.breakdown?.nights
                  ? `${quote.breakdown.nights} noche(s) × ${formatPEN(quote.breakdown.nightly_rate)}`
                  : quote?.breakdown?.hours
                  ? `${quote.breakdown.hours} hora(s)`
                  : '—'}
              </p>
              <p>
                <strong>Salida:</strong> {quote ? formatDatePeru(quote.expected_end_time) : '—'}
              </p>
            </div>
          ) : (
            <>
              <StayDurationPicker
                room={room}
                stayType={stayType}
                units={units}
                quote={quote}
                onChange={({ stayType: t, units: u }) => {
                  setStayType(t);
                  setUnits(u);
                }}
              />
              {quote && (
                <p className="text-[11px] text-slate-500">
                  Salida prevista: <strong className="text-slate-800">{formatDatePeru(quote.expected_end_time)}</strong>
                </p>
              )}
            </>
          )}
        </div>

        {/* 2. Datos del Huésped */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            <span>Datos del Huésped</span>
          </div>
          <CustomerFields
            customer={customer}
            setCustomer={setCustomer}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            locked={fromReservation}
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Acompañante (Opcional)</label>
              <input
                type="text"
                maxLength={150}
                placeholder="Nombre del acompañante"
                value={companionName}
                onChange={(e) => setCompanionName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </CustomerFields>
        </div>

        {/* 3. Monto a cobrar (calculado) y pago */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Cobro</div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Total de la estadía</span>
              <span className="font-mono font-bold text-slate-900">{quote ? formatPEN(quote.price) : '—'}</span>
            </div>
            {quote?.deposit > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Abono inicial (reserva)</span>
                <span className="font-mono font-bold text-violet-700">− {formatPEN(quote.deposit)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-800">Monto a cobrar</span>
              <span className="font-mono font-black text-emerald-700">{quote ? formatPEN(amountDue) : '—'}</span>
            </div>
          </div>

          {amountDue > 0 && (
            <>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Cobrar ahora (si no, queda pendiente para el check-out)</span>
              </label>

              {payNow && (
                <>
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
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Comprobante de Pago SUNAT</label>
                    <VoucherSelector
                      voucherType={voucherType}
                      setVoucherType={setVoucherType}
                      customerDoc={customer.document_number}
                      customerName={customer.full_name}
                      rucNumber={rucNumber}
                      setRucNumber={setRucNumber}
                      businessName={businessName}
                      setBusinessName={setBusinessName}
                      businessAddress={businessAddress}
                      setBusinessAddress={setBusinessAddress}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || isBlacklisted || hasConflict || !quote}
            className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
              isBlacklisted || hasConflict || !quote
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isBlacklisted ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : <UserCheck className="w-4 h-4" />}
            <span>
              {loading
                ? 'Procesando...'
                : isBlacklisted
                ? 'Bloqueado (Lista Negra)'
                : hasConflict
                ? 'Habitación reservada'
                : charging
                ? `Confirmar Ingreso y Cobrar ${formatPEN(amountDue)}`
                : 'Confirmar Ingreso'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

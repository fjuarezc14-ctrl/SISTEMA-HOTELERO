import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { DateTimeInput } from '../common/DateInput';
import { api } from '../../api/apiClient';
import { formatPEN, formatDatePeru } from '../../utils/formatters';
import { PaymentSelector } from '../payments/PaymentSelector';
import { CustomerFields, EMPTY_CUSTOMER, customerToForm } from '../customers/CustomerFields';
import { StayDurationPicker } from '../reception/StayDurationPicker';
import { useReceipt } from '../../context/ReceiptContext';
import { useGlobalStore } from '../../context/GlobalStoreContext';
import { schedule } from '../../utils/schedule';
import { validateDocument, validateFullName, validatePhone } from '../../utils/validators';
import { toDateTimeInput, nightsBetween } from '../../utils/dateInput';
import { Calendar, UserCheck, AlertCircle, Check, CalendarClock } from 'lucide-react';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Comprobante de una reserva (también se usa al reimprimir desde la lista) */
export function buildReservationTicket({ reservation, roomNumber, customerName, documentNumber, documentType = 'DNI', total = null, paymentMethod }) {
  const deposit = Number(reservation.deposit_amount_pen || 0);
  const nights = nightsBetween(reservation.start_date, reservation.end_date);
  const stayTotal = Number(total ?? reservation.quoted_price_pen ?? 0);
  const summary = [];
  if (stayTotal > 0) {
    summary.push({ label: 'TOTAL ALOJAMIENTO', value: formatPEN(stayTotal) });
    summary.push({ label: 'SALDO AL INGRESAR', value: formatPEN(Math.max(0, stayTotal - deposit)) });
  }
  return {
    voucher_type: reservation.voucher?.voucher_type || 'TICKET',
    voucher_number: reservation.voucher?.voucher_number || null,
    title: 'CONSTANCIA DE RESERVA',
    date: reservation.created_at || new Date(),
    customer: { name: customerName, doc_type: documentType, doc_number: documentNumber },
    room_number: roomNumber,
    details: [
      { label: 'LLEGADA', value: formatDatePeru(reservation.start_date) },
      { label: 'SALIDA', value: formatDatePeru(reservation.end_date) },
      reservation.stay_type === 'hours'
        ? { label: 'HORAS', value: String(reservation.stay_units || '') }
        : { label: 'NOCHES', value: String(reservation.stay_units || nights) }
    ],
    items: [{ description: `Abono inicial - Reserva Hab. ${roomNumber}`, amount: deposit }],
    total: deposit,
    payments: deposit > 0 ? [{ method: paymentMethod, amount: deposit }] : [],
    summary
  };
}

/**
 * Modal único de reservas.
 * - Sin `reservation`: crea una nueva (cliente, llegada + duración, abono inicial, ticket).
 * - Con `reservation`: reprograma (habitación, llegada, duración y notas; el cliente y el abono no cambian).
 * La duración usa el mismo selector que el check-in y el precio lo calcula el backend.
 */
export function ReservationModal({ isOpen, onClose, reservation = null, preselectedRoom = null, rooms = [], onSuccess = () => {} }) {
  const isEdit = Boolean(reservation);

  const [roomId, setRoomId] = useState('');
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [stayType, setStayType] = useState('overnight');
  const [units, setUnits] = useState(1);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [depositAmount, setDepositAmount] = useState('0.00');
  const [depositTouched, setDepositTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('YAPE_PLIN');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { printReceipt } = useReceipt();
  const { hotelInfo } = useGlobalStore();

  // Llegada sugerida: hoy a la hora de ingreso del hotel (o ahora, si ya pasó)
  const defaultArrival = () => {
    const [h, m] = schedule(hotelInfo).checkin.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 14, m || 0, 0, 0);
    return toDateTimeInput(d > new Date() ? d : new Date());
  };

  const resetForm = () => {
    setError('');
    setQuote(null);
    setQuoteError('');
    setReferenceNumber('');
    setSplitPayments([]);
    setPaymentMethod('YAPE_PLIN');
    setDepositTouched(false);
    if (reservation) {
      setRoomId(reservation.room_id || '');
      setCustomer(
        customerToForm({
          document_type: reservation.document_type,
          document_number: reservation.customer_document,
          full_name: reservation.customer_name,
          phone: reservation.customer_phone
        })
      );
      setSelectedCustomer(null);
      setStartDate(toDateTimeInput(reservation.start_date));
      // Reservas antiguas sin modalidad guardada: por noche, con las noches de su rango
      setStayType(reservation.stay_type || 'full_day');
      setUnits(reservation.stay_units || nightsBetween(reservation.start_date, reservation.end_date));
      setDepositAmount(String(reservation.deposit_amount_pen || '0.00'));
      setNotes(reservation.notes || '');
    } else {
      setRoomId(preselectedRoom?.id || rooms[0]?.id || '');
      setCustomer(EMPTY_CUSTOMER);
      setSelectedCustomer(null);
      setStartDate(defaultArrival());
      setStayType('full_day');
      setUnits(1);
      setDepositAmount('0.00');
      setNotes('');
    }
  };

  // Inicializar SOLO al abrir (los refrescos de la página padre no deben reiniciar las fechas)
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) resetForm();
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Si aún no hay habitación elegida cuando llega la lista, tomar la primera
  useEffect(() => {
    if (isOpen && !roomId && (preselectedRoom || rooms.length > 0)) {
      setRoomId(preselectedRoom?.id || rooms[0].id);
    }
  }, [isOpen, rooms, preselectedRoom, roomId]);

  // Cotización del backend: total del alojamiento, salida, abono mínimo y conflictos
  useEffect(() => {
    if (!isOpen || !roomId || !startDate) return;
    let cancelled = false;
    const params = new URLSearchParams({ room_id: roomId, start_date: startDate, stay_type: stayType, units: String(units) });
    if (isEdit) params.set('exclude_reservation_id', reservation.id);
    const timer = setTimeout(() => {
      api
        .get(`/reservations/quote?${params.toString()}`)
        .then((res) => {
          if (cancelled) return;
          setQuote(res.data);
          setQuoteError('');
          // Sugerir el abono mínimo mientras el recepcionista no haya escrito otro monto
          if (!isEdit && !depositTouched) setDepositAmount(Number(res.data.min_deposit).toFixed(2));
        })
        .catch((err) => {
          if (cancelled) return;
          setQuote(null);
          setQuoteError(err.message || 'No se pudo calcular el precio.');
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, roomId, startDate, stayType, units]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isBlacklisted = Boolean(selectedCustomer?.is_blacklisted);
  const selectedRoom = rooms.find((r) => r.id === roomId) || preselectedRoom;
  const total = Number(quote?.price || 0);
  const minDeposit = Number(quote?.min_deposit || 0);
  const deposit = isEdit ? Number(reservation.deposit_amount_pen || 0) : parseFloat(depositAmount) || 0;

  const setDeposit = (amount) => {
    setDepositTouched(true);
    setDepositAmount(round2(amount).toFixed(2));
  };

  const validate = () => {
    if (!roomId) return 'Debes seleccionar una habitación.';
    if (!startDate) return 'La fecha de llegada es obligatoria.';
    const start = new Date(startDate);
    const unchangedStart = isEdit && startDate === toDateTimeInput(reservation.start_date);
    if (isNaN(start.getTime())) return 'La fecha de llegada no es válida.';
    if (!unchangedStart && start.getTime() < Date.now() - 60 * 60 * 1000) return 'La fecha de llegada no puede ser en el pasado.';
    if (!quote) return quoteError || 'Espera el cálculo del precio.';
    if (quote.conflict) return quote.conflict;
    if (isEdit) {
      if (deposit > total + 0.01) return `El nuevo total (${formatPEN(total)}) es menor al abono ya pagado (${formatPEN(deposit)}).`;
      return null;
    }

    if (isBlacklisted) {
      return `⛔ CLIENTE VETADO: ${selectedCustomer.full_name} se encuentra en Lista Negra (${selectedCustomer.blacklist_reason || 'Sin motivo'}). No se puede agendar la reserva.`;
    }
    const err =
      validateDocument(customer.document_type, customer.document_number) ||
      validateFullName(customer.full_name) ||
      validatePhone(customer.phone, false);
    if (err) return err;

    if (deposit < 0) return 'El abono inicial no puede ser negativo.';
    if (deposit + 0.001 < minDeposit) return `El abono mínimo para esta reserva es ${formatPEN(minDeposit)}.`;
    if (deposit > total + 0.01) return `El abono no puede superar el total del alojamiento (${formatPEN(total)}).`;
    if (deposit > 0 && paymentMethod === 'MIXED') {
      if (splitPayments.some((p) => parseFloat(p.amount) < 0)) {
        return 'Los montos del pago mixto no pueden ser negativos.';
      }
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(splitSum - deposit) > 0.01) {
        return `El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al abono inicial (${formatPEN(deposit)}).`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await api.put(`/reservations/${reservation.id}`, {
          room_id: roomId,
          start_date: startDate,
          stay_type: stayType,
          units: Number(units),
          notes: notes.trim()
        });
        onSuccess();
        handleClose();
        return;
      }

      const res = await api.post('/reservations', {
        room_id: roomId,
        customer_data: {
          document_type: customer.document_type,
          document_number: customer.document_number.trim(),
          full_name: customer.full_name.trim(),
          phone: customer.phone.trim()
        },
        start_date: startDate,
        stay_type: stayType,
        units: Number(units),
        deposit_amount_pen: deposit,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
        notes: notes.trim()
      });

      printReceipt(
        buildReservationTicket({
          reservation: res.data,
          roomNumber: selectedRoom?.room_number,
          customerName: customer.full_name.trim(),
          documentNumber: customer.document_number.trim(),
          documentType: customer.document_type,
          total,
          paymentMethod
        })
      );

      onSuccess(res.data);
      handleClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la reserva.');
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? `Editar / Reprogramar Reserva — Hab. ${reservation.room_number}` : 'Agendar Nueva Reserva de Habitación';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Habitación, llegada y duración */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Habitación, llegada y duración</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Habitación</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Hab. {r.room_number} - {r.room_type_name || 'Estándar'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha / Hora de Llegada</label>
              <DateTimeInput
                required
                value={startDate}
                onChange={setStartDate}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <StayDurationPicker
            room={selectedRoom}
            stayType={stayType}
            units={units}
            quote={quote}
            onChange={({ stayType: t, units: u }) => {
              setStayType(t);
              setUnits(u);
            }}
          />

          {quote && !quote.conflict && (
            <p className="text-[11px] text-slate-500">
              Salida: <strong className="text-slate-800">{formatDatePeru(quote.end_date)}</strong>
            </p>
          )}
          {(quote?.conflict || quoteError) && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2 font-bold">
              <CalendarClock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{quote?.conflict || quoteError}</span>
            </div>
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
            locked={isEdit}
          />
        </div>

        {/* 3. Costo del alojamiento y abono */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Costo y abono inicial</div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Total del alojamiento</span>
              <span className="font-mono font-black text-slate-900">{quote ? formatPEN(total) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{isEdit ? 'Abono ya pagado' : 'Abono inicial'}</span>
              <span className="font-mono font-bold text-violet-700">− {formatPEN(deposit)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-800">Saldo a pagar al llegar</span>
              <span className="font-mono font-black text-emerald-700">{quote ? formatPEN(Math.max(0, total - deposit)) : '—'}</span>
            </div>
            {!isEdit && quote && (
              <p className="text-[11px] text-slate-500 pt-1">
                Abono mínimo: <strong>{formatPEN(minDeposit)}</strong>
                {quote.rule?.type === 'percent' ? ` (${Number(quote.rule.value)}% del total)` : ' (monto fijo)'}
              </p>
            )}
          </div>

          {!isEdit && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  {
                    label: quote?.rule?.type === 'percent' ? `Mínimo ${Number(quote.rule.value)}%` : `Mínimo ${formatPEN(minDeposit)}`,
                    amount: minDeposit
                  },
                  { label: '50%', amount: total / 2 },
                  { label: `Completo ${formatPEN(total)}`, amount: total }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={!quote || opt.amount + 0.001 < minDeposit}
                    onClick={() => setDeposit(opt.amount)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold transition-colors disabled:opacity-40 ${
                      Math.abs(deposit - round2(opt.amount)) < 0.01 ? 'bg-violet-600 border-violet-600 text-white' : 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <PaymentSelector
                totalAmount={deposit}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                singleAmount={depositAmount}
                setSingleAmount={(value) => {
                  setDepositTouched(true);
                  setDepositAmount(value);
                }}
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                splitPayments={splitPayments}
                setSplitPayments={setSplitPayments}
                amountLabel="Abono inicial (S/)"
              />
            </>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Observaciones (Opcional)</label>
          <input
            type="text"
            maxLength={250}
            placeholder="Ej: Llegada de madrugada, requiere cama matrimonial adicional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || isBlacklisted || !quote || Boolean(quote?.conflict)}
            className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-60 ${
              isBlacklisted ? 'bg-rose-700 text-white cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isEdit ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            <span>
              {saving
                ? 'Guardando...'
                : isBlacklisted
                ? '⛔ Cliente Vetado (Reserva Bloqueada)'
                : isEdit
                ? 'Guardar Cambios'
                : `Confirmar Reserva${deposit > 0 ? ` y cobrar ${formatPEN(deposit)}` : ''}`}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

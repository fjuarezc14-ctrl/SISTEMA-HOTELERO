import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { PaymentSelector } from './PaymentSelector';
import { CustomerFields, EMPTY_CUSTOMER, customerToForm } from './CustomerFields';
import { useReceipt } from '../context/ReceiptContext';
import { validateDocument, validateFullName, validatePhone, validateAmount, validateDateRange } from '../utils/validators';
import { toDateTimeInput, checkoutAfterDays, nightsBetween } from '../utils/dateInput';
import { Calendar, UserCheck, AlertCircle, Check } from 'lucide-react';

const STAY_DAY_OPTIONS = [1, 2, 3, 4, 5];

/** Comprobante de una reserva (también se usa al reimprimir desde la lista) */
export function buildReservationTicket({ reservation, roomNumber, customerName, documentNumber, documentType = 'DNI', nightlyPrice = 0, paymentMethod }) {
  const deposit = Number(reservation.deposit_amount_pen || 0);
  const nights = nightsBetween(reservation.start_date, reservation.end_date);
  const estimatedTotal = Number(nightlyPrice || 0) * nights;
  const summary = [];
  if (estimatedTotal > 0) {
    summary.push({ label: 'TOTAL ESTIMADO', value: formatPEN(estimatedTotal) });
    summary.push({ label: 'SALDO AL INGRESAR', value: formatPEN(Math.max(0, estimatedTotal - deposit)) });
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
      { label: 'NOCHES', value: String(nights) }
    ],
    items: [{ description: `Abono inicial - Reserva Hab. ${roomNumber}`, amount: deposit }],
    total: deposit,
    payments: deposit > 0 ? [{ method: paymentMethod, amount: deposit }] : [],
    summary
  };
}

/**
 * Modal único de reservas.
 * - Sin `reservation`: crea una nueva (cliente, fechas, abono inicial, ticket).
 * - Con `reservation`: edita/reprograma (habitación, fechas y notas; el cliente y el abono no se modifican).
 */
export function ReservationModal({ isOpen, onClose, reservation = null, preselectedRoom = null, rooms = [], onSuccess = () => {} }) {
  const isEdit = Boolean(reservation);

  const [roomId, setRoomId] = useState('');
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stayDays, setStayDays] = useState(1); // null = salida elegida a mano
  const [depositAmount, setDepositAmount] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState('YAPE_PLIN');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { printReceipt } = useReceipt();

  const resetForm = () => {
    setError('');
    setReferenceNumber('');
    setSplitPayments([]);
    setPaymentMethod('YAPE_PLIN');
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
      setEndDate(toDateTimeInput(reservation.end_date));
      setStayDays(null);
      setDepositAmount(String(reservation.deposit_amount_pen || '0.00'));
      setNotes(reservation.notes || '');
    } else {
      const now = toDateTimeInput(new Date());
      setRoomId(preselectedRoom?.id || rooms[0]?.id || '');
      setCustomer(EMPTY_CUSTOMER);
      setSelectedCustomer(null);
      setStartDate(now);
      setEndDate(checkoutAfterDays(now, 1));
      setStayDays(1);
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

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStartChange = (value) => {
    setStartDate(value);
    if (value && stayDays) setEndDate(checkoutAfterDays(value, stayDays));
  };

  const handleSelectDays = (days) => {
    setStayDays(days);
    setEndDate(checkoutAfterDays(startDate, days));
  };

  const isBlacklisted = Boolean(selectedCustomer?.is_blacklisted);
  const selectedRoom = rooms.find((r) => r.id === roomId) || preselectedRoom;

  const validate = () => {
    if (!roomId) return 'Debes seleccionar una habitación.';
    if (!startDate || !endDate) return 'Las fechas de llegada y salida son obligatorias.';

    // La llegada no puede ser pasada (tolerancia de 1 hora). Al editar, se permite mantener la fecha original.
    const start = new Date(startDate);
    const unchangedStart = isEdit && startDate === toDateTimeInput(reservation.start_date);
    if (isNaN(start.getTime())) return 'La fecha de llegada no es válida.';
    if (!unchangedStart && start.getTime() < Date.now() - 60 * 60 * 1000) return 'La fecha de llegada no puede ser en el pasado.';

    const rangeErr = validateDateRange(startDate, endDate);
    if (rangeErr) return rangeErr;
    if (isEdit) return null;

    if (isBlacklisted) {
      return `⛔ CLIENTE VETADO: ${selectedCustomer.full_name} se encuentra en Lista Negra (${selectedCustomer.blacklist_reason || 'Sin motivo'}). No se puede agendar la reserva.`;
    }
    const deposit = parseFloat(depositAmount) || 0;
    const err =
      validateDocument(customer.document_type, customer.document_number) ||
      validateFullName(customer.full_name) ||
      validatePhone(customer.phone, false) ||
      (deposit < 0 ? 'El abono inicial no puede ser negativo.' : null) ||
      (deposit > 0 ? validateAmount(depositAmount, 'Abono inicial') : null);
    if (err) return err;

    if (deposit > 0 && paymentMethod === 'MIXED') {
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
          end_date: endDate,
          notes: notes.trim()
        });
        onSuccess();
        handleClose();
        return;
      }

      const deposit = parseFloat(depositAmount) || 0;
      const res = await api.post('/reservations', {
        room_id: roomId,
        customer_data: {
          document_type: customer.document_type,
          document_number: customer.document_number.trim(),
          full_name: customer.full_name.trim(),
          phone: customer.phone.trim()
        },
        start_date: startDate,
        end_date: endDate,
        deposit_amount_pen: deposit,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
        notes: notes.trim()
      });

      // Ticket de la reserva
      printReceipt(
        buildReservationTicket({
          reservation: res.data,
          roomNumber: selectedRoom?.room_number,
          customerName: customer.full_name.trim(),
          documentNumber: customer.document_number.trim(),
          documentType: customer.document_type,
          nightlyPrice: selectedRoom?.price_overnight_default,
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

  const title = isEdit
    ? `Editar / Reprogramar Reserva — Hab. ${reservation.room_number}`
    : 'Agendar Nueva Reserva de Habitación';

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Habitación y Fechas */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Habitación y Horarios Agendados</span>
              </div>

              {/* Duración rápida: salida a las 12:00 PM, N días después de la llegada */}
              <div className="flex flex-wrap items-center gap-1" title="Calcula la salida a las 12:00 PM según la fecha de llegada">
                {STAY_DAY_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleSelectDays(days)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold transition-colors ${
                      stayDays === days
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {days} {days === 1 ? 'día' : 'días'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Habitación</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Hab. {r.room_number} - {r.room_type_name || 'Estándar'} (S/{r.price_overnight_default}/noche)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha / Hora Llegada</label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha / Hora Salida</label>
                <input
                  type="datetime-local"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setStayDays(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
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

          {/* 3. Abono inicial */}
          {isEdit ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900">Abono inicial registrado (no editable)</span>
              <span className="font-mono font-black text-emerald-700">{formatPEN(reservation.deposit_amount_pen)}</span>
            </div>
          ) : (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
              <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-1">Abono inicial (S/)</div>
              <PaymentSelector
                totalAmount={parseFloat(depositAmount) || 0}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                singleAmount={depositAmount}
                setSingleAmount={setDepositAmount}
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                splitPayments={splitPayments}
                setSplitPayments={setSplitPayments}
                amountLabel="Abono inicial (S/)"
              />
            </div>
          )}

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
              disabled={saving || isBlacklisted}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                isBlacklisted ? 'bg-rose-700 text-white cursor-not-allowed opacity-90' : 'bg-amber-500 hover:bg-amber-600 text-white'
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
                  : 'Confirmar Reserva'}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

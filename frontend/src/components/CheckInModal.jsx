import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { PaymentSelector } from './PaymentSelector';
import { VoucherSelector } from './VoucherSelector';
import { CustomerSearchAutocomplete } from './CustomerSearchAutocomplete';
import { Search, UserCheck, AlertCircle, Clock, Moon, Sun, Lock, Edit2, ShieldAlert } from 'lucide-react';
import { validateDocument, validateFullName, validatePhone, validateAmount, getDocumentConstraints } from '../utils/validators';

export function CheckInModal({ isOpen, onClose, room, reservationData = null, upcomingReservation = null, onSuccess }) {
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [companionName, setCompanionName] = useState('');

  // A2: Reordenar modalidades: 1° Por Noche (overnight), 2° Por Día (full_day), 3° Por Horas (hours)
  const [stayType, setStayType] = useState('overnight');
  const [hoursCount, setHoursCount] = useState(3);
  const [price, setPrice] = useState('');

  // Comprobante SUNAT (A11)
  const [voucherType, setVoucherType] = useState('TICKET');
  const [customerRuc, setCustomerRuc] = useState('');
  const [customerBusinessName, setCustomerBusinessName] = useState('');
  
  // Pago inicial (A3)
  const [hasPayment, setHasPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('YAPE_PLIN');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);

  const [searchingDoc, setSearchingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-cargar datos si viene de una Reserva (Opción A)
  useEffect(() => {
    if (isOpen && reservationData) {
      const custData = {
        id: reservationData.customer_id,
        document_type: reservationData.document_type || 'DNI',
        document_number: reservationData.customer_document || '',
        full_name: reservationData.customer_name || '',
        phone: reservationData.customer_phone || '',
        is_blacklisted: reservationData.is_blacklisted
      };
      setSelectedCustomer(custData);
      setDocumentType(custData.document_type);
      setDocumentNumber(custData.document_number);
      setFullName(custData.full_name);
      setPhone(custData.phone);
      setIsExistingCustomer(true);
      setIsEditingExisting(false);

      const deposit = Number(reservationData.deposit_amount_pen || 0);
      if (deposit > 0) {
        setHasPayment(true);
        setPaymentAmount(deposit.toFixed(2));
        setPaymentMethod(reservationData.payment_method || 'YAPE_PLIN');
        setReferenceNumber(reservationData.reference_number || 'ABONO_RESERVA');
      }
    }
  }, [isOpen, reservationData]);

  // A4 & A5: Seleccionar cliente desde autocomplete o búsqueda
  const handleSelectCustomerFromSearch = (customer) => {
    setSelectedCustomer(customer);
    setDocumentType(customer.document_type || 'DNI');
    setDocumentNumber(customer.document_number || '');
    setFullName(customer.full_name || '');
    setPhone(customer.phone || '');
    setIsExistingCustomer(true);
    setIsEditingExisting(false);

    if (customer.is_blacklisted) {
      setError(`⛔ ALERTA DE VETO EN LISTA NEGRA: ${customer.blacklist_reason || 'Sin motivo especificado'}. No se puede realizar Check-in.`);
    } else {
      setError('');
    }
  };

  const handleClearCustomerSearch = () => {
    if (reservationData) return; // Bloqueado si viene de reserva
    setSelectedCustomer(null);
    setIsExistingCustomer(false);
    setIsEditingExisting(false);
    setDocumentType('DNI');
    setDocumentNumber('');
    setFullName('');
    setPhone('');
    setError('');
  };

  // A1: Recálculo dinámico de tarifa por horas según horasCount seleccionadas
  useEffect(() => {
    if (!room) return;

    if (stayType === 'hours') {
      const baseHours = Number(room.hours_quantity_default) || 3;
      const basePrice = parseFloat(room.price_hours_default) || 30.00;
      const extraHourRate = parseFloat(room.price_extra_hour) || 10.00;

      let calcPrice = basePrice;
      if (hoursCount > baseHours) {
        calcPrice = basePrice + (hoursCount - baseHours) * extraHourRate;
      }

      const formattedPrice = calcPrice.toFixed(2);
      setPrice(formattedPrice);
      if (!reservationData) setPaymentAmount(formattedPrice);
    } else if (stayType === 'overnight') {
      const defaultRate = (parseFloat(room.price_overnight_default) || 60.00).toFixed(2);
      setPrice(defaultRate);
      if (!reservationData) setPaymentAmount(defaultRate);
    } else if (stayType === 'full_day') {
      const defaultRate = (parseFloat(room.price_full_day_default) || 90.00).toFixed(2);
      setPrice(defaultRate);
      if (!reservationData) setPaymentAmount(defaultRate);
    }
  }, [room, stayType, hoursCount, reservationData]);

  // Buscar cliente existente por DNI/RUC
  const handleSearchCustomer = async () => {
    if (!documentNumber.trim()) return;
    try {
      setSearchingDoc(true);
      setError('');
      const res = await api.get(`/customers/lookup/${documentNumber.trim()}`);
      if (res.data && res.data.found) {
        setSelectedCustomer(res.data);
        setFullName(res.data.full_name || '');
        if (res.data.phone) setPhone(res.data.phone);
        if (res.data.document_type) setDocumentType(res.data.document_type);
        setIsExistingCustomer(true);
        setIsEditingExisting(false);

        if (res.data.is_blacklisted) {
          setError(`⛔ ALERTA DE VETO EN LISTA NEGRA: ${res.data.blacklist_reason || 'Sin motivo especificado'}. No se puede realizar Check-in.`);
        }
      } else {
        setIsExistingCustomer(false);
        setIsEditingExisting(true);
        setError('Documento no registrado en base local. Completa los datos del huésped.');
      }
    } catch (err) {
      console.error('Error buscando documento:', err.message);
    } finally {
      setSearchingDoc(false);
    }
  };

  const isBlacklisted = Boolean(selectedCustomer?.is_blacklisted);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isBlacklisted) {
      setError('⛔ No se puede procesar el Check-in porque el cliente se encuentra en LISTA NEGRA.');
      return;
    }

    const docError = validateDocument(documentType, documentNumber);
    const nameError = validateFullName(fullName);
    const phoneError = validatePhone(phone, false);
    const amtError = hasPayment && parseFloat(paymentAmount) > 0 ? validateAmount(paymentAmount, 'Pago inicial') : null;
    const firstErr = docError || nameError || phoneError || amtError;
    if (firstErr) { setError(firstErr); return; }

    if (hasPayment && paymentMethod === 'MIXED') {
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      const targetAmt = parseFloat(paymentAmount) || 0;
      if (Math.abs(splitSum - targetAmt) > 0.01) {
        setError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al pago inicial (${formatPEN(targetAmt)}).`);
        return;
      }
    }

    try {
      setLoading(true);

      if (reservationData) {
        // Convertir reserva existente con modalidad y precio seleccionados
        await api.post(`/reservations/${reservationData.id}/checkin`, {
          stay_type: stayType,
          hours_count: Number(hoursCount),
          custom_price: parseFloat(price) || 0
        });
      } else {
        // Check-in walk-in estándar
        await api.post('/stays/checkin', {
          room_id: room.id,
          customer_data: {
            document_type: documentType,
            document_number: documentNumber.trim(),
            full_name: fullName.trim(),
            phone: phone.trim()
          },
          stay_type: stayType,
          hours_count: Number(hoursCount),
          companion_name: companionName.trim(),
          custom_price: parseFloat(price) || 0,
          initial_payment: hasPayment ? {
            amount: parseFloat(paymentAmount) || 0,
            payment_method: paymentMethod,
            reference_number: referenceNumber.trim(),
            split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
            voucher_type: voucherType,
            customer_ruc: customerRuc.trim(),
            customer_business_name: customerBusinessName.trim()
          } : null
        });
      }

      onSuccess();
      onClose();
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
      onClose={onClose}
      title={reservationData ? `Check-in de Reserva: Habitación ${room.room_number}` : `Check-in: Habitación ${room.room_number} (${room.room_type_name || 'Estándar'})`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner de Reserva Asociada o Advertencia de Reserva Próxima */}
        {reservationData && (
          <div className="p-3 bg-violet-100 border border-violet-300 rounded-2xl text-violet-950 text-xs flex items-center justify-between font-extrabold shadow-2xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-700 shrink-0" />
              <span>VINCULADO A RESERVA DE: {reservationData.customer_name}</span>
            </div>
            <span className="px-2.5 py-1 bg-violet-700 text-white rounded-xl text-[10px] uppercase tracking-wider font-mono">
              Abono Registrado: {formatPEN(reservationData.deposit_amount_pen)}
            </span>
          </div>
        )}

        {upcomingReservation && !reservationData && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs flex items-center gap-2 font-bold shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              ⚠️ ATENCIÓN: Esta habitación tiene una reserva agendada para hoy de <strong>{upcomingReservation.customer_name}</strong>. Verifica antes de asignar este espacio a un walk-in.
            </span>
          </div>
        )}
        {error && (
          <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border font-semibold ${
            isBlacklisted
              ? 'bg-rose-100 border-rose-300 text-rose-900 shadow-sm'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Modalidad y Tarifa */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Modalidad de Hospedaje</span>
            <span className="text-[11px] text-slate-500 font-normal">Paso 1 de 3</span>
          </div>

          {/* A2: Orden: 1° Por Noche (overnight), 2° Por Día (full_day), 3° Por Hora (hours) */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStayType('overnight')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                stayType === 'overnight'
                  ? 'bg-indigo-50 border-indigo-300 text-slate-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Por Noche</span>
              </div>
              <p className="text-sm font-black text-indigo-700 font-mono mt-2">{formatPEN(room.price_overnight_default || 60)}</p>
            </button>

            <button
              type="button"
              onClick={() => setStayType('full_day')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                stayType === 'full_day'
                  ? 'bg-amber-50 border-amber-300 text-slate-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Sun className="w-4 h-4 text-amber-600" />
                <span>Día Completo (12 PM)</span>
              </div>
              <p className="text-sm font-black text-amber-700 font-mono mt-2">{formatPEN(room.price_full_day_default || 90)}</p>
            </button>

            <button
              type="button"
              onClick={() => setStayType('hours')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                stayType === 'hours'
                  ? 'bg-emerald-50 border-emerald-300 text-slate-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Por Horas ({hoursCount}h)</span>
              </div>
              <p className="text-sm font-black text-emerald-700 font-mono mt-2">{formatPEN(price || room.price_hours_default || 30)}</p>
            </button>
          </div>

          {/* A1: Horas adicionales extras recalculables */}
          {stayType === 'hours' && (() => {
            const baseHours = Number(room.hours_quantity_default) || 3;
            const basePrice = parseFloat(room.price_hours_default) || 30.00;
            const extraRate = parseFloat(room.price_extra_hour) || 10.00;
            const extraHours = Math.max(0, hoursCount - baseHours);

            return (
              <div className="mt-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Horas Adicionales / Extras a la Estadía Base ({baseHours}h)
                  </label>
                  <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                    Base {baseHours}h = {formatPEN(basePrice)} (+{formatPEN(extraRate)}/h extra)
                  </span>
                </div>

                {/* Botones de +0h, +1h, +2h, +3h, +4h, +5h, +6h extra */}
                <div className="grid grid-cols-7 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((ex) => {
                    const totalH = baseHours + ex;
                    const isSelected = hoursCount === totalH;

                    return (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setHoursCount(totalH)}
                        className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{ex === 0 ? 'Base' : `+${ex}h`}</span>
                        <span className="text-[9px] font-mono opacity-80">{totalH}h total</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-600 font-semibold shrink-0">Total Horas:</label>
                    <input
                      type="number"
                      min={baseHours}
                      max="24"
                      value={hoursCount}
                      onChange={(e) => setHoursCount(Math.max(baseHours, Math.min(24, Number(e.target.value) || baseHours)))}
                      className="w-20 bg-white border border-slate-300 rounded-xl p-1 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-emerald-600"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">({extraHours} hora(s) extra(s))</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-900 font-mono">
                      Total Tarifa: {formatPEN(price)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 2. Datos del Huésped (A4 & A5) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>Datos del Huésped</span>
            </div>
            {isExistingCustomer && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Cliente Registrado</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingExisting(!isEditingExisting)}
                  className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 underline flex items-center gap-0.5"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingExisting ? 'Bloquear' : 'Modificar datos'}</span>
                </button>
              </div>
            )}
          </div>

          <CustomerSearchAutocomplete
            selectedCustomer={selectedCustomer}
            onSelectCustomer={handleSelectCustomerFromSearch}
            onClearCustomer={handleClearCustomerSearch}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipo Doc.</label>
              <select
                value={documentType}
                disabled={isExistingCustomer && !isEditingExisting}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="DNI">DNI (8 dígitos)</option>
                <option value="CE">Carné de Extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="RUC">RUC (11 dígitos)</option>
              </select>
            </div>

            <div className="md:col-span-2 relative">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nro. Documento</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  {...getDocumentConstraints(documentType)}
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  onBlur={handleSearchCustomer}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleSearchCustomer}
                  disabled={searchingDoc}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shrink-0 border border-slate-300"
                >
                  {searchingDoc ? '...' : <Search className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombres y Apellidos / Razón Social</label>
              <input
                type="text"
                required
                disabled={isExistingCustomer && !isEditingExisting}
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono / Celular (Opcional)</label>
              <input
                type="text"
                disabled={isExistingCustomer && !isEditingExisting}
                placeholder="Ej: 987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Acompañante (Opcional)</label>
            <input
              type="text"
              placeholder="Nombre del acompañante"
              value={companionName}
              onChange={(e) => setCompanionName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* 3. Tarifa y Selección de Pago (A3 & A11) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Pago inicial & Comprobante (S/)
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-700 font-bold">Pago inicial (S/):</label>
              <input
                type="number"
                step="1"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPaymentAmount(e.target.value);
                }}
                className="w-24 bg-amber-50 border border-amber-300 rounded-xl p-1.5 text-xs text-right font-black text-emerald-700 font-mono focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Selector de Comprobante SUNAT (A11) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Comprobante de Pago SUNAT</label>
            <VoucherSelector
              voucherType={voucherType}
              setVoucherType={setVoucherType}
              customerRuc={customerRuc}
              setCustomerRuc={setCustomerRuc}
              customerBusinessName={customerBusinessName}
              setCustomerBusinessName={setCustomerBusinessName}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPayment}
                  onChange={(e) => setHasPayment(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Registrar Pago inicial al Ingreso</span>
              </label>
            </div>

            {hasPayment && (
              <PaymentSelector
                totalAmount={parseFloat(price) || 0}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                singleAmount={paymentAmount}
                setSingleAmount={setPaymentAmount}
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                splitPayments={splitPayments}
                setSplitPayments={setSplitPayments}
              />
            )}
          </div>
        </div>

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
            disabled={loading || isBlacklisted}
            className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
              isBlacklisted
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isBlacklisted ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : <UserCheck className="w-4 h-4" />}
            <span>{loading ? 'Procesando...' : isBlacklisted ? 'Bloqueado (Lista Negra)' : 'Confirmar Ingreso'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

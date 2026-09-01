import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { PaymentSelector } from './PaymentSelector';
import { CustomerSearchAutocomplete } from './CustomerSearchAutocomplete';
import { Search, UserCheck, AlertCircle, Clock, Moon, Sun } from 'lucide-react';
import { validateDocument, validateFullName, validatePhone, validateAmount, getDocumentConstraints } from '../utils/validators';

export function CheckInModal({ isOpen, onClose, room, onSuccess }) {
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [companionName, setCompanionName] = useState('');

  const [stayType, setStayType] = useState('hours'); // hours, overnight, full_day
  const [hoursCount, setHoursCount] = useState(3);
  const [price, setPrice] = useState('');
  
  // Pago inicial
  const [hasPayment, setHasPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('YAPE_PLIN'); // YAPE_PLIN, CASH, CARD, MIXED
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manejar selección de cliente desde el buscador autocomplete
  const handleSelectCustomerFromSearch = (customer) => {
    setSelectedCustomer(customer);
    setDocumentType(customer.document_type || 'DNI');
    setDocumentNumber(customer.document_number || '');
    setFullName(customer.full_name || '');
    setPhone(customer.phone || '');
    if (customer.is_blacklisted) {
      setError(`⚠️ ALERTA DE VETO: Este cliente está en LISTA NEGRA. Motivo: ${customer.blacklist_reason || 'No especificado'}`);
    } else {
      setError('');
    }
  };

  const handleClearCustomerSearch = () => {
    setSelectedCustomer(null);
    setDocumentType('DNI');
    setDocumentNumber('');
    setFullName('');
    setPhone('');
    setError('');
  };

  // Actualizar tarifa por defecto al cambiar la habitación o la modalidad
  useEffect(() => {
    if (room) {
      if (stayType === 'hours') {
        const defaultRate = room.price_hours_default || '30.00';
        setPrice(defaultRate);
        setPaymentAmount(defaultRate);
        setHoursCount(room.hours_quantity_default || 3);
      } else if (stayType === 'overnight') {
        const defaultRate = room.price_overnight_default || '60.00';
        setPrice(defaultRate);
        setPaymentAmount(defaultRate);
      } else if (stayType === 'full_day') {
        const defaultRate = room.price_full_day_default || '90.00';
        setPrice(defaultRate);
        setPaymentAmount(defaultRate);
      }
    }
  }, [room, stayType]);

  // Buscar cliente existente o consultar padrón RENIEC / SUNAT
  const handleSearchCustomer = async () => {
    if (!documentNumber.trim()) return;
    try {
      setSearchingDoc(true);
      setError('');
      const res = await api.get(`/customers/lookup/${documentNumber.trim()}`);
      if (res.data && res.data.found) {
        setFullName(res.data.full_name || '');
        if (res.data.phone) setPhone(res.data.phone);
        if (res.data.document_type) setDocumentType(res.data.document_type);
        if (res.data.is_blacklisted) {
          setError(`⚠️ ALERTA DE VETO: Este cliente está en LISTA NEGRA. Motivo: ${res.data.blacklist_reason || 'No especificado'}`);
        }
      } else {
        setError('Documento no registrado en base local. Ingresa el nombre del huésped.');
      }
    } catch (err) {
      console.error('Error buscando documento:', err.message);
    } finally {
      setSearchingDoc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const docError = validateDocument(documentType, documentNumber);
    const nameError = validateFullName(fullName);
    const phoneError = validatePhone(phone, false);
    const amtError = hasPayment && parseFloat(paymentAmount) > 0 ? validateAmount(paymentAmount, 'Monto del pago') : null;
    const firstErr = docError || nameError || phoneError || amtError;
    if (firstErr) { setError(firstErr); return; }

    if (hasPayment && paymentMethod === 'MIXED') {
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      const targetAmt = parseFloat(paymentAmount) || 0;
      if (Math.abs(splitSum - targetAmt) > 0.01) {
        setError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al total a cobrar (${formatPEN(targetAmt)}).`);
        return;
      }
    }

    try {
      setLoading(true);
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
          split_payments: paymentMethod === 'MIXED' ? splitPayments : null
        } : null
      });

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
      title={`Check-in: Habitación ${room.room_number} (${room.room_type_name || 'Estándar'})`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Modalidad de Estadía */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Modalidad de Alquiler
          </label>
          <div className="grid grid-cols-3 gap-2">
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
              <p className="text-sm font-black text-emerald-700 font-mono mt-2">{formatPEN(room.price_hours_default || 30)}</p>
            </button>

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
          </div>

          {/* Bloque editable de cantidad de horas */}
          {stayType === 'hours' && (
            <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Cantidad de Horas a Alquilar</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHoursCount(h);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      hoursCount === h
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
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
          )}
        </div>

        {/* 2. Datos del Huésped */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            <span>Datos del Huésped</span>
          </div>

          {/* Buscador Desacoplado con Debounce (300ms) */}
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
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="DNI">DNI (8 dígitos)</option>
                <option value="CE">Carné de Extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="RUC">RUC (11 dígitos)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nro. Documento</label>
              <input
                type="text"
                required
                {...getDocumentConstraints(documentType)}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombres y Apellidos / Razón Social</label>
              <input
                type="text"
                required
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono / Celular (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: 987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
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

        {/* 3. Tarifa y Selección de Pago (Con Pago Mixto) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Cobro en Soles (S/)
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-500 font-semibold">Tarifa Acordada (S/):</label>
              <input
                type="number"
                step="1"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPaymentAmount(e.target.value);
                }}
                className="w-24 bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-xs text-right font-black text-emerald-700 font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>
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
                <span>Registrar Pago Inicial al Ingreso</span>
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
            disabled={loading}
            className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>{loading ? 'Procesando...' : 'Confirmar Ingreso'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

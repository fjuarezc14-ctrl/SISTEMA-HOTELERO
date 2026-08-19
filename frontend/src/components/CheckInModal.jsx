import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { Search, UserCheck, AlertCircle, Clock, Moon, Sun, CreditCard, Wallet, QrCode } from 'lucide-react';

export function CheckInModal({ isOpen, onClose, room, onSuccess }) {
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companionName, setCompanionName] = useState('');

  const [stayType, setStayType] = useState('hours'); // hours, overnight, full_day
  const [hoursCount, setHoursCount] = useState(3);
  const [price, setPrice] = useState('');
  
  // Pago inicial
  const [hasPayment, setHasPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('YAPE_PLIN'); // YAPE_PLIN, CASH, CARD
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [searchingDoc, setSearchingDoc] = useState(false);
  const [error, setError] = useState('');

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

    if (!documentNumber.trim() || !fullName.trim()) {
      setError('El número de documento y el nombre del huésped son obligatorios.');
      return;
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
        initial_payment: hasPayment && parseFloat(paymentAmount) > 0 ? {
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim()
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
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Modalidad de Estadía */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Modalidad de Alquiler
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStayType('hours')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                stayType === 'hours'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Por Horas ({hoursCount}h)</span>
              </div>
              <p className="text-sm font-bold text-emerald-400 mt-2">{formatPEN(room.price_hours_default || 30)}</p>
            </button>

            <button
              type="button"
              onClick={() => setStayType('overnight')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                stayType === 'overnight'
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Pernocta</span>
              </div>
              <p className="text-sm font-bold text-indigo-400 mt-2">{formatPEN(room.price_overnight_default || 60)}</p>
            </button>

            <button
              type="button"
              onClick={() => setStayType('full_day')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                stayType === 'full_day'
                  ? 'bg-amber-500/10 border-amber-500/40 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Día Completo (24h)</span>
              </div>
              <p className="text-sm font-bold text-amber-400 mt-2">{formatPEN(room.price_full_day_default || 90)}</p>
            </button>
          </div>
        </div>

        {/* 2. Datos del Huésped */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Datos del Huésped</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Tipo Doc.</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="DNI">DNI (8 dígitos)</option>
                <option value="CE">Carné de Extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="RUC">RUC (11 dígitos)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nro. Documento</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej: 72345678"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  onBlur={handleSearchCustomer}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSearchCustomer}
                  disabled={searchingDoc}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{searchingDoc ? '...' : 'Buscar'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nombres y Apellidos / Razón Social</label>
              <input
                type="text"
                required
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Teléfono / Celular (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: 987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Acompañante (Opcional)</label>
            <input
              type="text"
              placeholder="Nombre del acompañante"
              value={companionName}
              onChange={(e) => setCompanionName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 3. Tarifa y Pago Inicial (Soles) */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Cobro en Soles (S/)
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Tarifa Acordada (S/):</label>
              <input
                type="number"
                step="1"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPaymentAmount(e.target.value);
                }}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-right font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPayment}
                  onChange={(e) => setHasPayment(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                />
                <span>Registrar Pago Inicial al Ingreso</span>
              </label>
            </div>

            {hasPayment && (
              <div className="space-y-3 pt-1">
                {/* 3 Medios de Pago Perú */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('YAPE_PLIN')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMethod === 'YAPE_PLIN'
                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Yape / Plin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Efectivo S/</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMethod === 'CARD'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Tarjeta POS</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Monto a Cobrar (S/)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Nro. Operación / Voucher (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: 123456"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
            className="px-6 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>{loading ? 'Procesando...' : 'Confirmar Ingreso'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

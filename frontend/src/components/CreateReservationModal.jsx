import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { PaymentSelector } from './PaymentSelector';
import { CustomerSearchAutocomplete } from './CustomerSearchAutocomplete';
import { validateDocument, validateFullName, validatePhone, validateAmount, validateDate, validateDateRange, getDocumentConstraints } from '../utils/validators';
import { Calendar, Search, UserCheck, AlertCircle, Plus, Share2 } from 'lucide-react';

export function CreateReservationModal({ isOpen, onClose, preselectedRoom = null, rooms = [], onSuccess }) {
  const [roomId, setRoomId] = useState('');
  const [docType, setDocType] = useState('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState('YAPE_PLIN');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Manejar selección de cliente desde el buscador autocomplete
  const handleSelectCustomerFromSearch = (customer) => {
    setSelectedCustomer(customer);
    setDocType(customer.document_type || 'DNI');
    setDocNumber(customer.document_number || '');
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
    setDocType('DNI');
    setDocNumber('');
    setFullName('');
    setPhone('');
    setError('');
  };

  // Sincronizar habitación pre-seleccionada o primera disponible
  useEffect(() => {
    if (isOpen) {
      if (preselectedRoom) {
        setRoomId(preselectedRoom.id);
      } else if (rooms.length > 0 && !roomId) {
        setRoomId(rooms[0].id);
      }

      // Inicializar fechas por defecto (Hoy e Ingreso a las 14:00 hasta mañana 12:00)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);

      const toISOStringLocal = (d) => {
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      setStartDate(toISOStringLocal(now));
      setEndDate(toISOStringLocal(tomorrow));
    }
  }, [isOpen, preselectedRoom, rooms]);

  const handleLookupDoc = async () => {
    if (!docNumber.trim()) return;
    try {
      setSearchingDoc(true);
      setError('');
      const res = await api.get(`/customers/lookup/${docNumber.trim()}`);
      if (res.data && res.data.found) {
        setFullName(res.data.full_name || '');
        if (res.data.phone) setPhone(res.data.phone);
        if (res.data.document_type) setDocType(res.data.document_type);
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

    if (!roomId) {
      setError('Debes seleccionar una habitación.');
      return;
    }

    const docErr = validateDocument(docType, docNumber);
    const nameErr = validateFullName(fullName);
    const phoneErr = validatePhone(phone, false);
    const startErr = validateDate(startDate, 'Fecha de llegada', false);
    const endErr = validateDate(endDate, 'Fecha de salida', false);
    const rangeErr = startDate && endDate ? validateDateRange(startDate, endDate) : null;
    const deposit = parseFloat(depositAmount) || 0;
    const amtErr = deposit > 0 ? validateAmount(depositAmount, 'Monto del abono') : null;
    const firstErr = docErr || nameErr || phoneErr || startErr || endErr || rangeErr || amtErr;

    if (firstErr) {
      setError(firstErr);
      return;
    }

    if (deposit > 0 && paymentMethod === 'MIXED') {
      const splitSum = splitPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(splitSum - deposit) > 0.01) {
        setError(`El desglose de Pago Mixto (${formatPEN(splitSum)}) debe ser igual al abono registrado (${formatPEN(deposit)}).`);
        return;
      }
    }

    try {
      setSaving(true);
      const res = await api.post('/reservations', {
        room_id: roomId,
        customer_data: {
          document_type: docType,
          document_number: docNumber.trim(),
          full_name: fullName.trim(),
          phone: phone.trim()
        },
        start_date: startDate,
        end_date: endDate,
        deposit_amount_pen: deposit,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        split_payments: paymentMethod === 'MIXED' ? splitPayments : null,
        notes: notes.trim()
      });

      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar la reserva.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar Nueva Reserva de Habitación"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Habitación y Fechas */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Habitación y Horarios Agendados</span>
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
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha / Hora Salida</label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
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
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
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
                {...getDocumentConstraints(docType)}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
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
                placeholder="Nombre del cliente"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono / Celular WhatsApp</label>
              <input
                type="text"
                placeholder="Ej: 987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* 3. Seña / Abono Previo con Pago Mixto */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
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
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Observaciones (Opcional)</label>
          <input
            type="text"
            placeholder="Ej: Llegada de madrugada, requiere cama matrimonial adicional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Botones de Acción */}
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
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>{saving ? 'Agendando...' : 'Confirmar Reserva'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

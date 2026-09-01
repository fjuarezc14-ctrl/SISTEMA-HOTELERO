import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import {
  Users,
  Search,
  UserX,
  UserCheck,
  ShieldAlert,
  Plus,
  AlertCircle,
  Share2,
  Star,
  Bed,
  Wallet,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { validateDocument, validateFullName, validatePhone, validateEmail, getDocumentConstraints } from '../utils/validators';

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'frequent' | 'blacklisted'

  // Modal para agregar o editar cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [docType, setDocType] = useState('DNI');
  const [docNum, setDocNum] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Error cargando clientes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleToggleBlacklist = async (customer) => {
    const willBlacklist = !customer.is_blacklisted;
    let reason = customer.blacklist_reason || '';

    if (willBlacklist) {
      const inputReason = window.prompt(`Motivo del veto para ${customer.full_name}:`, 'Incidencia o faltas durante la estadía');
      if (inputReason === null) return; // Cancelado
      reason = inputReason.trim() || 'Incidencia o falta grave';
    } else {
      if (!window.confirm(`¿Seguro de retirar el veto a ${customer.full_name}?`)) return;
    }

    try {
      await api.patch(`/customers/${customer.id}/toggle-blacklist`, {
        is_blacklisted: willBlacklist,
        blacklist_reason: reason
      });
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Error al cambiar estado de veto.');
    }
  };

  const handleSendWhatsApp = (c) => {
    const rawPhone = (c.phone || '').replace(/\D/g, '');
    const message = `*Hotel Zafiro*%0AHola *${c.full_name}*, te saludamos desde Hotel Zafiro. 🏨✨%0A¿En qué podemos ayudarte el día de hoy?`;
    const waUrl = rawPhone ? `https://wa.me/51${rawPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setDocType('DNI');
    setDocNum('');
    setFullName('');
    setPhone('');
    setEmail('');
    setIsBlacklisted(false);
    setBlacklistReason('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setDocType(c.document_type || 'DNI');
    setDocNum(c.document_number || '');
    setFullName(c.full_name || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setIsBlacklisted(c.is_blacklisted || false);
    setBlacklistReason(c.blacklist_reason || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setError('');

    const docError = validateDocument(docType, docNum);
    const nameError = validateFullName(fullName);
    const phoneError = validatePhone(phone, false);
    const emailError = validateEmail(email, false);
    const firstErr = docError || nameError || phoneError || emailError;
    if (firstErr) {
      setError(firstErr);
      return;
    }

    try {
      setSubmitting(true);
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, {
          document_type: docType,
          document_number: docNum.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          is_blacklisted: isBlacklisted,
          blacklist_reason: isBlacklisted ? blacklistReason.trim() : null
        });
      } else {
        await api.post('/customers', {
          document_type: docType,
          document_number: docNum.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          is_blacklisted: isBlacklisted,
          blacklist_reason: isBlacklisted ? blacklistReason.trim() : null
        });
      }

      setIsModalOpen(false);
      await fetchCustomers();
    } catch (err) {
      setError(err.message || 'Error guardando cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado de clientes
  const filteredCustomers = customers.filter((c) => {
    if (filterTab === 'blacklisted') return c.is_blacklisted;
    if (filterTab === 'frequent') return Number(c.stay_count || c.total_visits || 0) >= 3;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Padrón de Clientes & Lista Negra</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control de huérfanos, estadías frecuentes, incidentes previa entrada y veto de clientes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Registrar Cliente</span>
        </button>
      </div>

      {/* Bar de Búsqueda & Pestañas de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-3xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por DNI, RUC o Nombre..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Pestañas de Clasificación */}
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => setFilterTab('frequent')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              filterTab === 'frequent'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Frecuentes ({customers.filter((c) => Number(c.stay_count || c.total_visits || 0) >= 3).length})</span>
          </button>
          <button
            onClick={() => setFilterTab('blacklisted')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              filterTab === 'blacklisted'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Lista Negra ({customers.filter((c) => c.is_blacklisted).length})</span>
          </button>
        </div>
      </div>

      {/* Tabla Clientes */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Padrón Oficial de Huéspedes</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando clientes...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No se encontraron clientes con los criterios seleccionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Documento</th>
                  <th className="py-3 px-3">Huésped / Razón Social</th>
                  <th className="py-3 px-3 text-center">Estadías</th>
                  <th className="py-3 px-3 text-right">Consumo Acumulado</th>
                  <th className="py-3 px-3 text-center">Estado / Lista Negra</th>
                  <th className="py-3 px-3 text-right">Acciones Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => {
                  const stays = Number(c.stay_count || c.total_visits || 0);
                  const isVIP = stays >= 3;
                  const hasIncidents = Number(c.incident_count || 0) > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {c.document_type}: {c.document_number}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{c.full_name}</span>
                          {isVIP && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded-md flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{c.phone || 'Sin celular'}</p>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-lg text-slate-800">
                          <Bed className="w-3 h-3 text-slate-500" />
                          <span>{stays}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatPEN(c.total_spent_pen || 0)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {c.is_blacklisted ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>🛑 VETADO</span>
                            </span>
                            {c.blacklist_reason && (
                              <span className="text-[9px] text-rose-600 font-medium truncate max-w-[140px]" title={c.blacklist_reason}>
                                {c.blacklist_reason}
                              </span>
                            )}
                          </div>
                        ) : hasIncidents ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{c.incident_count} Incidencia(s)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Cliente Limpio
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleSendWhatsApp(c)}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-lg hover:bg-emerald-100 transition-all text-[11px] inline-flex items-center gap-1"
                          title="Contactar por WhatsApp"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleToggleBlacklist(c)}
                          className={`px-2 py-1 font-bold rounded-lg text-[11px] transition-all inline-flex items-center gap-1 ${
                            c.is_blacklisted
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                          title={c.is_blacklisted ? 'Retirar de lista negra' : 'Agregar a lista negra de veto'}
                        >
                          {c.is_blacklisted ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Quitar Veto</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3 text-rose-600" />
                              <span>Vetar</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Agregar / Editar Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Editar Cliente: ${editingCustomer.full_name}` : 'Registrar Nuevo Huésped'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo Doc.</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carné Extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="RUC">RUC</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Documento</label>
              <input
                type="text"
                required
                value={docNum}
                onChange={(e) => setDocNum(e.target.value)}
                {...getDocumentConstraints(docType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo / Razón Social</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Lista Negra */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-rose-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isBlacklisted}
                onChange={(e) => setIsBlacklisted(e.target.checked)}
                className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Marcar en Lista Negra (Bloquear o advertir ingreso)</span>
            </label>

            {isBlacklisted && (
              <input
                type="text"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.checked)}
                placeholder="Motivo de la advertencia / incidencia..."
                className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
              {submitting ? 'Guardando...' : 'Guardar Huésped'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

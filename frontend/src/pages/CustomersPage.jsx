import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { Users, Search, UserX, UserCheck, ShieldAlert, Plus, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { validateDocument, validateFullName, validatePhone, validateEmail, getDocumentConstraints } from '../utils/validators';

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
    if (firstErr) { setError(firstErr); return; }


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
            Búsqueda rápida por DNI/RUC, historial de hospedaje y control de huérfanos/incidencias.
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

      {/* Bar Búsqueda */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por DNI, RUC o Nombre del cliente..."
          className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Tabla Clientes */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Listado Oficial de Huéspedes</h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No se encontraron clientes registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Documento</th>
                  <th className="py-3 px-3">Nombre Completo</th>
                  <th className="py-3 px-3">Teléfono</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {c.document_type}: {c.document_number}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{c.full_name}</td>
                    <td className="py-3 px-3 text-slate-600">{c.phone || 'Sin registrar'}</td>
                    <td className="py-3 px-3">
                      {c.is_blacklisted ? (
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>Lista Negra ({c.blacklist_reason || 'Incidencia'})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Huésped Frecuente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
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
                onChange={(e) => setBlacklistReason(e.target.value)}
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

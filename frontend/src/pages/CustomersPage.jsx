import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatPEN, formatDatePeru } from '../utils/formatters';
import { Users, Search, UserX, UserCheck, ShieldAlert, Plus, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

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

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!docNum.trim() || !fullName.trim()) {
      setError('Número de documento y nombre son obligatorios.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/customers', {
        document_type: docType,
        document_number: docNum.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        is_blacklisted: isBlacklisted,
        blacklist_reason: isBlacklisted ? blacklistReason.trim() : ''
      });

      setIsModalOpen(false);
      await fetchCustomers();
    } catch (err) {
      setError(err.message || 'Error guardando cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBlacklist = async (customer) => {
    const willBlacklist = !customer.is_blacklisted;
    let reason = customer.blacklist_reason;
    if (willBlacklist) {
      reason = prompt('Ingresa el motivo del veto del huésped (Lista Negra):');
      if (reason === null) return;
    }

    try {
      await api.patch(`/customers/${customer.id}/blacklist`, {
        is_blacklisted: willBlacklist,
        blacklist_reason: reason || ''
      });
      await fetchCustomers();
    } catch (err) {
      alert(err.message || 'Error al actualizar estado de veto.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Directorio de Clientes / Huéspedes (Perú)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Registro con DNI, CE, Pasaporte o RUC, historial de visitas y control de veto.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Huésped</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por DNI, RUC, nombre o celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Customers Table */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Cargando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No se encontraron clientes registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Documento</th>
                  <th className="py-3 px-3">Huésped / Razón Social</th>
                  <th className="py-3 px-3">Teléfono</th>
                  <th className="py-3 px-3 text-center">Visitas</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <span className="font-semibold text-emerald-400">{c.document_type}</span> {c.document_number}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {c.full_name}
                      {c.is_blacklisted && (
                        <span className="block text-[10px] text-rose-400 font-normal mt-0.5">
                          Motivo veto: {c.blacklist_reason || 'Sin motivo'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{c.phone || '--'}</td>
                    <td className="py-3 px-3 text-center font-bold text-white">{c.total_visits}</td>
                    <td className="py-3 px-3 text-center">
                      {c.is_blacklisted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1">
                          <UserX className="w-3 h-3" />
                          <span>Vetado</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Permitido</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleBlacklist(c)}
                        className={`text-xs font-semibold ${
                          c.is_blacklisted ? 'text-emerald-400 hover:underline' : 'text-rose-400 hover:underline'
                        }`}
                      >
                        {c.is_blacklisted ? 'Quitar Veto' : 'Vetar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Editar Huésped' : 'Registrar Nuevo Huésped'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo Doc.</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="DNI">DNI (8 dígitos)</option>
                <option value="CE">Carné Extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="RUC">RUC (11 dígitos)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Documento</label>
              <input
                type="text"
                required
                value={docNum}
                onChange={(e) => setDocNum(e.target.value)}
                placeholder="Ej: 71234567"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo / Razón Social</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombres y Apellidos"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 987654321"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Veto */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <label className="flex items-center gap-2 text-xs text-rose-400 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isBlacklisted}
                onChange={(e) => setIsBlacklisted(e.target.checked)}
                className="rounded border-slate-800 text-rose-500 focus:ring-rose-500 bg-slate-900"
              />
              <span>Vetar huésped (Lista Negra)</span>
            </label>
            {isBlacklisted && (
              <textarea
                rows={2}
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Motivo del veto (daños a la propiedad, disturbios, etc.)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              {submitting ? 'Guardando...' : 'Guardar Huésped'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

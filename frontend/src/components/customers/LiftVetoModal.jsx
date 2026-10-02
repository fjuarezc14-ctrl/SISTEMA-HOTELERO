import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, UserCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { isAdminRole } from '../../utils/modules';
import { AdminAuthFields } from '../common/AdminAuthFields';

/** Quitar el veto a un cliente (requiere autorización de un administrador) */
export function LiftVetoModal({ isOpen, onClose, customer, onSuccess = () => {} }) {
  const { user } = useAuth();
  const needsAdminAuth = !isAdminRole(user?.role);
  const [adminAuth, setAdminAuth] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAdminAuth({ username: '', password: '' });
      setError('');
    }
  }, [isOpen]);

  if (!customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      await api.patch(`/customers/${customer.id}/toggle-blacklist`, {
        is_blacklisted: false,
        admin_username: needsAdminAuth ? adminAuth.username : undefined,
        admin_password: needsAdminAuth ? adminAuth.password : undefined
      });
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al quitar el veto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quitar Veto" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
          <div className="font-black text-rose-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>{customer.full_name}</span>
          </div>
          <div className="font-mono text-rose-700">
            {customer.document_type}: {customer.document_number}
          </div>
          <p className="text-rose-900">
            <span className="font-semibold">Motivo del veto:</span> {customer.blacklist_reason || 'Sin motivo registrado.'}
          </p>
        </div>

        <p className="text-xs text-slate-600">
          El cliente volverá a poder registrar estadías y reservas sin advertencias.
        </p>

        {needsAdminAuth && (
          <AdminAuthFields
            value={adminAuth}
            onChange={setAdminAuth}
            message="Quitar un veto requiere la autorización de un administrador."
          />
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{submitting ? 'Quitando...' : 'Quitar veto'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/apiClient';
import { formatPEN } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { isAdminRole } from '../utils/modules';
import { AdminAuthFields } from './AdminAuthFields';
import { AlertCircle, Ban } from 'lucide-react';

export function CancelTransactionModal({ isOpen, onClose, transaction, onSuccess = () => {} }) {
  const { user } = useAuth();
  const needsAdminAuth = !isAdminRole(user?.role);
  const [reason, setReason] = useState('');
  const [adminAuth, setAdminAuth] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setAdminAuth({ username: '', password: '' });
      setError('');
    }
  }, [isOpen]);

  if (!transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (reason.trim().length < 3) {
      setError('Indica el motivo de la anulación.');
      return;
    }
    try {
      setSubmitting(true);
      await api.patch(`/cash/transactions/${transaction.id}/cancel`, {
        reason: reason.trim(),
        admin_username: needsAdminAuth ? adminAuth.username : undefined,
        admin_password: needsAdminAuth ? adminAuth.password : undefined
      });
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al anular el movimiento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Anular Movimiento de Caja" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p className="font-bold text-slate-900">{transaction.concept}</p>
          <p className="font-mono font-black text-rose-700">{formatPEN(transaction.amount_pen)}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de anulación</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Ej: Error de marcado o devolución"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
          />
        </div>

        {needsAdminAuth && (
          <AdminAuthFields
            value={adminAuth}
            onChange={setAdminAuth}
            message="Anular un movimiento requiere la autorización de un administrador."
          />
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>{submitting ? 'Anulando...' : 'Anular Movimiento'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

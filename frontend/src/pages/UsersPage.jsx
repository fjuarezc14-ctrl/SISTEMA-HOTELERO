import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatDatePeru } from '../utils/formatters';
import { UserCog, Plus, KeyRound, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/Modal';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Crear Usuario
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('receptionist');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal Cambiar Clave
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      setCreating(true);
      await api.post('/users', {
        username: username.trim(),
        password,
        full_name: fullName.trim(),
        role
      });
      setIsCreateModalOpen(false);
      setUsername('');
      setPassword('');
      setFullName('');
      await fetchUsers();
    } catch (err) {
      setCreateError(err.message || 'Error creando usuario.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Error actualizando estado de usuario.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    try {
      setResetting(true);
      await api.post(`/users/${selectedUser.id}/reset-password`, { password: newPassword });
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setSelectedUser(null);
      alert('Contraseña actualizada con éxito.');
    } catch (err) {
      setResetError(err.message || 'Error restableciendo contraseña.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-400" />
            <span>Usuarios & Roles del Sistema</span>
          </h2>
          <p className="text-xs text-slate-400">
            Administración de credenciales, roles de acceso y activación de personal.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError('');
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Cargando usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3">Nombre Completo</th>
                  <th className="py-3 px-3">Rol</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-white">@{u.username}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{u.full_name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 capitalize border border-slate-700">
                        {u.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.is_active ? 'Activo' : 'Desactivado'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPassword('');
                          setResetError('');
                          setIsPasswordModalOpen(true);
                        }}
                        className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Restablecer Clave</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Usuario"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de Usuario (Login)</label>
            <input
              type="text"
              required
              placeholder="ej: juanperez"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo del Trabajador</label>
            <input
              type="text"
              required
              placeholder="Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rol / Cargo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="receptionist">Recepcionista</option>
                <option value="admin">Administrador</option>
                <option value="housekeeper">Limpieza / Ama de Llaves</option>
                <option value="super_admin">Super Administrador</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              {creating ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cambiar Contraseña */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Cambiar Contraseña: @${selectedUser?.username}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {resetError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nueva Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Nueva clave secreta"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resetting}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              {resetting ? 'Guardando...' : 'Actualizar Clave'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

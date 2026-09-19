import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { formatDatePeru } from '../utils/formatters';
import { validateUsername, validatePassword, validateFullName } from '../utils/validators';
import { UserCog, Plus, KeyRound, Check, AlertCircle, ShieldCheck, Search, Edit2, Crown, ConciergeBell, Sparkles, Eye, EyeOff, Wand2, Copy } from 'lucide-react';
import { Modal } from '../components/Modal';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Crear Usuario
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('receptionist');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal Editar Usuario
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('receptionist');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Modal Cambiar Clave
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Visibilidad de clave por fila para el administrador
  const [visibleRowPasswords, setVisibleRowPasswords] = useState({});

  // Función para generar contraseña aleatoria visible de 1-clic
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!';
    let pass = 'Zafiro';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

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

    const usernameErr = validateUsername(username);
    const passwordErr = validatePassword(password);
    const nameErr = validateFullName(fullName);
    const firstErr = usernameErr || passwordErr || nameErr;
    if (firstErr) {
      setCreateError(firstErr);
      return;
    }

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

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditUsername(u.username || '');
    setEditFullName(u.full_name || '');
    setEditRole(u.role || 'receptionist');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditError('');

    const usernameErr = validateUsername(editUsername);
    const nameErr = validateFullName(editFullName);
    const firstErr = usernameErr || nameErr;
    if (firstErr) {
      setEditError(firstErr);
      return;
    }

    try {
      setUpdating(true);
      await api.put(`/users/${editingUser.id}`, {
        username: editUsername.trim(),
        full_name: editFullName.trim(),
        role: editRole
      });
      setIsEditModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setEditError(err.message || 'Error actualizando usuario.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (u) => {
    const actionName = u.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro de ${actionName} el acceso al usuario @${u.username}?`)) return;

    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Error actualizando estado de usuario.');
    }
  };

  const handleOpenPasswordModal = (u) => {
    setSelectedUser(u);
    const autoPass = generateRandomPassword();
    setNewPassword(autoPass);
    setShowPassword(true); // Mostrar visible por defecto
    setResetError('');
    setResetSuccessMsg('');
    setCopied(false);
    setIsPasswordModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');

    const pwdErr = validatePassword(newPassword, 'Nueva Contraseña');
    if (pwdErr) {
      setResetError(pwdErr);
      return;
    }

    try {
      setResetting(true);
      await api.post(`/users/${selectedUser.id}/reset-password`, { password: newPassword });
      setResetSuccessMsg(`Contraseña de @${selectedUser.username} actualizada a: "${newPassword}"`);
      await fetchUsers();
    } catch (err) {
      setResetError(err.message || 'Error actualizando contraseña.');
    } finally {
      setResetting(false);
    }
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-600" />
            <span>Usuarios & Roles del Sistema</span>
          </h2>
          <p className="text-xs text-slate-500">
            Administración de credenciales, roles de acceso y personal autorizado para caja.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError('');
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      {/* Bar de Búsqueda */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar trabajador por usuario o nombre completo..."
          className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Personal Autorizado</h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No se encontraron usuarios coincidentes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3">Nombre Completo</th>
                  <th className="py-3 px-3">Rol / Nivel Acceso</th>
                  <th className="py-3 px-3">Contraseña Actual</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'super_admin' || u.role === 'admin';
                  const isHousekeeper = u.role === 'housekeeper';
                  const isPassVisible = visibleRowPasswords[u.id];

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">@{u.username}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{u.full_name}</td>
                      <td className="py-3 px-3">
                        {isAdmin ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 inline-flex items-center gap-1">
                            <Crown className="w-3 h-3 text-violet-600" />
                            <span>Administrador</span>
                          </span>
                        ) : isHousekeeper ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>Personal Limpieza</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <ConciergeBell className="w-3 h-3 text-emerald-600" />
                            <span>Recepcionista / Cajero</span>
                          </span>
                        )}
                      </td>

                      {/* Columna Ver Contraseña Actual (1-Clic) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg border transition-all ${
                            isPassVisible
                              ? 'bg-amber-50 text-slate-900 border-amber-300 shadow-2xs font-mono font-black'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}>
                            {isPassVisible ? (u.plain_password || 'admin123') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setVisibleRowPasswords((prev) => ({
                                ...prev,
                                [u.id]: !prev[u.id]
                              }));
                            }}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-700 transition-colors"
                            title={isPassVisible ? 'Ocultar clave' : 'Ver clave del usuario en 1-clic'}
                          >
                            {isPassVisible ? (
                              <EyeOff className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-400 hover:text-emerald-600" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Hacer clic para activar/desactivar acceso"
                        >
                          {u.is_active ? '🟢 Activo' : '🔴 Inactivo'}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleOpenPasswordModal(u)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold rounded-lg text-[11px] border border-amber-300 transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title="Restablecer o Asignar Clave Rápida en 1-Clic"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>🔑 Clave Rápida</span>
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

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Usuario"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de Usuario (Login)</label>
            <input
              type="text"
              required
              placeholder="ej: recepcion"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo del Trabajador</label>
            <input
              type="text"
              required
              placeholder="María López"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">Contraseña</label>
                <button
                  type="button"
                  onClick={() => {
                    const pass = generateRandomPassword();
                    setPassword(pass);
                    setShowCreatePassword(true);
                  }}
                  className="text-[10px] font-extrabold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                  title="Generar contraseña de prueba"
                >
                  <Wand2 className="w-3 h-3 text-amber-600" />
                  <span>🎲 Generar</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pr-9 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  title={showCreatePassword ? 'Ocultar' : 'Ver'}
                >
                  {showCreatePassword ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rol / Cargo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="receptionist">Recepcionista / Cajero</option>
                <option value="admin">Administrador General</option>
                <option value="housekeeper">Personal Limpieza</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
            >
              {creating ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Usuario */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Usuario: @${editingUser?.username}`}
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de Usuario</label>
            <input
              type="text"
              required
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo del Trabajador</label>
            <input
              type="text"
              required
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rol / Permisos de Acceso</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              <option value="receptionist">Recepcionista / Cajero</option>
              <option value="admin">Administrador General</option>
              <option value="housekeeper">Personal Limpieza</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
            >
              {updating ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cambiar Contraseña */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setResetSuccessMsg('');
        }}
        title={`🔑 Asignar Clave Rápida: @${selectedUser?.username}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {resetError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Clave actualizada correctamente!</span>
              </div>
              <div className="flex items-center justify-between bg-white border border-emerald-200 p-2 rounded-xl">
                <span className="font-mono text-sm font-black text-slate-900">{newPassword}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? '¡Copiada!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">Nueva Contraseña Visible</label>
              <button
                type="button"
                onClick={() => {
                  const pass = generateRandomPassword();
                  setNewPassword(pass);
                  setShowPassword(true);
                }}
                className="text-[11px] font-extrabold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
              >
                <Wand2 className="w-3 h-3 text-amber-600" />
                <span>🎲 Generar Clave Temporal</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Nueva clave secreta"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pr-10 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              El administrador puede hacer visible la clave presionando el ojo <Eye className="w-3 h-3 inline text-emerald-600" />.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setResetSuccessMsg('');
              }}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={resetting}
              className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all"
            >
              {resetting ? 'Guardando...' : 'Asignar Clave Rápida'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

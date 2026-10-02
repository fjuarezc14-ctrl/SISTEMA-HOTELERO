import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

/**
 * Campos de autorización de administrador (usuario + contraseña).
 * Se muestran solo si el usuario actual no es administrador.
 * value: { username, password }
 */
export function AdminAuthFields({ value, onChange, message = 'Esta acción requiere la autorización de un administrador.' }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2.5">
      <p className="text-[11px] font-semibold text-indigo-900 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span>{message}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          required
          autoComplete="off"
          placeholder="Usuario administrador"
          value={value.username}
          onChange={(e) => onChange({ ...value, username: e.target.value })}
          className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
        />
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Contraseña"
            value={value.password}
            onChange={(e) => onChange({ ...value, password: e.target.value })}
            className="w-full bg-white border border-indigo-200 rounded-lg p-2 pr-8 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

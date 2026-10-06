import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { useAuth } from './AuthContext';
import { useSmartPolling } from '../hooks/useSmartPolling';

const ShiftContext = createContext(null);

export function ShiftProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchActiveShift = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get('/shifts/active');
      setActiveShift(res.data);
    } catch (err) {
      console.error('Error cargando turno activo:', err.message);
      setActiveShift(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  // Sondeo inteligente cada 90s solo si está autenticado y pestaña visible
  useSmartPolling(fetchActiveShift, 90000, isAuthenticated);

  const openShift = async (initialCash, shiftNotes = '', adminAuth = null) => {
    const res = await api.post('/shifts/open', {
      initial_cash_pen: initialCash,
      shift_notes: shiftNotes,
      admin_username: adminAuth?.username || undefined,
      admin_password: adminAuth?.password || undefined
    });
    await fetchActiveShift();
    return res.data;
  };

  const closeShift = async (shiftId, actualCash, shiftNotes = '') => {
    const res = await api.post(`/shifts/${shiftId}/close`, {
      actual_cash_pen: actualCash,
      shift_notes: shiftNotes
    });
    await fetchActiveShift();
    return res.data;
  };

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        hasActiveShift: !!activeShift,
        loading,
        fetchActiveShift,
        openShift,
        closeShift
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift debe ser usado dentro de un ShiftProvider');
  }
  return context;
}

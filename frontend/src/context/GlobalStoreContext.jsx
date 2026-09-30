import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { api } from '../api/apiClient';

const GlobalStoreContext = createContext();

// Tiempos TTL por defecto (milisegundos)
export const TTL = {
  SHORT: 15 * 1000,       // 15 segundos (datos dinámicos)
  PRODUCTS: 2 * 60 * 1000, // 2 minutos (catálogo de tienda)
  ROOM_TYPES: 5 * 60 * 1000, // 5 minutos (tarifas por categoría)
  HOTEL_INFO: 10 * 60 * 1000 // 10 minutos (información estática del hotel)
};

export function GlobalStoreProvider({ children }) {
  // Caché en memoria: { [key]: { data, timestamp } }
  const cacheRef = useRef({});
  const [hotelInfo, setHotelInfoState] = useState(null);

  /**
   * Consulta datos con Caché TTL.
   * Si los datos existen en memoria y no han expirado, los retorna en 0ms.
   */
  const fetchWithTTL = useCallback(async (key, fetcherFn, ttlMs = TTL.PRODUCTS, forceRefresh = false) => {
    const now = Date.now();
    const cached = cacheRef.current[key];

    if (!forceRefresh && cached && (now - cached.timestamp < ttlMs)) {
      return cached.data;
    }

    const freshData = await fetcherFn();
    cacheRef.current[key] = {
      data: freshData,
      timestamp: Date.now()
    };
    return freshData;
  }, []);

  /**
   * Invalida una clave de caché o toda la caché si no se proporciona clave.
   */
  const invalidateCache = useCallback((key) => {
    if (key) {
      delete cacheRef.current[key];
    } else {
      cacheRef.current = {};
    }
  }, []);

  /** Obtiene productos con Caché TTL (2 min) */
  const getProducts = useCallback(async (forceRefresh = false) => {
    return fetchWithTTL('products', async () => {
      const res = await api.get('/products');
      return res.data || [];
    }, TTL.PRODUCTS, forceRefresh);
  }, [fetchWithTTL]);

  /** Obtiene tipos de habitación / tarifas con Caché TTL (5 min) */
  const getRoomTypes = useCallback(async (forceRefresh = false) => {
    return fetchWithTTL('room_types', async () => {
      const res = await api.get('/rooms/types');
      return res.data || [];
    }, TTL.ROOM_TYPES, forceRefresh);
  }, [fetchWithTTL]);

  /** Obtiene información del hotel con Caché TTL (10 min) y actualiza el estado reactivo */
  const getHotelInfo = useCallback(async (forceRefresh = false) => {
    const data = await fetchWithTTL('hotel_info', async () => {
      const res = await api.get('/settings/hotel-info');
      return res.data || null;
    }, TTL.HOTEL_INFO, forceRefresh);
    setHotelInfoState(data);
    if (data) {
      try {
        localStorage.setItem('hotel_info', JSON.stringify(data));
      } catch (e) {}
    }
    return data;
  }, [fetchWithTTL]);

  /** Actualiza directamente la información del hotel de forma reactiva */
  const updateHotelInfo = useCallback((newInfo) => {
    cacheRef.current['hotel_info'] = {
      data: newInfo,
      timestamp: Date.now()
    };
    setHotelInfoState(newInfo);
    if (newInfo) {
      try {
        localStorage.setItem('hotel_info', JSON.stringify(newInfo));
      } catch (e) {}
    }
  }, []);

  // Cargar hotelInfo al iniciar
  useEffect(() => {
    getHotelInfo().catch(() => {});
  }, [getHotelInfo]);

  return (
    <GlobalStoreContext.Provider
      value={{
        fetchWithTTL,
        invalidateCache,
        getProducts,
        getRoomTypes,
        getHotelInfo,
        updateHotelInfo,
        hotelInfo
      }}
    >
      {children}
    </GlobalStoreContext.Provider>
  );
}

export function useGlobalStore() {
  const context = useContext(GlobalStoreContext);
  if (!context) {
    throw new Error('useGlobalStore debe ser usado dentro de un GlobalStoreProvider');
  }
  return context;
}

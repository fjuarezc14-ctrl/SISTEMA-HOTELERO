import { useEffect, useRef } from 'react';

/**
 * Hook reutilizable para polling inteligente:
 * - Ejecuta el callback en intervalos periódicos mientras la pestaña está visible.
 * - Pausa automáticamente las peticiones cuando el usuario minimiza o cambia de pestaña (document.hidden).
 * - Ejecuta una sincronización inmediata tan pronto como la pestaña vuelve a estar visible.
 *
 * @param {Function} callback - Función asíncrona o síncrona a ejecutar.
 * @param {number} intervalMs - Intervalo en milisegundos.
 * @param {boolean} enabled - Si el polling debe estar activo (por defecto true).
 */
export function useSmartPolling(callback, intervalMs, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !intervalMs || intervalMs <= 0) return;

    let timerId = null;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        savedCallback.current?.();
      }
    };

    const startTimer = () => {
      if (timerId) clearInterval(timerId);
      timerId = setInterval(tick, intervalMs);
    };

    const stopTimer = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Al regresar a la pestaña, sincronizar inmediatamente y reactivar el temporizador
        tick();
        startTimer();
      } else {
        // Pausar completamente las peticiones en segundo plano
        stopTimer();
      }
    };

    // Si la pestaña está visible al montar, iniciar el temporizador
    if (document.visibilityState === 'visible') {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
}

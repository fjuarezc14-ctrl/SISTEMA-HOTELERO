// Horarios configurados del hotel (pernocte y estadía por días)

const toMinutes = (hhmm, fallback) => {
  const [h, m] = String(hhmm || fallback).split(':').map((n) => parseInt(n, 10));
  return (Number.isInteger(h) ? h : 0) * 60 + (Number.isInteger(m) ? m : 0);
};

export const schedule = (hotelInfo) => ({
  pernocteStart: String(hotelInfo?.pernocte_start_time || '20:00').slice(0, 5),
  pernocteCheckout: String(hotelInfo?.pernocte_checkout_time || '09:00').slice(0, 5),
  dayCheckout: String(hotelInfo?.overnight_checkout_time || '12:00').slice(0, 5),
  checkin: String(hotelInfo?.standard_checkin_time || '14:00').slice(0, 5)
});

/** ¿A esta hora se puede vender pernocte? (desde la hora de inicio hasta la hora de salida del día siguiente) */
export function isPernocteTime(hotelInfo, date = new Date()) {
  const s = schedule(hotelInfo);
  const now = date.getHours() * 60 + date.getMinutes();
  const from = toMinutes(s.pernocteStart, '20:00');
  const until = toMinutes(s.pernocteCheckout, '09:00');
  return from > until ? now >= from || now < until : now >= from && now < until;
}

/** Hora en formato 12h para mostrar (ej. "8:00 p. m.") */
export function formatTime12(hhmm) {
  const [h, m] = String(hhmm).split(':').map((n) => parseInt(n, 10));
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}

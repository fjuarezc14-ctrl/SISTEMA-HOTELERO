// Avisos de llegadas por reserva: solo se muestran los últimos días antes de la llegada.
export const ARRIVAL_ALERT_DAYS = 3;

const limaDay = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(date));

/** Días de calendario (hora de Lima) que faltan para la llegada: 0 = hoy, 1 = mañana... (negativo si ya pasó) */
export function daysUntilArrival(reservation, now = new Date()) {
  const a = new Date(`${limaDay(now)}T00:00:00Z`);
  const b = new Date(`${limaDay(reservation.start_date)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** ¿La reserva debe mostrarse como aviso de llegada? (confirmada y llega en los próximos 3 días) */
export function isArrivalAlert(reservation, now = new Date()) {
  if (reservation.status !== 'confirmed') return false;
  const days = daysUntilArrival(reservation, now);
  return days >= 0 && days <= ARRIVAL_ALERT_DAYS;
}

export function arrivalLabel(reservation, now = new Date()) {
  const days = daysUntilArrival(reservation, now);
  if (days <= 0) return 'LLEGA HOY';
  if (days === 1) return 'LLEGA MAÑANA';
  return `LLEGA EN ${days} DÍAS`;
}

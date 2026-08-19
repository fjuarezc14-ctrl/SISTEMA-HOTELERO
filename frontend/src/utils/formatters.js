/**
 * Formateadores de moneda, fechas y validadores adaptados a Perú
 */

export function formatPEN(amount = 0) {
  const num = Number(amount) || 0;
  return `S/ ${num.toFixed(2)}`;
}

export function formatDatePeru(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export function formatTimePeru(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export function getRemainingTime(expectedEndTimeIso) {
  if (!expectedEndTimeIso) return { text: '--', isExpired: false, percent: 0 };
  const target = new Date(expectedEndTimeIso).getTime();
  const now = new Date().getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    const expiredMinutes = Math.abs(Math.floor(diffMs / 60000));
    const expHours = Math.floor(expiredMinutes / 60);
    const expMins = expiredMinutes % 60;
    return {
      text: `Vencido (+${expHours > 0 ? `${expHours}h ` : ''}${expMins}m)`,
      isExpired: true,
      diffMinutes: expiredMinutes
    };
  }

  const remainingMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return {
    text: `${hours > 0 ? `${hours}h ` : ''}${minutes}m restantes`,
    isExpired: false,
    diffMinutes: remainingMinutes
  };
}

export const PAYMENT_METHOD_LABELS = {
  YAPE_PLIN: 'Yape / Plin',
  CASH: 'Efectivo',
  CARD: 'Tarjeta (POS)'
};

export const ROOM_STATUS_CONFIG = {
  available: {
    label: 'Disponible',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    cardBg: 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50'
  },
  occupied: {
    label: 'Ocupada',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dotColor: 'bg-rose-500',
    cardBg: 'bg-rose-950/20 border-rose-900/40 hover:border-rose-500/50'
  },
  cleaning: {
    label: 'Limpieza',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotColor: 'bg-amber-500 animate-pulse',
    cardBg: 'bg-amber-950/20 border-amber-900/40 hover:border-amber-500/50'
  },
  maintenance: {
    label: 'Mantenimiento',
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    dotColor: 'bg-slate-500',
    cardBg: 'bg-slate-900/40 border-slate-800 opacity-70'
  }
};

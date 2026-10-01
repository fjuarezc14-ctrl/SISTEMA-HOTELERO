// Utilidades para inputs <input type="datetime-local"> (formato YYYY-MM-DDTHH:mm, hora local)

const pad = (n) => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DDTHH:mm' */
export function toDateTimeInput(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Fecha de salida: N días después de la llegada, a las 12:00 (hora de salida del hotel) */
export function checkoutAfterDays(startInput, days, checkoutHour = 12) {
  const d = startInput ? new Date(startInput) : new Date();
  d.setDate(d.getDate() + days);
  d.setHours(checkoutHour, 0, 0, 0);
  return toDateTimeInput(d);
}

/** Noches entre dos fechas (por día calendario, mínimo 1) */
export function nightsBetween(startInput, endInput) {
  const a = new Date(startInput);
  const b = new Date(endInput);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / 86400000));
}

/**
 * Utilidades para manejo de fechas y horas adaptadas a la zona horaria de Perú (America/Lima UTC-5)
 */

export const TIMEZONE = process.env.TIMEZONE || 'America/Lima';

/**
 * Obtiene la hora actual formateada en HH:MM (Formato 24h Perú)
 */
export function getCurrentTimePeru() {
  const options = {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const parts = new Intl.DateTimeFormat('es-PE', options).formatToParts(new Date());
  const map = {};
  parts.forEach(p => (map[p.type] = p.value));
  return `${map.hour}:${map.minute}`;
}

/**
 * Obtiene la fecha y hora actual formateada en DD/MM/YYYY, HH:MM
 */
export function getCurrentDateTimePeru() {
  const options = {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const parts = new Intl.DateTimeFormat('es-PE', options).formatToParts(new Date());
  const map = {};
  parts.forEach(p => (map[p.type] = p.value));
  return `${map.day}/${map.month}/${map.year}, ${map.hour}:${map.minute}`;
}

/**
 * Calcula la fecha y hora estimada de finalización según la modalidad
 * @param {Date|string} startDate Fecha de inicio
 * @param {string} stayType Tipo de estadía ('hours', 'overnight', 'full_day')
 * @param {number} hoursCount Cantidad de horas si es por modalidad 'hours'
 */
export function calculateExpectedEndTime(startDate = new Date(), stayType = 'hours', hoursCount = 3) {
  const start = new Date(startDate);
  const result = new Date(start);

  if (stayType === 'hours') {
    result.setHours(result.getHours() + Number(hoursCount));
  } else if (stayType === 'overnight') {
    // Pernocta: Salida al día siguiente a las 12:00 PM (Mediodía)
    result.setDate(result.getDate() + 1);
    result.setHours(12, 0, 0, 0);
  } else if (stayType === 'full_day') {
    // Día completo: 24 horas después
    result.setHours(result.getHours() + 24);
  }

  return result.toISOString();
}

/**
 * Formatea un monto numérico a formato de moneda peruana (S/ 0.00)
 */
export function formatCurrencyPEN(amount = 0) {
  return `S/ ${Number(amount).toFixed(2)}`;
}

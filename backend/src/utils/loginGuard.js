/**
 * Protección contra fuerza bruta en memoria: bloquea temporalmente una clave
 * (IP + usuario) después de varios intentos fallidos.
 */
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map(); // key -> { count, lockedUntil }

function operationalError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export const loginGuard = {
  key(ip, username) {
    return `${ip || 'unknown'}|${String(username || '').trim().toLowerCase()}`;
  },

  /** Lanza error 429 si la clave está bloqueada */
  assertNotLocked(key) {
    const entry = attempts.get(key);
    if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
      const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
      throw operationalError(`Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto(s).`, 429);
    }
  },

  registerFailure(key) {
    const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };
    if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
      entry.count = 0;
      entry.lockedUntil = 0;
    }
    entry.count += 1;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCK_MS;
    }
    attempts.set(key, entry);
  },

  registerSuccess(key) {
    attempts.delete(key);
  }
};

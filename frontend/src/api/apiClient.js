/**
 * Cliente HTTP centralizado para comunicación con la API Backend
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('valetec_hotel_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        // Token expirado o inválido
        localStorage.removeItem('valetec_hotel_token');
        localStorage.removeItem('valetec_hotel_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/';
        }
      }
      throw new Error(data.message || 'Error en la solicitud al servidor.');
    }

    return data;
  } catch (error) {
    console.error(`Error en API [${endpoint}]:`, error.message);
    throw error;
  }
}

export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
};

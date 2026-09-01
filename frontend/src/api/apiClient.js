/**
 * Cliente HTTP centralizado para comunicación con la API Backend
 */

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('valetec_hotel_token');
  const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';

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
    const res = await fetch(`${baseUrl}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401 || (data.message && data.message.toLowerCase().includes('token'))) {
        // Token expirado o inválido -> Limpiar sesión y redirigir
        localStorage.removeItem('valetec_hotel_token');
        localStorage.removeItem('valetec_hotel_user');
        window.location.reload();
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

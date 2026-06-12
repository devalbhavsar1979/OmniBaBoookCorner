import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally + normalize Pydantic validation errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Pydantic v2 returns detail as an array of {type, loc, msg, input, ctx, url}
    // Flatten it into a single readable string so components can render it safely
    const detail = err.response?.data?.detail;
    if (Array.isArray(detail)) {
      err.response.data.detail = detail
        .map((e) => `${e.loc?.slice(1).join('.') || 'field'} — ${e.msg}`)
        .join('; ');
    }

    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Libraries ─────────────────────────────────────────────────────────────────
export const libraryApi = {
  list: (params) => api.get('/libraries', { params }),
  mine: () => api.get('/libraries/mine'),
  get: (id) => api.get(`/libraries/${id}`),
  create: (data) => api.post('/libraries', data),
  update: (id, data) => api.put(`/libraries/${id}`, data),
  delete: (id) => api.delete(`/libraries/${id}`),
};

// ── Books ─────────────────────────────────────────────────────────────────────
export const bookApi = {
  list: (params) => api.get('/books', { params }),
  get: (id) => api.get(`/books/${id}`),
  create: (libraryId, formData) =>
    api.post(`/books/library/${libraryId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, formData) =>
    api.put(`/books/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id) => api.delete(`/books/${id}`),
  issue: (id, data) => api.post(`/books/${id}/issue`, data),
};

// ── Requests ──────────────────────────────────────────────────────────────────
export const requestApi = {
  list: (params) => api.get('/requests', { params }),
  get: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  advance: (id) => api.post(`/requests/${id}/advance`),
  cancel: (id) => api.delete(`/requests/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard'),
};

export const getImageUrl = (filename) => {
  if (!filename) return null;
  return `${process.env.REACT_APP_UPLOADS_URL || 'http://localhost:8000/uploads'}/${filename}`;
};

export default api;
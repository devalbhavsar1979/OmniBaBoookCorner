import axios from 'axios';

export const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
// Used only for building public share links — should be the HTTPS public domain.
export const SHARE_BASE_URL = process.env.REACT_APP_SHARE_BASE_URL || BASE_URL.replace('/api/v1', '');

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
  updateMe: (data) => api.put('/auth/me', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
  switchRole: (role) => api.post('/auth/switch-role', { role }),
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
  scanCover: (formData) =>
    api.post('/books/scan-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  lookupIsbn: (isbn) => api.get('/books/lookup-isbn', { params: { isbn } }),
};

// ── Requests ──────────────────────────────────────────────────────────────────
export const requestApi = {
  list: (params) => api.get('/requests', { params }),
  get: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  advance: (id) => api.post(`/requests/${id}/advance`),
  cancel: (id) => api.delete(`/requests/${id}`),
  activeCount: () => api.get('/requests/my/active-count'),
  directReturn: (id) => api.post(`/requests/${id}/direct-return`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard'),
};

// ── Wish Requests ("Book Request" feature) ────────────────────────────────────
export const wishRequestApi = {
  create: (formData) =>
    api.post('/wish-requests', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listMine: (params) => api.get('/wish-requests/me', { params }),
  listAll: (params) => api.get('/wish-requests', { params }),
  get: (id) => api.get(`/wish-requests/${id}`),
  update: (id, formData) =>
    api.put(`/wish-requests/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  accept: (id, formData) =>
    api.post(`/wish-requests/${id}/accept`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  reject: (id, admin_note) => api.post(`/wish-requests/${id}/reject`, { admin_note }),
};

// ── Gamification ──────────────────────────────────────────────────────────────
export const gamificationApi = {
  myScore: () => api.get('/gamification/me'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  issueRegister: (params) => api.get('/admin/issue-register', { params }),
  sendOverdueReminder: (requestId) => api.post(`/admin/issue-register/${requestId}/remind`),
  pendingRoleRequests: () => api.get('/users/role-requests/pending'),
  approveRoleRequest: (id) => api.post(`/users/role-requests/${id}/approve`),
  rejectRoleRequest: (id, rejection_note) =>
    api.post(`/users/role-requests/${id}/reject`, { rejection_note }),
};

// ── User (self-service roles) ─────────────────────────────────────────────────
export const userApi = {
  myRoles: () => api.get('/users/me/roles'),
  requestRoles: (roles) => api.post('/users/me/role-requests', { roles }),
};

export const getImageUrl = (filename) => {
  if (!filename) return null;
  return `${process.env.REACT_APP_UPLOADS_URL || 'http://localhost:8000/uploads'}/${filename}`;
};

export default api;
import axios from 'axios';
import { clearAuthSession, getAuthToken } from '../utils/authStorage';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuthSession();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  me: () => api.get('/auth/me'),
};

export const profileApi = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  updatePreferences: (data) => api.patch('/profile/preferences', data),
};

export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.patch('/notifications/preferences', data),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  archive: (id) => api.patch(`/notifications/${id}/archive`),
  broadcast: (data) => api.post('/notifications/broadcast', data),
};

export const adminUsersApi = {
  getAll: (params) => api.get('/admin/users', { params }),
  create: (data) => api.post('/admin/users', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
};

export const usersApi = {
  getDirectory: (params) => api.get('/users/directory', { params }),
};

export const publicSignalsApi = {
  getFeatured: (params) => api.get('/public/signals/featured', { params }),
  getSuggestions: (params) => api.get('/public/signals/suggestions', { params }),
};

export const signalsApi = {
  getAll: (params) => api.get('/signals', { params }),
  getTagSuggestions: (params) => api.get('/signals/tags/suggestions', { params }),
  getNeedsVote: () => api.get('/signals/needs-vote'),
  getById: (id) => api.get(`/signals/${id}`),
  create: (data) => api.post('/signals', data),
  update: (id, data) => api.put(`/signals/${id}`, data),
  vote: (id, data) => api.post(`/signals/${id}/vote`, data),
  delete: (id) => api.delete(`/signals/${id}`),
};

export const workshopsApi = {
  getAll: () => api.get('/workshops'),
  getById: (id) => api.get(`/workshops/${id}`),
  create: (data) => api.post('/workshops', data),
};

export const scenariosApi = {
  getByWorkshop: (workshopId) => api.get(`/scenarios?workshopId=${workshopId}`),
  getById: (id) => api.get(`/scenarios/${id}`),
  create: (data) => api.post('/scenarios', data),
  select: (id, workshopId) => api.put(`/scenarios/${id}/select`, { workshopId }),
  selectMany: (workshopId, scenarioIds) => api.put('/scenarios/selected', { workshopId, scenarioIds }),
};

export const swotApi = {
  getByScenario: (scenarioId) => api.get(`/swot/${scenarioId}`),
  update: (scenarioId, data) => api.put(`/swot/${scenarioId}`, data),
  addItem: (scenarioId, quadrant, item) =>
    api.post(`/swot/${scenarioId}/item`, { quadrant, item }),
};

export const generateScenarioWithAI = async (workshopId, radarSignals = []) => {
  const response = await api.post(`/scenarios/${workshopId}/generate-ai`, { radarSignals });
  return response.data;
};

export default api;

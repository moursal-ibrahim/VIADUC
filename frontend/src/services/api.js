import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('viaduc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('viaduc_token');
      localStorage.removeItem('viaduc_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  seller: () => api.get('/analytics/seller'),
  createEntry: (data) => api.post('/analytics/entries', data),
  moneySubmission: (data) => api.post('/analytics/money-submissions', data),
  sellerFunding: (params) => api.get('/analytics/seller-funding', { params }),
  fundSeller: (data) => api.post('/analytics/seller-funding', data),
};

export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  transfers: () => api.get('/inventory/transfers'),
  transfer: (data) => api.post('/inventory/transfers', data),
  history: () => api.get('/inventory/history'),
  lowStock: () => api.get('/inventory/alerts/low-stock'),
};

export const warehouseApi = {
  list: () => api.get('/warehouses'),
  analytics: () => api.get('/warehouses/analytics'),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
};

export const productApi = {
  list: () => api.get('/products'),
  pricing: () => api.get('/products/pricing/all'),
  upsertPricing: (data) => api.post('/products/pricing', data),
  wholesalePricing: () => api.get('/products/wholesale/all'),
  createWholesalePricing: (data) => api.post('/products/wholesale', data),
  updateWholesalePricing: (id, data) => api.put(`/products/wholesale/${id}`, data),
  deleteWholesalePricing: (id) => api.delete(`/products/wholesale/${id}`),
};

export const financeApi = {
  dashboard: (params) => api.get('/finance/dashboard', { params }),
  expenses: (params) => api.get('/finance/expenses', { params }),
  createExpense: (data) => api.post('/finance/expenses', data),
  salaries: (params) => api.get('/finance/salaries', { params }),
  createSalary: (data) => api.post('/finance/salaries', data),
  transfers: (params) => api.get('/finance/transfers', { params }),
  createTransfer: (data) => api.post('/finance/transfers', data),
  warehouseTransfers: (params) => api.get('/finance/warehouse-transfers', { params }),
  createWarehouseTransfer: (data) => api.post('/finance/warehouse-transfers', data),
};

export const containerApi = {
  list: (params) => api.get('/containers', { params }),
  analytics: () => api.get('/containers/analytics'),
  create: (data) => api.post('/containers', data),
  update: (id, data) => api.put(`/containers/${id}`, data),
  delete: (id) => api.delete(`/containers/${id}`),
};

export const reportsApi = {
  list: () => api.get('/reports'),
  generate: (params) => api.post('/reports/generate', null, { params }),
  exportPdf: (params) => api.get('/reports/export/pdf', { params, responseType: 'blob' }),
  exportExcel: (params) => api.get('/reports/export/excel', { params, responseType: 'blob' }),
  twoDay: () => api.get('/reports/two-day'),
  twoDayDue: () => api.get('/reports/two-day/due'),
  exportTwoDayPdf: () => api.get('/reports/two-day/export/pdf', { responseType: 'blob' }),
};

export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const openingStockApi = {
  status: () => api.get('/opening-stock/status'),
  list: () => api.get('/opening-stock'),
  saveSnapshot: (data) => api.post('/opening-stock/snapshot', data),
};

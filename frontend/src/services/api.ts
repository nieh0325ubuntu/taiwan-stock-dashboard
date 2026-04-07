import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email: string, password: string, fullName?: string) =>
    api.post('/auth/register', { email, password, full_name: fullName }),

  login: (email: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),

  me: () => api.get('/auth/me'),

  bindTelegram: (chatId: string) =>
    api.post('/auth/bind-telegram', null, { params: { chat_id: chatId } }),

  bindTelegramByCode: (bindCode: string, chatId: string) =>
    api.post('/auth/bind-telegram-by-code', null, { params: { bind_code: bindCode, chat_id: chatId } }),

  unbindTelegram: () =>
    api.post('/auth/unbind-telegram'),
};

export const stocksAPI = {
  search: (keyword: string) => api.get('/stocks/search', { params: { keyword } }),

  getStock: (code: string) => api.get(`/stocks/${code}`),

  getRealtime: (code: string) => api.get(`/stocks/${code}/realtime`),

  getHistory: (code: string, days: number = 90) =>
    api.get(`/stocks/${code}/history`, { params: { days } }),

  getIndicators: (code: string) => api.get(`/stocks/${code}/indicators`),
};

export const portfolioAPI = {
  getAll: () => api.get('/portfolio/'),

  add: (data: { stock_code: string; stock_name?: string; shares: number; avg_price: number; buy_date?: string; fee?: number }) =>
    api.post('/portfolio/', data),

  update: (id: number, data: { shares?: number; avg_price?: number; buy_date?: string; fee?: number }) =>
    api.put(`/portfolio/${id}`, data),

  delete: (id: number) => api.delete(`/portfolio/${id}`),

  export: () => api.get('/portfolio/export'),

  import: (data: object, mode: string = 'merge') =>
    api.post('/portfolio/import', data, { params: { mode } }),
};

export const alertsAPI = {
  getAll: () => api.get('/alerts/'),

  create: (data: { stock_code: string; condition: string; target_price: number }) =>
    api.post('/alerts/', data),

  delete: (id: number) => api.delete(`/alerts/${id}`),

  export: () => api.get('/alerts/export'),

  import: (data: object, mode: string = 'merge') =>
    api.post('/alerts/import', data, { params: { mode } }),
};

export const dataAPI = {
  export: () => api.get('/data/export'),

  import: (data: object, mode: string = 'replace') =>
    api.post('/data/import', data, { params: { mode } }),
};

export const modelAPI = {
  chat: (messages: { role: string; content: string }[]) =>
    api.post('/model/chat', { messages }).then(res => ({ data: res.data })),
};

export default api;
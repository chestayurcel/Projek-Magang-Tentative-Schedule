import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:5000/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Otomatis suntikkan token JWT ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Tangani response error secara global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired atau tidak valid, paksa logout
      localStorage.removeItem('kai_token');
      localStorage.removeItem('kai_user');
      window.location.href = '/tentative-schedule/login';
    }
    return Promise.reject(error);
  }
);

export default api;

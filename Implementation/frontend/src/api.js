import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – unwrap {status, data, message} envelope
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && body.status === 'success') {
      return body.data;
    }
    return body;
  },
  (error) => {
    if (error.response) {
      const msg =
        error.response.data?.message ||
        error.response.data?.detail ||
        'Something went wrong';
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(error);
  }
);

export default api;

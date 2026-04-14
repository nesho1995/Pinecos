import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7085/api';

const api = axios.create({
  baseURL: apiBaseUrl
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

import axios from 'axios';
import { clearSession } from '../utils/auth';
import { getToken } from '../utils/auth';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5152/api';
const genericErrorMessage = 'Ocurrio un error interno. Intenta nuevamente o contacta al administrador.';

const sanitizeBackendMessage = (input) => {
  if (!input) return '';
  const raw = String(input).trim();
  if (!raw) return '';

  const hasWindowsPath = /[a-z]:\\[^\r\n]+/i.test(raw);
  const hasUnixPath = /\/(users|home|var|opt|srv)\/[^\s]+/i.test(raw);
  const hasStackTrace = /(stack trace|\.cs:line\s*\d+|\bat\s+[^\r\n]+\([^\r\n]*\)|\bexception\b)/i.test(raw);

  if (hasWindowsPath || hasUnixPath || hasStackTrace) return genericErrorMessage;
  if (raw.length > 260) return `${raw.slice(0, 260)}...`;
  return raw;
};

const api = axios.create({
  baseURL: apiBaseUrl
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const endpoint = String(error?.config?.url || '').toLowerCase();
    const isLoginRequest = endpoint.includes('/auth/login');

    try {
      const responseData = error?.response?.data;
      const status = error?.response?.status;
      const baseMessage =
        typeof responseData === 'string'
          ? responseData
          : responseData?.message || responseData?.title || error?.message || '';

      const fallbackByStatus =
        status === 401 ? 'Sesion expirada o credenciales invalidas.' :
        status === 403 ? 'No tienes permisos para realizar esta accion.' :
        genericErrorMessage;

      const sanitized = sanitizeBackendMessage(baseMessage) || fallbackByStatus;
      error.message = sanitized;

      if (error?.response) {
        if (typeof responseData === 'string') {
          error.response.data = { message: sanitized };
        } else if (responseData && typeof responseData === 'object') {
          error.response.data = { ...responseData, message: sanitized };
        } else {
          error.response.data = { message: sanitized };
        }
      }
    } catch {
      error.message = genericErrorMessage;
      if (error?.response) error.response.data = { message: genericErrorMessage };
    }

    if (status === 401 && !isLoginRequest) {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;

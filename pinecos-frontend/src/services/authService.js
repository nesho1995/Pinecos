import api from './api';

export const loginRequest = async (usuario, clave) => {
  const response = await api.post('/Auth/login', { usuario, clave });
  return response.data;
};

export const meRequest = async () => {
  const response = await api.get('/Auth/me');
  return response.data;
};

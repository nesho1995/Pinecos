import api from './api';

export const loginRequest = async (usuario, clave) => {
  const response = await api.post('/Auth/login', { usuario, clave });
  return response.data;
};

export const seleccionarSucursalRequest = async (selectionToken, id_Sucursal) => {
  const response = await api.post('/Auth/seleccionar-sucursal', { selectionToken, id_Sucursal });
  return response.data;
};

export const meRequest = async () => {
  const response = await api.get('/Auth/me');
  return response.data;
};

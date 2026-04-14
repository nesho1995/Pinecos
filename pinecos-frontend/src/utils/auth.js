export const getToken = () => localStorage.getItem('token');

export const setSession = (token, usuario) => {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
};

export const getUsuario = () => {
  const data = localStorage.getItem('usuario');
  return data ? JSON.parse(data) : null;
};

export const isAuthenticated = () => !!getToken();
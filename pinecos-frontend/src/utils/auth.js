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

export const getUserRole = () => {
  const usuario = getUsuario();
  return String(usuario?.rol || usuario?.Rol || '').toUpperCase();
};

export const isAdmin = () => getUserRole() === 'ADMIN';

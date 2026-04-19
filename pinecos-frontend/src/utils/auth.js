const safeParseJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = safeParseJwtPayload(token);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  // Margen de 30s para evitar usar tokens justo al expirar.
  return now >= Number(payload.exp) - 30;
};

export const getToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    return null;
  }
  return token;
};

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

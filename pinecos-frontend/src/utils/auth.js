const sessionStore = window.sessionStorage;
const legacyStore = window.localStorage;

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
  const token = sessionStore.getItem('token');
  if (!token) return null;
  if (isTokenExpired(token)) {
    sessionStore.removeItem('token');
    sessionStore.removeItem('usuario');
    legacyStore.removeItem('token');
    legacyStore.removeItem('usuario');
    return null;
  }
  return token;
};

export const setSession = (token, usuario) => {
  sessionStore.setItem('token', token);
  sessionStore.setItem('usuario', JSON.stringify(usuario));
  legacyStore.removeItem('token');
  legacyStore.removeItem('usuario');
};

export const clearSession = () => {
  sessionStore.removeItem('token');
  sessionStore.removeItem('usuario');
  legacyStore.removeItem('token');
  legacyStore.removeItem('usuario');
};

export const getUsuario = () => {
  const data = sessionStore.getItem('usuario');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    sessionStore.removeItem('usuario');
    return null;
  }
};

export const isAuthenticated = () => !!getToken();

export const getUserRole = () => {
  const usuario = getUsuario();
  return String(usuario?.rol || usuario?.Rol || '').toUpperCase();
};

export const isAdmin = () => getUserRole() === 'ADMIN';
export const isCajero = () => getUserRole() === 'CAJERO';
export const isSupervisor = () => getUserRole() === 'SUPERVISOR';

export const getDefaultRouteByRole = () => {
  const role = getUserRole();
  if (role === 'CAJERO' || role === 'SUPERVISOR') return '/caja';
  return '/dashboard';
};

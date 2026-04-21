import { expect } from '@playwright/test';
import { E2E_ENV, buildTempUser } from './e2e-env';

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

export const loginApi = async (apiContext, usuario, clave) => {
  const response = await apiContext.post('/api/Auth/login', {
    data: { usuario, clave }
  });
  const rawBody = await response.text();
  let body = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = { message: rawBody || '' };
  }
  return {
    status: response.status(),
    ok: response.ok(),
    body,
    token: body?.token || null
  };
};

export const createAdminSession = async (apiContext) => {
  expect(
    Boolean(E2E_ENV.adminPass),
    'Debes configurar E2E_ADMIN_PASS para ejecutar pruebas E2E.'
  ).toBeTruthy();

  const maxAttempts = 4;
  let lastLogin = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const login = await loginApi(apiContext, E2E_ENV.adminUser, E2E_ENV.adminPass);
    lastLogin = login;
    if (login.ok) return login.token;

    if (login.status === 429 && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
      continue;
    }

    break;
  }

  expect(
    lastLogin?.ok,
    `No se pudo iniciar sesion con ${E2E_ENV.adminUser}. Status=${lastLogin?.status} Msg=${lastLogin?.body?.message || ''}`
  ).toBeTruthy();
  return lastLogin?.token || '';
};

export const fetchFirstSucursalId = async (apiContext, adminToken) => {
  const response = await apiContext.get('/api/Sucursales?incluirInactivas=true', {
    headers: authHeaders(adminToken)
  });
  expect(response.ok(), `No se pudieron listar sucursales. Status=${response.status()}`).toBeTruthy();
  const data = await response.json();
  expect(Array.isArray(data) && data.length > 0, 'No hay sucursales para pruebas E2E').toBeTruthy();
  return Number(data[0].id_Sucursal);
};

export const createTempCajero = async (apiContext, adminToken, idSucursal) => {
  const usuarioLogin = buildTempUser('e2e_cajero');
  const clave = 'E2e#1234A';

  const createPath = '/api/Usuarios';
  const createResponse = await apiContext.post(createPath, {
    headers: authHeaders(adminToken),
    data: {
      nombre: 'E2E Cajero Temporal',
      usuarioLogin,
      clave,
      rol: 'CAJERO',
      id_Sucursal: idSucursal,
      activo: true
    }
  });
  expect(createResponse.ok(), `No se pudo crear cajero temporal. Status=${createResponse.status()}`).toBeTruthy();
  const created = await createResponse.json();
  const idUsuario = Number(created?.data?.id_Usuario);

  const login = await loginApi(apiContext, usuarioLogin, clave);
  expect(login.ok, `No se pudo iniciar sesion con cajero temporal. Status=${login.status}`).toBeTruthy();

  return {
    idUsuario,
    usuarioLogin,
    clave,
    token: login.token
  };
};

export const inactivateUser = async (apiContext, adminToken, idUsuario) => {
  const maxAttempts = 3;
  let lastStatus = -1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await apiContext.delete(`/api/Usuarios/${idUsuario}`, {
      headers: authHeaders(adminToken),
      failOnStatusCode: false
    });
    lastStatus = response.status();
    if (lastStatus !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
  }

  expect([200, 404, 429]).toContain(lastStatus);
};

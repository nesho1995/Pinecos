# E2E Playwright Suite

## Objetivo
Esta suite valida flujo de sesion, proteccion de rutas y seguridad API con matriz de autorizacion en volumen.

## Comandos
- `npm run e2e` ejecuta toda la suite E2E.
- `npm run e2e:smoke` ejecuta validaciones rapidas (UI auth + matriz API).
- `npm run e2e:massive` ejecuta matriz API en alto volumen (`E2E_MATRIX_MULTIPLIER=30`).

## Variables opcionales
- `E2E_FRONTEND_URL` URL del frontend (default: `http://127.0.0.1:5173`).
- `E2E_API_URL` URL base del backend sin ruta final obligatoria (default: `http://127.0.0.1:5152`).
- `E2E_ADMIN_USER` usuario admin para pruebas (default: `admin`).
- `E2E_ADMIN_PASS` clave admin para pruebas (default: `1234`).
- `E2E_MATRIX_MULTIPLIER` factor de expansion de casos para la matriz.

## Cobertura de la matriz masiva
La matriz genera:
- `endpoints x modos de token x multiplicador`.
- Con la configuracion actual: `16 x 4 x 30 = 1920` combinaciones.

## Notas
- Si el backend responde `429` durante pruebas de estres, la suite lo considera respuesta valida de proteccion por rate-limit.
- El test de revocacion de sesion marca warning cuando el API activo aun no aplica revocacion inmediata tras inactivar usuario (normalmente se corrige reiniciando API con el build mas reciente).

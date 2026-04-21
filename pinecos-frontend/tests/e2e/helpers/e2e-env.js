export const E2E_ENV = {
  frontendBaseUrl: process.env.E2E_FRONTEND_URL || 'http://127.0.0.1:4176',
  apiBaseUrl: process.env.E2E_API_URL || 'http://127.0.0.1:5152',
  adminUser: process.env.E2E_ADMIN_USER || 'admin',
  adminPass: process.env.E2E_ADMIN_PASS || '',
  matrixMultiplier: Number(process.env.E2E_MATRIX_MULTIPLIER || 2)
};

export const buildTempUser = (prefix = 'e2e_tmp') =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

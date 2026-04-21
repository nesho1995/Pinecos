import { defineConfig, devices } from '@playwright/test';

const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_URL || 'http://127.0.0.1:4176';
const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:5152/api';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: FRONTEND_BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  metadata: {
    frontendBaseUrl: FRONTEND_BASE_URL,
    apiBaseUrl: API_BASE_URL
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4176',
    url: FRONTEND_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ]
});

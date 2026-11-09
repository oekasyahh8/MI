import { defineConfig } from '@playwright/test';

const apiUrl = 'http://127.0.0.1:4010';
const webUrl = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: webUrl,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/start-e2e-api.mjs',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:web -- --host 127.0.0.1 --port 5174',
      url: webUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PROXY_TARGET: apiUrl },
    },
  ],
});

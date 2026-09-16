import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure',
    // Optional local installed browser; CI uses Playwright's pinned Chromium.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `"${process.env.E2E_PYTHON || (process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : 'python')}" e2e_server.py`,
      cwd: '../backend', url: 'http://127.0.0.1:18080/api/health/live/',
      reuseExistingServer: false, timeout: 120_000,
    },
    { command: 'npm run dev -- --config vite.e2e.config.ts', url: 'http://127.0.0.1:3100', reuseExistingServer: false, env: { VITE_API_BASE: '' } },
  ],
});

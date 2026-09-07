import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', timeout: 30_000, fullyParallel: true, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4318', trace: 'on-first-retry' },
  webServer: { command: 'python -m backend.server --port 4318 --db test-results/browser-state.sqlite3', url: 'http://127.0.0.1:4318/api/health', reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

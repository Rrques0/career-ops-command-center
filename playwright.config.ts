import { defineConfig, devices } from '@playwright/test';

const testDatabase = process.env.CAREER_OPS_TEST_DB ?? 'test-results/browser-state.sqlite3';

export default defineConfig({
  testDir: './tests', timeout: 30_000, fullyParallel: true, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4318', trace: 'on-first-retry' },
  webServer: { command: `python -m backend.server --port 4318 --db "${testDatabase}"`, url: 'http://127.0.0.1:4318/api/health', reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

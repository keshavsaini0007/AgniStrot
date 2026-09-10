import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke suite hitting the REAL backend (no mocks).
 *
 * The `webServer` entry boots the orchestrator (`scripts/e2e-server.mjs`),
 * which starts the backend, runs the idempotent seed to restore canonical
 * data, then launches the Vite dev server in real-API mode on :3000.
 *
 * Run with: npm run test:e2e          (first: npm run test:e2e:install)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 150_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
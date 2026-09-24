import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke suite hitting the REAL backend (no mocks).
 *
 * The `webServer` entry boots the orchestrator (`scripts/e2e-server.mjs`),
 * which starts the backend, runs the idempotent seed to restore canonical
 * data, then launches the Vite dev server in real-API mode on :3000.
 *
 * The `expo-web` project targets the Expo web build of the mobile app on
 * :8081. Expo is booted MANUALLY (never spawned by Playwright — see the
 * official gate run in the roadmap): `cd App-frontend && npm run verify:app`
 * then `CI=1 npx expo start --web --port 8081`. Mobile specs also need the
 * same backend+seed stack on :5000 (the web `webServer` reuse covers it when
 * the chromium suite runs; for a mobile-only run, boot e2e-server.mjs first).
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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile-.*\.spec\.ts$/,
    },
    {
      name: 'expo-web',
      testMatch: /mobile-.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:8081' },
    },
  ],
});
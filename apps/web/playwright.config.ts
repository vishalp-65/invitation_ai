import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests. Uses the Chrome already installed on the machine (no browser download).
 * Point E2E_BASE_URL at a running web app (default: the local dev server on :3000).
 *
 * Optional, for the deeper flows:
 *   E2E_INVITE_SLUG   a published invitation's slug (guest view + RSVP form)
 *   E2E_STORAGE_STATE a saved signed-in session (npx playwright codegen --save-storage=...)
 *   E2E_EVENT_ID      an invitation owned by that session (host dashboard flows)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'unit', testMatch: /.*\.unit\.spec\.ts/ },
    { name: 'phone', testIgnore: /.*\.unit\.spec\.ts/, use: { ...devices['Pixel 7'], channel: process.env.E2E_CHANNEL ?? 'chrome' } },
  ],
});

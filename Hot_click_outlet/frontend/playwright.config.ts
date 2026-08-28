import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const isLocal = /127\.0\.0\.1|localhost/.test(BASE_URL)
const puertoLocal = (() => {
  try {
    return new URL(BASE_URL).port || '80'
  } catch {
    return '3000'
  }
})()

/**
 * Smoke local contra Vite (:3000). Si PLAYWRIGHT_BASE_URL es remoto, no arranca Vite.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: !isLocal,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isLocal
    ? {
        command: `node node_modules/vite/bin/vite.js --port ${puertoLocal} --host 127.0.0.1`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
})

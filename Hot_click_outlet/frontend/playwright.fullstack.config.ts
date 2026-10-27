import { defineConfig, devices } from '@playwright/test'

/**
 * E2E full-stack: Postgres + backend (perfil dev) + Vite. Sin mocks de red para el API propio.
 * Lo arranca .github/workflows/e2e.yml; en local, ver tests/fullstack/README.md.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const puerto = new URL(BASE_URL).port || '3000'

export default defineConfig({
  testDir: './tests/fullstack',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-fullstack' }], ['junit', { outputFile: 'test-results-fullstack/junit.xml' }]],
  outputDir: 'test-results-fullstack',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${puerto} --host 127.0.0.1 --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

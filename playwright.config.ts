import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4180',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx serve . -p 4180',
    url: 'http://localhost:4180',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})

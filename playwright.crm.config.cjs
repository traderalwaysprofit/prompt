const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.CRM_BASE_URL || 'http://127.0.0.1:4174';

module.exports = defineConfig({
  testDir: './tests/crm-e2e',
  outputDir: './test-results/masumi-crm',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report/masumi-crm' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block'
  },
  projects: [
    { name: 'crm-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'crm-mobile', use: { ...devices['Pixel 5'] } }
  ]
});

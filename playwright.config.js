const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PROD_URL || 'https://samson.web.id',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
});

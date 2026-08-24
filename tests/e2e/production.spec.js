const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('samson.web.id production', () => {
  test('loads the production app and command data', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('body')).toContainText(/Peta Perintah|193/);
    await expect(page.locator('body')).toContainText('193');

    const response = await page.request.get(`${BASE_URL}/data/commands.json`);
    expect(response.ok()).toBeTruthy();
    const commands = await response.json();
    expect(commands).toHaveLength(193);
    expect(new Set(commands.map(c => String(c.id))).size).toBe(193);

    const categoriesResponse = await page.request.get(`${BASE_URL}/data/categories.json`);
    expect(categoriesResponse.ok()).toBeTruthy();
    const categories = await categoriesResponse.json();
    expect(categories).toHaveLength(20);

    expect(errors).toEqual([]);
  });

  test('search filters commands', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const search = page.locator('input[placeholder*="Cari dari 193"]');
    await expect(search).toBeVisible();
    await search.fill('/xauanalysis');
    await expect(page.locator('body')).toContainText('/xauanalysis');
    await expect(page.locator('body')).not.toContainText('/handwritten');
  });

  test('category filtering works', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const category = page.getByRole('button', { name: /Trading Forex & XAU/i });
    await expect(category).toBeVisible();
    await category.click();
    await expect(page.locator('body')).toContainText('/xauanalysis');
    await expect(page.locator('body')).toContainText('/fxanalysis');
  });

  test('command detail modal opens and closes', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByText('/xauanalysis', { exact: true }).click();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('textarea')).toContainText('/xauanalysis');
    await page.getByRole('button', { name: /salin prompt & tutup/i }).click();
  });

  test('list and grid views are interactive', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByTitle('Tampilan Grid').click();
    await expect(page.getByTitle('Tampilan Grid')).toBeVisible();
    await page.getByTitle('Tampilan List').click();
    await expect(page.getByTitle('Tampilan List')).toBeVisible();
  });
});

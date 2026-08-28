import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('SAMSON adaptive UI system', () => {
  test('offers three UI personalities and persists the selected theme', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('#theme-select')).toHaveCount(1);
    await expect(page.locator('#mobile-theme-select')).toHaveCount(1);
    await expect(page.locator('#theme-select option')).toHaveCount(3);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');

    await page.evaluate(() => window.SamsonTheme.set('developer'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'developer');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(13, 17, 23)');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'developer');
    await expect(page.locator('#theme-select')).toHaveValue('developer');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('developer');

    await page.evaluate(() => window.SamsonTheme.set('swiss'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'swiss');
    await expect(page.locator('#theme-select')).toHaveValue('swiss');
  });

  test('theme mutation preserves prompt search behavior', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('developer'));

    const search = page.locator('#search');
    await search.fill('/xauanalysis');
    await expect(page.locator('.nft-card')).toHaveCount(1);
    await expect(page.locator('.nft-card code')).toHaveText('/xauanalysis');
  });

  test('anti-slop quality gate passes against runtime UI truth', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => window.SamsonAntiSlop.audit());

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.status).toBe('PASS');
    expect(result.rules.find((item) => item.id === 'runtime-truth')?.pass).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('data-anti-slop-status', 'pass');
  });
});

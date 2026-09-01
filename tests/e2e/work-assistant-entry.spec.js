import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('SAMSON Work Assistant visible entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('samsonOnboardingCompleted', 'true'));
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test('workflow card visibly exposes Work Assistant before entering the catalog', async ({ page }) => {
    const entry = page.locator('[data-direct-work-assistant]');
    await expect(entry).toBeVisible();
    await expect(entry).toHaveText(/Buka Work Assistant/);
    await expect(page.locator('.workflow-assistant-entry-copy')).toContainText('WhatsApp');
    await expect(page.locator('.workflow-assistant-entry-copy')).toContainText('Website');
  });

  test('visible Work Assistant entry opens seven work menus directly', async ({ page }) => {
    await page.locator('[data-direct-work-assistant]').click();
    await expect(page).toHaveURL(/#work-assistant$/);
    await expect(page.locator('#workflow-catalog')).toBeVisible();
    await expect(page.locator('#work-assistant')).toBeVisible();
    await expect(page.locator('[data-work-assistant-card]')).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'Pilih masalah pekerjaan yang ingin diselesaikan' })).toBeVisible();
  });

  test('mobile keeps the visible entry usable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const entry = page.locator('[data-direct-work-assistant]');
    await expect(entry).toBeVisible();
    const height = await entry.evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('SAMSON compact primary navigation', () => {
  test('desktop exposes only Workflows, Prompts, and More as primary choices', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const nav = page.locator('.site-header nav');
    await expect(nav.locator('#nav-cheatcodes')).toHaveText('Workflows');
    await expect(nav.locator('#nav-recent')).toHaveText('Prompts');
    await expect(nav.locator('#nav-more')).toHaveText(/More/);
    await expect(nav.locator('#nav-categories')).toHaveCount(0);
    await expect(nav.locator('#nav-favorites')).not.toBeVisible();
    await expect(nav.locator('#nav-onboarding')).not.toBeVisible();

    await nav.locator('#nav-more').click();
    await expect(nav.locator('#nav-more-menu')).toHaveClass(/is-open/);
    await expect(nav.locator('#nav-tools')).toHaveText('Tools');
    await expect(nav.locator('#nav-tools')).toBeVisible();
    await expect(nav.locator('#nav-favorites')).toHaveText('Saved');
    await expect(nav.locator('#nav-favorites')).toBeVisible();
    await expect(nav.locator('#nav-onboarding')).toHaveText('Cara Menggunakan SAMSON');
    await expect(nav.locator('#nav-onboarding')).toBeVisible();
    await expect(nav.locator('#theme-select')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(nav.locator('#nav-more')).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile groups work, saved state, help, and appearance without Categories', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.locator('#mobile-menu-toggle').click();
    const panel = page.locator('#mobile-menu-panel');
    await expect(panel).toHaveClass(/is-open/);
    await expect(panel.getByRole('button', { name: 'Workflows', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Prompts', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Tools', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Cara Menggunakan SAMSON', exact: true })).toBeVisible();
    await expect(panel.getByText('Categories', { exact: true })).toHaveCount(0);
    await expect(panel.locator('#mobile-theme-select')).toBeVisible();

    const controls = await panel.locator('button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    expect(controls.every((height) => height >= 44)).toBeTruthy();

    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  });

  test('utility navigation survives all four UI personalities', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    for (const theme of ['default', 'developer', 'swiss', 'pixel']) {
      await page.evaluate((id) => window.SamsonTheme.set(id), theme);
      await page.locator('#nav-more').click();
      await expect(page.locator('#nav-more-menu')).toBeVisible();
      await expect(page.locator('#theme-select')).toHaveValue(theme);
      await page.keyboard.press('Escape');
    }
  });
});

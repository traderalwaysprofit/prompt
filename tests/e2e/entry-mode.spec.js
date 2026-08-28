import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const returnToChooser = async (page) => {
  if ((page.viewportSize()?.width || 1280) <= 700) {
    await page.locator('#mobile-menu-toggle').click();
    await expect(page.locator('#mobile-menu-panel')).toHaveClass(/is-open/);
    await page.locator('[data-mobile-nav="cheatcodes"]').click();
  } else {
    await page.locator('#nav-cheatcodes').click();
  }
};

test.describe('SAMSON entry choice', () => {
  test('hides Prompt Library until the user chooses it', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'chooser');
    await expect(page.locator('#featured')).toBeHidden();
    await expect(page.locator('#workflow-catalog')).toBeHidden();

    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'prompts');
    await expect(page.locator('#featured')).toBeVisible();
    await expect(page.locator('#workflow-catalog')).toBeHidden();
  });

  test('shows workflows without exposing Prompt Library', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: /Lihat \d+ Workflow/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'workflows');
    await expect(page.locator('#workflow-catalog')).toBeVisible();
    await expect(page.locator('#featured')).toBeHidden();

    await returnToChooser(page);
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'chooser');
    await expect(page.locator('#workflow-catalog')).toBeHidden();
    await expect(page.locator('#featured')).toBeHidden();
  });
});

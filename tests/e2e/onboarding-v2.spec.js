import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';
const COMPLETE_KEY = 'samsonOnboardingCompleted';

const resetFirstRun = async (page) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate((key) => localStorage.removeItem(key), COMPLETE_KEY);
  await page.reload({ waitUntil: 'networkidle' });
};

const openOnboardingFromMenu = async (page) => {
  if ((page.viewportSize()?.width || 1280) <= 700) {
    await page.locator('#mobile-menu-toggle').click();
    await page.getByRole('button', { name: 'Cara Menggunakan SAMSON', exact: true }).click();
    return;
  }
  await page.locator('#nav-more').click();
  await page.locator('#nav-onboarding').click();
};

test.describe('SAMSON onboarding v2', () => {
  test('first visit explains SAMSON once and persists dismissal', async ({ page }) => {
    await resetFirstRun(page);

    const modal = page.locator('#ai-onboarding-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Cara Menggunakan SAMSON' })).toBeVisible();
    await expect(modal.locator('.onboarding-step')).toHaveCount(3);
    await expect(modal.getByText('WORKFLOWS', { exact: true })).toBeVisible();
    await expect(modal.getByText('PROMPTS', { exact: true })).toBeVisible();
    for (const model of ['ChatGPT', 'Gemini', 'Claude', 'Other AI']) {
      await expect(modal.getByText(model, { exact: true })).toBeVisible();
    }

    await modal.getByRole('button', { name: 'Lewati onboarding' }).click();
    await expect(modal).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), COMPLETE_KEY)).toBe('true');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await expect(page.locator('#ai-onboarding-modal')).toHaveCount(0);
  });

  test('workflow and prompt CTAs route into the existing product paths', async ({ page }) => {
    await resetFirstRun(page);

    let modal = page.locator('#ai-onboarding-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Mulai dengan Workflow' }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'workflows');
    await expect(page.locator('#workflow-catalog')).toBeVisible();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await openOnboardingFromMenu(page);
    modal = page.locator('#ai-onboarding-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Cari Prompt' }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'prompts');
    await expect(page.locator('#featured')).toBeVisible();
    await expect(page).toHaveURL(/#prompts$/);
  });

  test('manual help remains available after onboarding is completed', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await openOnboardingFromMenu(page);

    const modal = page.locator('#ai-onboarding-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('data-source', 'manual');
    await expect(modal.getByText('More → Appearance', { exact: false })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });

  test('compact mobile onboarding keeps accessible touch targets and no page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await openOnboardingFromMenu(page);

    const modal = page.locator('#ai-onboarding-modal');
    await expect(modal).toBeVisible();
    const actionHeights = await modal.locator('.onboarding-action, .onboarding-skip').evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().height)
    );
    expect(actionHeights.every((height) => height >= 44)).toBeTruthy();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth
    }));
    expect(dimensions.htmlScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.bodyScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});

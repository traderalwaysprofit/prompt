import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('samson.web.id current frontend', () => {
  test('loads the app, favicon, and complete runtime data', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('.site-header')).toContainText('SAMSON PROMPT Library');
    await expect(page.locator('.nft-card')).toHaveCount(20);
    await expect(page.locator('.results-count')).toContainText('OF 200 COMMANDS');

    const responses = await Promise.all([
      page.request.get(BASE_URL + '/data/commands.json'),
      page.request.get(BASE_URL + '/data/commands-extra.json'),
      page.request.get(BASE_URL + '/data/categories.json'),
      page.request.get(BASE_URL + '/data/examples.json'),
      page.request.get(BASE_URL + '/data/examples-extra.json'),
      page.request.get(BASE_URL + '/favicon.svg')
    ]);
    for (const response of responses) expect(response.ok()).toBeTruthy();

    const commands = [...await responses[0].json(), ...await responses[1].json()];
    const categories = await responses[2].json();
    const examples = [...await responses[3].json(), ...await responses[4].json()];

    expect(commands).toHaveLength(200);
    expect(categories).toHaveLength(20);
    expect(examples).toHaveLength(200);
    expect(new Set(commands.map((command) => command.id)).size).toBe(200);
    expect(commands.every((command) => command.name && command.categoryId && command.description && command.template)).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('search filters commands using the current search control', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const search = page.locator('#search');
    await expect(search).toHaveAttribute('placeholder', /poster, SEO, marketing, coding/i);
    await search.fill('/xauanalysis');
    await expect(page.locator('.nft-card')).toHaveCount(1);
    await expect(page.locator('.nft-card code')).toHaveText('/xauanalysis');
  });

  test('category select filters the command grid', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.locator('#category-filter').selectOption('trading');
    await expect(page.locator('.nft-card code', { hasText: '/xauanalysis' })).toBeVisible();
    await expect(page.locator('.nft-card code', { hasText: '/fxanalysis' })).toBeVisible();
  });

  test('command detail modal opens and closes', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.locator('.nft-card code', { hasText: '/xauanalysis' }).click();
    await expect(page.locator('.modal[role="dialog"]')).toBeVisible();
    await expect(page.locator('.modal h2')).toHaveText('/xauanalysis');
    await expect(page.locator('[data-copy-template]')).toBeVisible();
    await page.locator('.modal .close').click();
    await expect(page.locator('.modal[role="dialog"]')).toHaveCount(0);
  });

  test('navigation has one onboarding source on desktop and mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('#nav-onboarding')).toHaveCount(1);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(1);
    await expect(page.locator('#mobile-menu-panel')).toHaveCount(1);

    if ((page.viewportSize()?.width || 1280) <= 700) {
      await page.locator('#mobile-menu-toggle').click();
      await expect(page.locator('#mobile-menu-panel')).toHaveClass(/is-open/);
      await page.locator('[data-mobile-nav="onboarding"]').click();
    } else {
      await page.locator('#nav-onboarding').click();
    }

    await expect(page.locator('#ai-onboarding-modal')).toHaveCount(1);
    await expect(page.locator('#ai-onboarding-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Tutup onboarding' }).click();
    await expect(page.locator('#ai-onboarding-modal')).toHaveCount(0);
  });

  test('favorites remain functional', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.locator('[data-favorite]').first().click();
    await page.locator('#nav-favorites').click({ force: true });
    await expect(page.locator('.results-count')).toContainText('1 SAVED PROMPTS');
  });
});

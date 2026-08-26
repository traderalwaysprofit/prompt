import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('samson.web.id current frontend', () => {
  test('loads the app, favicon, and complete runtime data', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('.site-header')).toContainText('SAMSON PROMPT Library');
    await expect(page.locator('label[for="search"]')).toHaveClass(/sr-only/);
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

  test('core secondary text and compact controls meet accessibility targets', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const description = page.locator('.nft-info p').first();
    const category = page.locator('.nft-art small').first();
    const favorite = page.locator('.favorite-btn').first();

    await expect(description).toHaveCSS('color', 'rgb(89, 89, 89)');
    await expect(category).toHaveCSS('font-size', '12px');

    const hitArea = await favorite.evaluate((element) => {
      const pseudo = getComputedStyle(element, '::after');
      return { width: pseudo.width, height: pseudo.height };
    });
    expect(hitArea).toEqual({ width: '44px', height: '44px' });
  });

  test('prompt cards keep a proportional, consistent responsive layout', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const layout = await page.locator('.nft-grid').evaluate((grid) => {
      const cards = [...grid.querySelectorAll('.nft-card')];
      const gridStyle = getComputedStyle(grid);
      const boxes = cards.slice(0, 4).map((card) => card.getBoundingClientRect());
      return {
        columns: gridStyle.gridTemplateColumns.split(' ').length,
        heights: boxes.map((box) => Math.round(box.height)),
        firstRatio: boxes[0].width / boxes[0].height
      };
    });

    const viewportWidth = page.viewportSize()?.width || 1280;
    expect(layout.columns).toBe(viewportWidth <= 520 ? 1 : viewportWidth <= 760 ? 2 : viewportWidth <= 1080 ? 3 : 4);
    expect(new Set(layout.heights).size).toBe(1);
    expect(layout.firstRatio).toBeGreaterThan(viewportWidth <= 520 ? 1.7 : 1.35);
    expect(layout.firstRatio).toBeLessThan(viewportWidth <= 520 ? 2.8 : 1.55);
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
    await page.locator('#search').fill('/xauanalysis');
    await page.locator('.nft-card').click();
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
    if ((page.viewportSize()?.width || 1280) <= 700) {
      await page.locator('#mobile-menu-toggle').click();
      await page.locator('[data-mobile-nav="favorites"]').click();
    } else {
      await page.locator('#nav-favorites').click();
    }
    await expect(page.locator('.results-count')).toContainText('1 SAVED PROMPTS');
  });
});

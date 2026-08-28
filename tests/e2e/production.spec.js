import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('samson.web.id current frontend', () => {
  test('loads the app, favicon, and complete runtime data', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('.site-header')).toContainText('SAMSON');
    await expect(page).toHaveTitle(/AI Cheatcodes for Real Work/);
    await expect(page.locator('label[for="search"]')).toHaveClass(/sr-only/);
    await expect(page.locator('.nft-card')).toHaveCount(20);

    const responses = await Promise.all([
      page.request.get(BASE_URL + '/data/commands.json'),
      page.request.get(BASE_URL + '/data/commands-extra.json'),
      page.request.get(BASE_URL + '/data/categories.json'),
      page.request.get(BASE_URL + '/data/examples.json'),
      page.request.get(BASE_URL + '/data/examples-extra.json'),
      page.request.get(BASE_URL + '/data/cheatcodes.json'),
      page.request.get(BASE_URL + '/favicon.svg')
    ]);
    for (const response of responses) expect(response.ok()).toBeTruthy();

    const commands = [...await responses[0].json(), ...await responses[1].json()];
    const categories = await responses[2].json();
    const examples = [...await responses[3].json(), ...await responses[4].json()];
    const cheatcodes = await responses[5].json();

    expect(commands.length).toBeGreaterThanOrEqual(197);
    expect(categories.length).toBeGreaterThanOrEqual(19);
    expect(examples).toHaveLength(commands.length);
    expect(cheatcodes).toHaveLength(6);
    expect(cheatcodes[0].id).toBe('build-website');
    expect(cheatcodes[0].steps).toHaveLength(8);
    expect(new Set(commands.map((command) => command.id)).size).toBe(commands.length);
    expect(new Set(examples.map((example) => example.id))).toEqual(new Set(commands.map((command) => command.id)));
    await expect(page.locator('.results-count')).toContainText(`OF ${commands.length} COMMANDS`);
    await expect(page.locator('[data-catalog-stat="prompts"]')).toHaveText(String(commands.length));
    await expect(page.locator('[data-catalog-stat="categories"]')).toHaveText(String(categories.length));
    await expect(page.locator('[data-runtime-command-count]')).toHaveText(String(commands.length));
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
      const firstCard = cards[0];
      const cardBox = firstCard.getBoundingClientRect();
      const favorite = firstCard.querySelector('.favorite-btn');
      const open = firstCard.querySelector('.open-btn');
      const category = firstCard.querySelector('.nft-art small');
      const favoriteBox = favorite.getBoundingClientRect();
      const openBox = open.getBoundingClientRect();
      const categoryBox = category.getBoundingClientRect();
      return {
        columns: gridStyle.gridTemplateColumns.split(' ').length,
        heights: boxes.map((box) => Math.round(box.height)),
        firstRatio: boxes[0].width / boxes[0].height,
        controls: {
          favoritePosition: getComputedStyle(favorite).position,
          openPosition: getComputedStyle(open).position,
          favoriteInsideRight: favoriteBox.right <= cardBox.right + 1 && favoriteBox.left >= cardBox.left,
          openInsideRight: openBox.right <= cardBox.right + 1 && openBox.left >= cardBox.left,
          categoryClearsOpen: categoryBox.right <= openBox.left
        }
      };
    });

    const viewportWidth = page.viewportSize()?.width || 1280;
    expect(layout.columns).toBe(viewportWidth <= 520 ? 1 : viewportWidth <= 760 ? 2 : viewportWidth <= 1080 ? 3 : 4);
    expect(new Set(layout.heights).size).toBe(1);
    expect(layout.firstRatio).toBeGreaterThan(viewportWidth <= 520 ? 1.7 : 1.35);
    expect(layout.firstRatio).toBeLessThan(viewportWidth <= 520 ? 2.8 : 1.55);
    expect(layout.controls).toEqual({
      favoritePosition: 'absolute',
      openPosition: 'absolute',
      favoriteInsideRight: true,
      openInsideRight: true,
      categoryClearsOpen: true
    });
  });

  test('pagination exposes page numbers, smart ellipsis, and accessible controls', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const commands = [
      ...await (await page.request.get(BASE_URL + '/data/commands.json')).json(),
      ...await (await page.request.get(BASE_URL + '/data/commands-extra.json')).json()
    ];

    const pagination = page.locator('nav.pagination[role="navigation"][aria-label="Pagination"]');
    await expect(pagination).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Go to page 1', exact: true })).toHaveAttribute('aria-current', 'page');

    const activeAnimation = await page.getByRole('button', { name: 'Go to page 1', exact: true }).evaluate((element) =>
      getComputedStyle(element, '::before').animationName
    );
    expect(activeAnimation).toBe('none');

    const next = page.getByRole('button', { name: 'Go to next page' });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.results-count')).toContainText(`SHOWING 21-40 OF ${commands.length} COMMANDS`);

    await page.getByRole('button', { name: 'Go to page 4' }).click();
    await page.getByRole('button', { name: 'Go to page 5' }).click();
    await expect(page.getByRole('button', { name: 'Go to page 5' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.pagination-ellipsis')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Go to next page' })).toBeEnabled();
  });

  test('search filters commands using the current search control', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const search = page.locator('#search');
    await expect(search).toHaveAttribute('placeholder', /poster, SEO, marketing, coding/i);
    await search.fill('/xauanalysis');
    await expect(page.locator('.nft-card')).toHaveCount(1);
    await expect(page.locator('.nft-card code')).toHaveText('/xauanalysis');
  });

  test('homepage positions Cheatcodes first while preserving Prompt Library', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Bagaimana Anda ingin bekerja?' })).toBeVisible();
    await expect(page.locator('.choice-card')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Pilih pekerjaan yang ingin diselesaikan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Temukan satu prompt spesifik' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lihat 6 Workflow/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Buka Prompt Library/ })).toBeVisible();
    await expect(page.locator('#nav-cheatcodes')).toHaveText('Cheatcodes');
    await expect(page.locator('#nav-recent')).toHaveText('Prompt Library');
    await expect(page.locator('#nav-categories')).toHaveText('Categories');
  });

  test('Build Website runs as an eight-step workflow with local progress', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Lihat 6 Workflow/ }).click();
    await expect(page.locator('.workflow-catalog-card')).toHaveCount(6);
    const websiteCard = page.locator('.workflow-catalog-card').filter({ hasText: 'Build a Website' });
    await websiteCard.getByRole('button', { name: 'Mulai Build a Website' }).click();

    const detail = page.locator('#cheatcode-detail');
    await expect(detail).toBeVisible();
    await expect(detail.getByRole('heading', { name: 'Build a Website' })).toBeVisible();
    await expect(detail.locator('.workflow-step-tab')).toHaveCount(8);
    await expect(detail.locator('.workflow-content')).toContainText('Define the Idea');
    await expect(detail.getByRole('button', { name: 'Copy prompt /businessmodel' })).toBeVisible();

    await detail.getByRole('button', { name: 'Complete & Next' }).click();
    await expect(detail.locator('.workflow-content')).toContainText('Research the Audience');
    await expect(detail.locator('.workflow-progress-label')).toContainText('1/8');
    await expect(page).toHaveURL(/#cheatcodes\/build-website\/step-2$/);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#cheatcode-detail .workflow-content')).toContainText('Research the Audience');
    await expect(page.locator('#cheatcode-detail .workflow-progress-label')).toContainText('1/8');
  });

  test('users can choose from six outcome-based workflows', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Lihat 6 Workflow/ }).click();
    const catalog = page.locator('#workflow-catalog');
    await expect(catalog).toBeVisible();
    await expect(catalog.locator('.workflow-catalog-card')).toHaveCount(6);
    for (const title of ['Build a SaaS', 'Launch a Marketing Campaign', 'Create SEO Content', 'Run a Research Project', 'Automate a Task']) {
      await expect(catalog).toContainText(title);
    }
    const marketingCard = catalog.locator('.workflow-catalog-card').filter({ hasText: 'Launch a Marketing Campaign' });
    await marketingCard.getByRole('button', { name: 'Mulai Launch a Marketing Campaign' }).click();
    await expect(page).toHaveURL(/#cheatcodes\/marketing-campaign\/step-1$/);
    await expect(page.locator('#cheatcode-detail .workflow-step-tab')).toHaveCount(8);
    await expect(page.locator('#cheatcode-detail')).toContainText('Segment the Audience');
    await expect(page.getByRole('button', { name: 'Copy prompt /segmentation' })).toBeVisible();
  });

  test('Prompt Library choice routes users to the searchable library', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const promptCount = (await (await page.request.get(BASE_URL + '/data/commands.json')).json()).length
      + (await (await page.request.get(BASE_URL + '/data/commands-extra.json')).json()).length;
    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
    await expect(page).toHaveURL(/#prompts$/);
    await expect(page.locator('#search')).toBeVisible();
    await expect(page.locator('#category-filter')).toBeVisible();
    await expect(page.locator('.results-count')).toContainText(`OF ${promptCount} COMMANDS`);
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

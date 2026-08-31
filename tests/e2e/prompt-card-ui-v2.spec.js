import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const openPromptLibrary = async (page) => {
  await page.addInitScript(() => localStorage.setItem('samsonOnboardingCompleted', 'true'));
  await page.goto(`${BASE_URL}/#prompts`, { waitUntil: 'networkidle' });
  await expect(page.locator('.nft-card').first()).toBeVisible();
};

const findPrompt = async (page, query) => {
  const search = page.locator('#search');
  await search.fill(query);
  const card = page.locator('.nft-card').first();
  await expect(card).toBeVisible();
  return card;
};

test.describe('SAMSON prompt card UI V2', () => {
  test('cards hide internal ids and SP prefix while keeping category action', async ({ page }) => {
    await openPromptLibrary(page);

    const cardTexts = await page.locator('.nft-card').allInnerTexts();
    expect(cardTexts.length).toBeGreaterThan(0);
    expect(cardTexts.every((text) => !/#\d{1,3}/.test(text))).toBeTruthy();
    expect(cardTexts.every((text) => !text.includes('SP //'))).toBeTruthy();

    const firstCard = page.locator('.nft-card').first();
    await expect(firstCard.locator('.prompt-domain')).toBeVisible();
    await expect(firstCard.locator('.open-btn')).toBeVisible();
    await expect(firstCard.locator('.open-btn .svg-icon')).toBeVisible();
  });

  test('WordPress prompts use WORDPRESS domain while category remains Coding & Teknis', async ({ page }) => {
    await openPromptLibrary(page);

    for (const query of ['/wordpress', '/woocommerce', '/wpaudit']) {
      const card = await findPrompt(page, query);
      await expect(card.locator('code')).toHaveText(query);
      await expect(card.locator('.prompt-domain')).toHaveText('WORDPRESS');
      await expect(card.locator('.open-btn')).toContainText('Coding & Teknis');
      await expect(card).not.toContainText(/#20[3-5]/);
      await expect(card).not.toContainText('SP //');
    }
  });

  test('prompts without displayTag fall back to uppercase category name', async ({ page }) => {
    await openPromptLibrary(page);

    const card = await findPrompt(page, '/vibecode');
    await expect(card.locator('code')).toHaveText('/vibecode');
    await expect(card.locator('.prompt-domain')).toHaveText('CODING & TEKNIS');
    await expect(card.locator('.open-btn')).toContainText('Coding & Teknis');
  });

  test('favorite and open actions remain functional', async ({ page }) => {
    await openPromptLibrary(page);

    const card = await findPrompt(page, '/wpaudit');
    const favorite = card.locator('[data-favorite="205"]');
    await favorite.click();
    await expect(favorite).toHaveClass(/is-favorite/);

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('samsonFavorites') || '[]'));
    expect(stored.map(Number)).toContain(205);

    await card.locator('.open-btn').click();
    await expect(page.locator('.modal[role="dialog"]')).toBeVisible();
    await expect(page.locator('.modal h2')).toHaveText('/wpaudit');
  });

  test('filter and pagination remain available after the card renderer change', async ({ page }) => {
    await openPromptLibrary(page);

    await expect(page.locator('.pagination')).toBeVisible();
    await page.locator('#category-filter').selectOption('coding');
    await expect(page.locator('.nft-card').first()).toBeVisible();
    await expect(page.locator('.nft-card').first().locator('.prompt-domain')).toBeVisible();
  });

  test('card hierarchy survives all four UI personalities', async ({ page }) => {
    await openPromptLibrary(page);
    await page.locator('#search').fill('/wpaudit');

    for (const theme of ['default', 'developer', 'swiss', 'pixel']) {
      await page.evaluate((id) => window.SamsonTheme.set(id), theme);
      const card = page.locator('.nft-card').first();
      await expect(card.locator('.prompt-domain')).toHaveText('WORDPRESS');
      await expect(card.locator('code')).toHaveText('/wpaudit');
      await expect(card.locator('.open-btn')).toContainText('Coding & Teknis');
      await expect(card).not.toContainText('#205');
    }
  });

  test('mobile card has no horizontal overflow and keeps the action target usable', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openPromptLibrary(page);

    const card = await findPrompt(page, '/wpaudit');
    await expect(card.locator('.prompt-domain')).toHaveText('WORDPRESS');

    const actionHeight = await card.locator('.open-btn').evaluate((element) => element.getBoundingClientRect().height);
    expect(actionHeight).toBeGreaterThanOrEqual(44);

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});

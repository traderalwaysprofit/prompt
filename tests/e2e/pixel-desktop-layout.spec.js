import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const openPixelPromptLibrary = async (page, viewport) => {
  await page.setViewportSize(viewport);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.SamsonTheme.set('pixel'));
  await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
  await expect(page.locator('#featured')).toBeVisible();
  await expect(page.locator('.nft-grid').first()).toBeVisible();
  await expect(page.locator('.nft-grid').first().locator('.nft-card').first()).toBeVisible();
};

const box = async (locator) => {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value;
};

test.describe('Pixel desktop prompt-card proportions', () => {
  test('1080px desktop uses three balanced columns with collision-free footers', async ({ page }) => {
    await openPixelPromptLibrary(page, { width: 1080, height: 900 });

    const grid = page.locator('.nft-grid').first();
    const cards = grid.locator('.nft-card');
    await expect(cards).toHaveCount(8);

    const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(3);

    const first = await box(cards.nth(0));
    const second = await box(cards.nth(1));
    const third = await box(cards.nth(2));
    const fourth = await box(cards.nth(3));

    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(first.y - third.y)).toBeLessThanOrEqual(2);
    expect(fourth.y).toBeGreaterThan(first.y + first.height * 0.7);

    const ratio = first.width / first.height;
    expect(ratio).toBeGreaterThan(1.55);
    expect(ratio).toBeLessThan(1.9);
    expect(first.width).toBeGreaterThan(270);

    const category = await box(cards.nth(0).locator('.nft-art small'));
    const action = await box(cards.nth(0).locator('.open-btn'));
    expect(category.x + category.width).toBeLessThanOrEqual(action.x - 4);

    const art = await box(cards.nth(0).locator('.nft-art'));
    const info = await box(cards.nth(0).locator('.nft-info'));
    expect(art.height).toBeGreaterThanOrEqual(57);
    expect(art.height).toBeLessThanOrEqual(59);
    expect(info.y).toBeGreaterThanOrEqual(art.y + art.height - 1);
  });

  test('1440px wide desktop promotes to four columns only with a wider shell', async ({ page }) => {
    await openPixelPromptLibrary(page, { width: 1440, height: 1000 });

    const grid = page.locator('.nft-grid').first();
    const cards = grid.locator('.nft-card');
    await expect(cards).toHaveCount(8);

    const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(4);

    const first = await box(cards.nth(0));
    const second = await box(cards.nth(1));
    const third = await box(cards.nth(2));
    const fourth = await box(cards.nth(3));

    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(first.y - third.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(first.y - fourth.y)).toBeLessThanOrEqual(2);
    expect(first.width).toBeGreaterThan(260);

    const ratio = first.width / first.height;
    expect(ratio).toBeGreaterThan(1.55);
    expect(ratio).toBeLessThan(1.9);

    const category = await box(cards.nth(0).locator('.nft-art small'));
    const action = await box(cards.nth(0).locator('.open-btn'));
    expect(category.x + category.width).toBeLessThanOrEqual(action.x - 4);
  });
});

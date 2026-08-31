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
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};

const snapshotGrid = async (page) => page.locator('.nft-grid').first().evaluate((grid) => {
  const rect = (element) => {
    const value = element.getBoundingClientRect();
    return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
  };

  const cards = [...grid.querySelectorAll('.nft-card')];
  const firstCard = cards[0];
  const firstFour = cards.slice(0, 4).map(rect);
  const domain = firstCard.querySelector('.prompt-domain');
  const action = firstCard.querySelector('.open-btn');
  const art = firstCard.querySelector('.nft-art');
  const info = firstCard.querySelector('.nft-info');

  return {
    count: cards.length,
    columns: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
    cards: firstFour,
    domain: rect(domain),
    action: rect(action),
    art: rect(art),
    info: rect(info),
    actionText: action.textContent.trim()
  };
});

test.describe('Pixel desktop prompt-card proportions', () => {
  test('1080px desktop uses three balanced columns with collision-free metadata', async ({ page }) => {
    await openPixelPromptLibrary(page, { width: 1080, height: 900 });
    const layout = await snapshotGrid(page);

    expect(layout.count).toBeGreaterThanOrEqual(4);
    expect(layout.columns).toBe(3);

    const [first, second, third, fourth] = layout.cards;
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(first.y - third.y)).toBeLessThanOrEqual(2);
    expect(fourth.y).toBeGreaterThan(first.y + first.height * 0.7);

    const ratio = first.width / first.height;
    expect(ratio).toBeGreaterThan(1.55);
    expect(ratio).toBeLessThan(1.9);
    expect(first.width).toBeGreaterThan(270);

    expect(layout.domain.x).toBeGreaterThanOrEqual(first.x);
    expect(layout.domain.right).toBeLessThanOrEqual(first.right);
    expect(layout.domain.bottom).toBeLessThanOrEqual(layout.art.bottom + 1);
    expect(layout.action.x).toBeGreaterThanOrEqual(first.x);
    expect(layout.action.right).toBeLessThanOrEqual(first.right + 1);
    expect(layout.action.width).toBeGreaterThan(first.width * 0.75);
    expect(layout.action.y).toBeGreaterThan(layout.art.bottom);
    expect(layout.actionText.length).toBeGreaterThan(0);
    expect(layout.art.height).toBeGreaterThanOrEqual(57);
    expect(layout.art.height).toBeLessThanOrEqual(59);
    expect(layout.info.y).toBeGreaterThanOrEqual(layout.art.bottom - 1);
  });

  test('1440px wide desktop promotes to four columns and keeps the category row visible', async ({ page }) => {
    await openPixelPromptLibrary(page, { width: 1440, height: 1000 });
    const layout = await snapshotGrid(page);

    expect(layout.count).toBeGreaterThanOrEqual(4);
    expect(layout.columns).toBe(4);

    const [first, second, third, fourth] = layout.cards;
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(first.y - third.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(first.y - fourth.y)).toBeLessThanOrEqual(2);
    expect(first.width).toBeGreaterThan(260);

    const ratio = first.width / first.height;
    expect(ratio).toBeGreaterThan(1.55);
    expect(ratio).toBeLessThan(1.9);
    expect(layout.domain.right).toBeLessThanOrEqual(first.right);
    expect(layout.action.width).toBeGreaterThan(first.width * 0.75);
    expect(layout.actionText.length).toBeGreaterThan(0);
  });
});
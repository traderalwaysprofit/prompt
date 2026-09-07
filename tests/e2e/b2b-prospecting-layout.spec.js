import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const mockHealth = async (page) => {
  await page.route('**/api/tools/b2b/health', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'ready', configured: false, provider: 'gemini', schemaVersion: 1 })
  }));
};

test.describe('B2B Prospecting responsive layout', () => {
  test('keeps the desktop hierarchy proportional and loads the revised stylesheet', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await mockHealth(page);
    await page.goto(`${BASE_URL}#tools/b2b-prospecting`, { waitUntil: 'networkidle' });

    const root = page.locator('#tools');
    await expect(root).toHaveAttribute('data-b2b-layout', 'wide');
    await expect(page.locator('#b2b-prospecting-style')).toHaveAttribute('href', '/src/tools/b2b-prospecting.css?v=2');

    const gridMetrics = await page.locator('.b2b-grid-search').first().evaluate((element) => {
      const columns = getComputedStyle(element).gridTemplateColumns
        .split(' ')
        .map((value) => Number.parseFloat(value));
      return { columns, width: element.getBoundingClientRect().width };
    });
    expect(gridMetrics.columns).toHaveLength(2);
    expect(gridMetrics.columns[0] / gridMetrics.columns[1]).toBeGreaterThan(0.7);
    expect(gridMetrics.columns[0] / gridMetrics.columns[1]).toBeLessThan(1);
    expect(gridMetrics.columns[0] + gridMetrics.columns[1]).toBeLessThanOrEqual(gridMetrics.width);

    const fieldColumns = await page.locator('.b2b-field-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '));
    expect(fieldColumns).toHaveLength(3);

    const statWidths = await page.locator('.b2b-stats > div').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
    expect(Math.max(...statWidths) - Math.min(...statWidths)).toBeLessThanOrEqual(2);
  });

  test('collapses by container width without page overflow and keeps the active tab visible', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockHealth(page);
    await page.goto(`${BASE_URL}#tools/b2b-prospecting`, { waitUntil: 'networkidle' });

    const root = page.locator('#tools');
    await expect(root).toHaveAttribute('data-b2b-layout', 'compact');

    const fieldColumns = await page.locator('.b2b-field-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '));
    expect(fieldColumns).toHaveLength(1);

    await page.locator('[data-b2b-tab="leads"]').click();
    const actionButtons = page.locator('.b2b-lead-heading .tool-button');
    await expect(actionButtons).toHaveCount(4);
    const actionHeights = await actionButtons.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    expect(Math.min(...actionHeights)).toBeGreaterThanOrEqual(44);

    await page.locator('[data-b2b-tab="route"]').click();
    await expect(page.locator('[data-b2b-tab="route"]')).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(250);
    const tabVisibility = await page.locator('[data-b2b-tab="route"]').evaluate((tab) => {
      const tabRect = tab.getBoundingClientRect();
      const listRect = tab.parentElement.getBoundingClientRect();
      return { tabLeft: tabRect.left, tabRight: tabRect.right, listLeft: listRect.left, listRight: listRect.right };
    });
    expect(tabVisibility.tabLeft).toBeGreaterThanOrEqual(tabVisibility.listLeft - 1);
    expect(tabVisibility.tabRight).toBeLessThanOrEqual(tabVisibility.listRight + 1);

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth
    }));
    expect(dimensions.htmlScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.bodyScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});

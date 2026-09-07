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
  test('keeps the desktop hierarchy proportional and aligns the product hero with Tools', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await mockHealth(page);
    await page.goto(`${BASE_URL}#tools/b2b-prospecting`, { waitUntil: 'networkidle' });

    const root = page.locator('#tools-view');
    await expect(root).toHaveAttribute('data-b2b-layout', 'wide');
    await expect(page.locator('#b2b-prospecting-style')).toHaveAttribute('href', '/src/tools/b2b-prospecting.css?v=3');
    await expect(page.locator('#b2b-prospecting-polish-style')).toHaveAttribute('href', '/src/tools/b2b-prospecting-polish.css?v=1');
    await expect(page.locator('#b2b-prospecting-hero-style')).toHaveAttribute('href', '/src/tools/b2b-prospecting-hero.css?v=1');

    const heroColumns = await page.locator('.b2b-page-header').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').map((value) => Number.parseFloat(value)));
    expect(heroColumns).toHaveLength(2);
    expect(heroColumns[0]).toBeGreaterThanOrEqual(220);
    expect(heroColumns[0]).toBeLessThanOrEqual(236);

    const backHeight = await page.locator('.b2b-page-header > .tools-back').evaluate((element) => element.getBoundingClientRect().height);
    expect(backHeight).toBeGreaterThanOrEqual(64);
    expect(backHeight).toBeLessThanOrEqual(70);

    const productColumns = await page.locator('.b2b-page-header .tools-product-heading').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').map((value) => Number.parseFloat(value)));
    expect(productColumns).toHaveLength(2);
    expect(productColumns[0]).toBeGreaterThanOrEqual(84);
    expect(productColumns[0]).toBeLessThanOrEqual(88);

    const heroTitleSize = await page.locator('#tools-title').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(heroTitleSize).toBeGreaterThanOrEqual(38);
    expect(heroTitleSize).toBeLessThanOrEqual(54);

    const heroSubtitleColor = await page.locator('.b2b-page-header .tools-heading p').evaluate((element) => getComputedStyle(element).color);
    const toolsAccentColor = await page.locator('#tools').evaluate((element) => getComputedStyle(element).getPropertyValue('--tools-accent').trim());
    expect(heroSubtitleColor).not.toBe('rgb(89, 89, 89)');
    expect(toolsAccentColor).not.toBe('');

    const badgeMetrics = await page.locator('#b2b-ai-badge').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, position: getComputedStyle(element).position };
    });
    expect(badgeMetrics.width).toBeLessThanOrEqual(1);
    expect(badgeMetrics.height).toBeLessThanOrEqual(1);
    expect(badgeMetrics.position).toBe('absolute');

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

    const panelPadding = await page.locator('#b2b-panel-search .b2b-form-panel').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft));
    expect(panelPadding).toBeGreaterThanOrEqual(20);

    const statWidths = await page.locator('.b2b-stats > div').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
    expect(Math.max(...statWidths) - Math.min(...statWidths)).toBeLessThanOrEqual(2);
  });

  test('uses a compact product hero and two-by-two mobile navigation without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockHealth(page);
    await page.goto(`${BASE_URL}#tools/b2b-prospecting`, { waitUntil: 'networkidle' });

    const root = page.locator('#tools-view');
    await expect(root).toHaveAttribute('data-b2b-layout', 'compact');

    const heroColumns = await page.locator('.b2b-page-header').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '));
    expect(heroColumns).toHaveLength(1);

    const mobileProductColumns = await page.locator('.b2b-page-header .tools-product-heading').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '));
    expect(mobileProductColumns).toHaveLength(2);

    const mobileBackHeight = await page.locator('.b2b-page-header > .tools-back').evaluate((element) => element.getBoundingClientRect().height);
    expect(mobileBackHeight).toBeGreaterThanOrEqual(44);
    expect(mobileBackHeight).toBeLessThanOrEqual(52);

    const mobileHeroTitleSize = await page.locator('#tools-title').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(mobileHeroTitleSize).toBeLessThanOrEqual(24);

    const fieldColumns = await page.locator('.b2b-field-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '));
    expect(fieldColumns).toHaveLength(1);

    const tabColumns = await page.locator('.b2b-tabs').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '));
    expect(tabColumns).toHaveLength(2);

    const tabMetrics = await page.locator('.b2b-tabs').evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX
    }));
    expect(tabMetrics.scrollWidth).toBeLessThanOrEqual(tabMetrics.clientWidth + 1);
    expect(tabMetrics.overflowX).not.toBe('scroll');

    const panelPadding = await page.locator('#b2b-panel-search .b2b-form-panel').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft));
    expect(panelPadding).toBeGreaterThanOrEqual(14);
    expect(panelPadding).toBeLessThanOrEqual(18);

    const searchButtonHeight = await page.locator('#b2b-search-button').evaluate((button) => button.getBoundingClientRect().height);
    expect(searchButtonHeight).toBeGreaterThanOrEqual(44);
    expect(searchButtonHeight).toBeLessThanOrEqual(54);

    const headingSize = await page.locator('#b2b-search-title').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(headingSize).toBeLessThanOrEqual(22);

    await page.locator('[data-b2b-tab="leads"]').click();
    const actionButtons = page.locator('.b2b-lead-heading .tool-button');
    await expect(actionButtons).toHaveCount(4);
    const actionHeights = await actionButtons.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    expect(Math.min(...actionHeights)).toBeGreaterThanOrEqual(44);

    await page.locator('[data-b2b-tab="route"]').click();
    await expect(page.locator('[data-b2b-tab="route"]')).toHaveAttribute('aria-selected', 'true');

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth
    }));
    expect(dimensions.htmlScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.bodyScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});

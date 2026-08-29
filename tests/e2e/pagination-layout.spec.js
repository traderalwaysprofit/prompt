import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

async function openPromptLibrary(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
  await expect(page.locator('nav.pagination')).toBeVisible();
}

test.describe('SAMSON pagination layout', () => {
  test('desktop pagination is proportional and visually raised', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openPromptLibrary(page);

    const layout = await page.locator('nav.pagination').evaluate((pagination) => {
      const previous = pagination.querySelector('.pagination-previous');
      const first = pagination.querySelector('.pagination-page');
      const pages = pagination.querySelector('.pagination-pages');
      const p = pagination.getBoundingClientRect();
      const prev = previous.getBoundingClientRect();
      const page = first.getBoundingClientRect();
      const pageRow = pages.getBoundingClientRect();
      const style = getComputedStyle(first);
      return {
        paginationWidth: p.width,
        previousWidth: prev.width,
        previousHeight: prev.height,
        pageWidth: page.width,
        pageHeight: page.height,
        pageRowInside: pageRow.left >= p.left - 1 && pageRow.right <= p.right + 1,
        shadow: style.boxShadow,
        radius: parseFloat(style.borderRadius)
      };
    });

    expect(layout.paginationWidth).toBeLessThanOrEqual(720);
    expect(layout.previousWidth).toBeGreaterThanOrEqual(100);
    expect(layout.previousHeight).toBeGreaterThanOrEqual(44);
    expect(Math.abs(layout.pageWidth - layout.pageHeight)).toBeLessThanOrEqual(1);
    expect(layout.pageWidth).toBeGreaterThanOrEqual(44);
    expect(layout.pageRowInside).toBeTruthy();
    expect(layout.shadow).not.toBe('none');
    expect(layout.radius).toBeGreaterThanOrEqual(10);
  });

  test('mobile pagination keeps 44px controls without viewport overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openPromptLibrary(page);

    const layout = await page.locator('nav.pagination').evaluate((pagination) => {
      const previous = pagination.querySelector('.pagination-previous');
      const next = pagination.querySelector('.pagination-next');
      const first = pagination.querySelector('.pagination-page');
      const p = pagination.getBoundingClientRect();
      const prev = previous.getBoundingClientRect();
      const nxt = next.getBoundingClientRect();
      const page = first.getBoundingClientRect();
      return {
        left: p.left,
        right: p.right,
        viewport: document.documentElement.clientWidth,
        previous: { width: prev.width, height: prev.height },
        next: { width: nxt.width, height: nxt.height },
        page: { width: page.width, height: page.height },
        shadow: getComputedStyle(first).boxShadow
      };
    });

    expect(layout.left).toBeGreaterThanOrEqual(-1);
    expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.previous.width).toBeGreaterThanOrEqual(44);
    expect(layout.previous.height).toBeGreaterThanOrEqual(44);
    expect(layout.next.width).toBeGreaterThanOrEqual(44);
    expect(layout.next.height).toBeGreaterThanOrEqual(44);
    expect(layout.page.width).toBeGreaterThanOrEqual(44);
    expect(layout.page.height).toBeGreaterThanOrEqual(44);
    expect(layout.shadow).not.toBe('none');
  });

  test('Pixel selected page keeps a readable numeric glyph', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('pixel'));
    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();

    const pageTwo = page.locator('.pagination-page', { hasText: /^2$/ }).first();
    await expect(pageTwo).toBeVisible();
    await pageTwo.click();

    const current = page.locator('.pagination-page[aria-current="page"]');
    await expect(current).toHaveText('2');

    const state = await current.evaluate((button) => {
      const span = button.querySelector('span');
      const buttonStyle = getComputedStyle(button);
      const spanStyle = span ? getComputedStyle(span) : buttonStyle;
      const rect = span ? span.getBoundingClientRect() : button.getBoundingClientRect();
      return {
        text: button.textContent.trim(),
        fontSize: parseFloat(spanStyle.fontSize),
        lineHeight: spanStyle.lineHeight,
        glyphWidth: rect.width,
        glyphHeight: rect.height,
        color: buttonStyle.color,
        backgroundColor: buttonStyle.backgroundColor
      };
    });

    expect(state.text).toBe('2');
    expect(state.fontSize).toBeGreaterThanOrEqual(11);
    expect(state.glyphWidth).toBeGreaterThanOrEqual(6);
    expect(state.glyphHeight).toBeGreaterThanOrEqual(11);
    expect(state.color).toBe('rgb(0, 0, 0)');
    expect(state.backgroundColor).toBe('rgb(255, 204, 0)');
  });
});

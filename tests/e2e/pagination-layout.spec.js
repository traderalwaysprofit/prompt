import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

async function openPromptLibrary(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
  await expect(page.locator('nav.pagination')).toBeVisible();
}

const readCurrentState = async (page) => page.locator('.pagination-page[aria-current="page"]').evaluate((button) => {
  const span = button.querySelector('span');
  const buttonStyle = getComputedStyle(button);
  const spanStyle = span ? getComputedStyle(span) : buttonStyle;
  const rect = span ? span.getBoundingClientRect() : button.getBoundingClientRect();
  const before = getComputedStyle(button, '::before');

  return {
    text: button.textContent.trim(),
    fontSize: parseFloat(spanStyle.fontSize),
    fontFamily: spanStyle.fontFamily,
    fontWeight: parseInt(spanStyle.fontWeight, 10),
    glyphWidth: rect.width,
    glyphHeight: rect.height,
    color: buttonStyle.color,
    backgroundColor: buttonStyle.backgroundColor,
    beforeContent: before.content,
    beforeDisplay: before.display
  };
});

test.describe('SAMSON pagination layout', () => {
  test('desktop pagination prioritizes readable page numbers and one clear current state', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openPromptLibrary(page);

    const layout = await page.locator('nav.pagination').evaluate((pagination) => {
      const previous = pagination.querySelector('.pagination-previous');
      const first = pagination.querySelector('.pagination-page');
      const pages = pagination.querySelector('.pagination-pages');
      const p = pagination.getBoundingClientRect();
      const prev = previous.getBoundingClientRect();
      const pageBox = first.getBoundingClientRect();
      const pageRow = pages.getBoundingClientRect();
      const style = getComputedStyle(first);
      return {
        paginationWidth: p.width,
        previousWidth: prev.width,
        previousHeight: prev.height,
        pageWidth: pageBox.width,
        pageHeight: pageBox.height,
        pageRowInside: pageRow.left >= p.left - 1 && pageRow.right <= p.right + 1,
        radius: parseFloat(style.borderRadius),
        fontSize: parseFloat(style.fontSize),
        fontFamily: style.fontFamily
      };
    });

    expect(layout.paginationWidth).toBeLessThanOrEqual(680);
    expect(layout.previousWidth).toBeGreaterThanOrEqual(110);
    expect(layout.previousHeight).toBeGreaterThanOrEqual(44);
    expect(Math.abs(layout.pageWidth - layout.pageHeight)).toBeLessThanOrEqual(1);
    expect(layout.pageWidth).toBeGreaterThanOrEqual(44);
    expect(layout.pageRowInside).toBeTruthy();
    expect(layout.radius).toBeGreaterThanOrEqual(8);
    expect(layout.fontSize).toBeGreaterThanOrEqual(14);
    expect(layout.fontFamily.toLowerCase()).not.toContain('silkscreen');

    const initial = await readCurrentState(page);
    expect(initial.text).toBe('1');
    expect(initial.fontSize).toBeGreaterThanOrEqual(14);
    expect(initial.fontWeight).toBeGreaterThanOrEqual(700);
    expect(initial.glyphWidth).toBeGreaterThanOrEqual(5);
    expect(initial.glyphHeight).toBeGreaterThanOrEqual(13);
    expect(initial.color).toBe('rgb(255, 255, 255)');
    expect(initial.backgroundColor).toBe('rgb(24, 32, 43)');
    expect(['none', 'normal', '"none"']).toContain(initial.beforeContent);
  });

  test('changing pages keeps the selected digit readable instead of turning into a decorative block', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openPromptLibrary(page);

    const pageTwo = page.locator('.pagination-page', { hasText: /^2$/ }).first();
    await expect(pageTwo).toBeVisible();
    await pageTwo.click();

    const current = page.locator('.pagination-page[aria-current="page"]');
    await expect(current).toHaveText('2');

    const state = await readCurrentState(page);
    expect(state.text).toBe('2');
    expect(state.fontSize).toBeGreaterThanOrEqual(14);
    expect(state.fontWeight).toBeGreaterThanOrEqual(700);
    expect(state.glyphWidth).toBeGreaterThanOrEqual(7);
    expect(state.glyphHeight).toBeGreaterThanOrEqual(13);
    expect(state.fontFamily.toLowerCase()).not.toContain('silkscreen');
    expect(state.color).toBe('rgb(255, 255, 255)');
    expect(state.backgroundColor).toBe('rgb(24, 32, 43)');
    expect(['none', 'normal', '"none"']).toContain(state.beforeContent);
  });

  test('mobile pagination keeps readable 44px controls without viewport overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openPromptLibrary(page);

    const layout = await page.locator('nav.pagination').evaluate((pagination) => {
      const previous = pagination.querySelector('.pagination-previous');
      const next = pagination.querySelector('.pagination-next');
      const first = pagination.querySelector('.pagination-page');
      const p = pagination.getBoundingClientRect();
      const prev = previous.getBoundingClientRect();
      const nxt = next.getBoundingClientRect();
      const pageBox = first.getBoundingClientRect();
      return {
        left: p.left,
        right: p.right,
        viewport: document.documentElement.clientWidth,
        previous: { width: prev.width, height: prev.height },
        next: { width: nxt.width, height: nxt.height },
        page: { width: pageBox.width, height: pageBox.height },
        fontSize: parseFloat(getComputedStyle(first).fontSize)
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
    expect(layout.fontSize).toBeGreaterThanOrEqual(14);
  });

  test('Pixel selected page keeps a readable numeric glyph and the yellow theme state', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('pixel'));
    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();

    const pageTwo = page.locator('.pagination-page', { hasText: /^2$/ }).first();
    await expect(pageTwo).toBeVisible();
    await pageTwo.click();

    const current = page.locator('.pagination-page[aria-current="page"]');
    await expect(current).toHaveText('2');

    const state = await readCurrentState(page);
    expect(state.text).toBe('2');
    expect(state.fontSize).toBeGreaterThanOrEqual(11);
    expect(state.glyphWidth).toBeGreaterThanOrEqual(6);
    expect(state.glyphHeight).toBeGreaterThanOrEqual(11);
    expect(state.fontFamily.toLowerCase()).not.toContain('silkscreen');
    expect(state.color).toBe('rgb(0, 0, 0)');
    expect(state.backgroundColor).toBe('rgb(255, 204, 0)');
    expect(['none', 'normal', '"none"']).toContain(state.beforeContent);
  });
});

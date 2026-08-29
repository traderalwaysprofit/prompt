import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const mobileViewports = [
  { name: '320px compact phone', width: 320, height: 568 },
  { name: '360px Android', width: 360, height: 800 },
  { name: '375px iPhone', width: 375, height: 812 },
  { name: '390px modern iPhone', width: 390, height: 844 },
  { name: '412px large Android', width: 412, height: 915 },
  { name: '768px tablet', width: 768, height: 1024 },
  { name: 'landscape phone', width: 844, height: 390 }
];

const expectNoRootOverflow = async (page, label) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    htmlScroll: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth
  }));
  expect(dimensions.htmlScroll, `${label}: html overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.bodyScroll, `${label}: body overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
};

test.describe('SAMSON adaptive UI system', () => {
  test('offers four UI personalities, keeps Samson Default as default, and persists selection', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('#theme-select')).toHaveCount(1);
    await expect(page.locator('#mobile-theme-select')).toHaveCount(1);
    await expect(page.locator('#theme-select option')).toHaveCount(4);
    await expect(page.locator('#theme-select option').nth(0)).toHaveText('Samson Default');
    await expect(page.locator('#theme-select option').nth(3)).toHaveText('Pixel');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');

    await page.evaluate(() => window.SamsonTheme.set('developer'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'developer');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(13, 17, 23)');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'developer');
    await expect(page.locator('#theme-select')).toHaveValue('developer');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('developer');

    await page.evaluate(() => window.SamsonTheme.set('pixel'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pixel');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(page.locator('body')).toHaveClass(/pixel-wire-active/);
    await expect(page.locator('#theme-select')).toHaveValue('pixel');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('pixel');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pixel');
    await expect(page.locator('body')).toHaveClass(/pixel-wire-active/);
    await expect(page.locator('#theme-select')).toHaveValue('pixel');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('pixel');

    await page.evaluate(() => window.SamsonTheme.reset());
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');
    await expect(page.locator('body')).not.toHaveClass(/pixel-wire-active/);
    await expect(page.locator('#theme-select')).toHaveValue('default');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('default');
  });

  test('Pixel personality matches the retro wire editorial visual contract', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('pixel'));

    const hero = page.locator('.hero h1');
    const heroFont = await hero.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(heroFont).toContain('Silkscreen');
    await expect(hero).toHaveCSS('color', 'rgb(255, 204, 0)');

    const bodyFont = await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily);
    expect(bodyFont).toContain('Verdana');

    await expect(page.locator('.pixel-wire-chrome')).toHaveCSS('display', 'block');
    await expect(page.locator('.pixel-wire-strip')).toHaveCount(2);
    await expect(page.locator('.pixel-wire-brand')).toHaveText('SAMSON');
    await expect(page.locator('.pixel-crt-overlay')).toHaveCount(0);
    await expect(page.locator('.pixel-vignette')).toHaveCount(0);
    await expect(page.locator('.pixel-boot-message')).toHaveCount(0);

    const heroCard = page.locator('.hero-card');
    await expect(heroCard).toHaveCSS('border-radius', '0px');
    await expect(heroCard).toHaveCSS('border-top-width', '1px');
    await expect(heroCard).toHaveCSS('box-shadow', 'none');

    const button = page.locator('[data-show-workflows]');
    await expect(button).toHaveCSS('border-radius', '0px');
    await expect(button).toHaveCSS('background-color', 'rgb(255, 204, 0)');
    await expect(button).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(button).toHaveCSS('box-shadow', 'none');

    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
    const artworkBackground = await page.locator('.nft-art').first().evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(artworkBackground).toBe('none');
    await expect(page.locator('.nft-card').first()).toHaveCSS('border-top-width', '1px');
  });

  test('Pixel stays responsive across compact phones, modern phones, tablet, and landscape', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('pixel'));

    for (const viewport of mobileViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectNoRootOverflow(page, `${viewport.name} chooser`);

      const action = page.locator('#workflow-choice [data-show-workflows]');
      await expect(action).toBeVisible();
      if (viewport.width <= 760) {
        const actionHeight = await action.evaluate((element) => element.getBoundingClientRect().height);
        expect(actionHeight, `${viewport.name}: workflow action touch target`).toBeGreaterThanOrEqual(44);
      }
    }

    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
    await expect(page.locator('#featured')).toBeVisible();

    for (const viewport of mobileViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectNoRootOverflow(page, `${viewport.name} prompt library`);
    }

    await page.goto(`${BASE_URL}#cheatcodes`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('pixel'));
    await page.locator('#workflow-choice [data-show-workflows]').click();
    await expect(page.locator('#workflow-catalog')).toBeVisible();

    for (const viewport of mobileViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectNoRootOverflow(page, `${viewport.name} workflow catalog`);
      if (viewport.width <= 760) {
        await expect(page.locator('.workflow-filters')).toHaveCSS('overflow-x', 'auto');
        const filterHeight = await page.locator('[data-workflow-filter]').first().evaluate((element) => element.getBoundingClientRect().height);
        expect(filterHeight, `${viewport.name}: filter touch target`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('theme mutation preserves prompt search behavior', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('pixel'));
    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
    await expect(page.locator('#featured')).toBeVisible();

    const search = page.locator('#search');
    await search.fill('/xauanalysis');
    await expect(page.locator('.nft-card')).toHaveCount(1);
    await expect(page.locator('.nft-card code')).toHaveText('/xauanalysis');
  });

  test('anti-slop quality gate passes against runtime UI truth', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => window.SamsonAntiSlop.audit());

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.status).toBe('PASS');
    expect(result.rules.find((item) => item.id === 'runtime-truth')?.pass).toBeTruthy();
    expect(result.rules.find((item) => item.id === 'theme-controls')?.pass).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('data-anti-slop-status', 'pass');
  });
});

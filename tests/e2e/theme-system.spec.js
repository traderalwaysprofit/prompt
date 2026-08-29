import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

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
    await expect(page.locator('body')).toHaveClass(/pixel-arcade-active/);
    await expect(page.locator('#theme-select')).toHaveValue('pixel');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('pixel');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pixel');
    await expect(page.locator('body')).toHaveClass(/pixel-arcade-active/);
    await expect(page.locator('#theme-select')).toHaveValue('pixel');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('pixel');

    await page.evaluate(() => window.SamsonTheme.reset());
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');
    await expect(page.locator('body')).not.toHaveClass(/pixel-arcade-active/);
    await expect(page.locator('#theme-select')).toHaveValue('default');
    await expect(page.locator('#mobile-theme-select')).toHaveValue('default');
  });

  test('Pixel personality matches the retro arcade visual contract', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SamsonTheme.set('pixel'));

    const hero = page.locator('.hero h1');
    const heroFont = await hero.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(heroFont).toContain('Press Start 2P');
    await expect(hero).toHaveCSS('color', 'rgb(255, 0, 255)');

    await expect(page.locator('.pixel-crt-overlay')).toHaveCSS('display', 'block');
    await expect(page.locator('.pixel-vignette')).toHaveCSS('display', 'block');
    await expect(page.locator('.pixel-boot-message')).toHaveCount(1);

    const heroCard = page.locator('.hero-card');
    await expect(heroCard).toHaveCSS('border-radius', '0px');
    await expect(heroCard).toHaveCSS('border-top-width', '4px');

    const button = page.locator('[data-show-workflows]');
    await expect(button).toHaveCSS('border-radius', '0px');
    await expect(button).toHaveCSS('border-top-width', '4px');
    await expect(button).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    const shadow = await button.evaluate((element) => getComputedStyle(element).boxShadow);
    expect(shadow).toContain('rgb(0, 255, 255)');

    await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
    const artworkBackground = await page.locator('.nft-art').first().evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(artworkBackground).toBe('none');
    await expect(page.locator('.nft-info p').first()).toHaveCSS('color', 'rgb(209, 213, 219)');
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

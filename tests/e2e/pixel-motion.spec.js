import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const activatePixel = async (page) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.SamsonTheme.set('pixel'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'pixel');
};

test.describe('Pixel Motion System V3', () => {
  test('uses short stepped feedback with a scrolling ticker and blinking cursor', async ({ page }) => {
    await activatePixel(page);

    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const button = getComputedStyle(document.querySelector('[data-show-workflows]'));
      const tickerNode = document.querySelector('.pixel-wire-ticker span');
      const ticker = getComputedStyle(tickerNode);
      const cursor = getComputedStyle(tickerNode, '::after');
      return {
        instant: root.getPropertyValue('--pixel-motion-instant').trim(),
        fast: root.getPropertyValue('--pixel-motion-fast').trim(),
        base: root.getPropertyValue('--pixel-motion-base').trim(),
        slow: root.getPropertyValue('--pixel-motion-slow').trim(),
        buttonDuration: button.transitionDuration,
        buttonTiming: button.transitionTimingFunction,
        tickerAnimation: ticker.animationName,
        tickerDuration: ticker.animationDuration,
        tickerIterations: ticker.animationIterationCount,
        cursorAnimation: cursor.animationName,
        cursorTiming: cursor.animationTimingFunction
      };
    });

    expect(contract).toMatchObject({
      instant: '80ms',
      fast: '120ms',
      base: '180ms',
      slow: '240ms',
      tickerAnimation: 'pixel-header-scroll',
      tickerDuration: '24s',
      tickerIterations: 'infinite',
      cursorAnimation: 'pixel-cursor-blink'
    });
    expect(contract.buttonDuration.split(',')).toContain('0.12s');
    expect(contract.buttonTiming).toContain('steps(2');
    expect(contract.cursorTiming).toContain('steps(1');
  });

  test('disables non-essential Pixel motion when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await activatePixel(page);

    const motion = await page.evaluate(() => {
      const chrome = getComputedStyle(document.querySelector('.pixel-wire-chrome'));
      const button = getComputedStyle(document.querySelector('[data-show-workflows]'));
      const tickerNode = document.querySelector('.pixel-wire-ticker span');
      const ticker = getComputedStyle(tickerNode);
      const cursor = getComputedStyle(tickerNode, '::after');
      return {
        chromeAnimation: chrome.animationName,
        buttonDuration: button.transitionDuration,
        tickerAnimation: ticker.animationName,
        cursorAnimation: cursor.animationName
      };
    });

    expect(motion.chromeAnimation).toBe('none');
    expect(Number.parseFloat(motion.buttonDuration)).toBeLessThanOrEqual(0.001);
    expect(motion.tickerAnimation).toBe('none');
    expect(motion.cursorAnimation).toBe('none');
  });

  test('preserves mobile layout while applying smaller displacement', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await activatePixel(page);

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth
    }));
    expect(dimensions.htmlScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.bodyScroll).toBeLessThanOrEqual(dimensions.viewport + 1);

    const action = page.locator('[data-show-workflows]');
    await expect(action).toBeVisible();
    expect(await action.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  });

  test('uses functional color roles and tactile hard-shadow feedback', async ({ page }) => {
    await activatePixel(page);
    const action = page.locator('[data-show-workflows]').first();
    await expect(action).toHaveCSS('box-shadow', 'rgb(5, 7, 19) 4px 4px 0px 0px');

    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        primary: root.getPropertyValue('--pixel-primary').trim(),
        secondary: root.getPropertyValue('--pixel-secondary').trim(),
        success: root.getPropertyValue('--pixel-success').trim()
      };
    });

    expect(contract).toEqual({
      primary: '#68c5ff',
      secondary: '#ff82ac',
      success: '#75e6a0'
    });
  });
});

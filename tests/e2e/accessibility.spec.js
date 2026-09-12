import { test, expect } from '@playwright/test';

const openPromptLibrary = async (page) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Buka Prompt Library/ }).click();
  await expect(page.locator('#featured')).toBeVisible();
};

test.describe('Accessibility Hardening V1', () => {
  test('core landmarks, skip link, and collapsed menus are keyboard-safe', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.locator('main#main-content')).toHaveCount(1);

    const skipLink = page.getByRole('link', { name: 'Lewati ke konten utama' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute('href', '#main-content');

    const hiddenFocusable = await page.locator('[aria-hidden="true"]').evaluateAll((nodes) => {
      const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return nodes.flatMap((node) => {
        if (node.closest('[inert]') || node.hasAttribute('inert') || node.hidden) return [];
        return [...node.querySelectorAll(selector)]
          .filter((element) => !element.closest('[inert]') && !element.hidden)
          .map((element) => element.outerHTML.slice(0, 180));
      });
    });
    expect(hiddenFocusable).toEqual([]);
  });

  test('prompt dialog has an accessible name, traps focus, closes with Escape, and restores focus', async ({ page }) => {
    await openPromptLibrary(page);

    const openButton = page.locator('.nft-card .open-btn').first();
    await openButton.focus();
    await openButton.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'prompt-modal-title');
    await expect(page.getByRole('button', { name: 'Tutup detail prompt' })).toBeFocused();

    const focusables = dialog.locator('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const last = focusables.last();
    await last.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Tutup detail prompt' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(openButton).toBeFocused();
  });

  test('dynamic feedback is exposed through live regions', async ({ page }) => {
    await openPromptLibrary(page);

    const search = page.locator('#search');
    await search.fill('/xauanalysis');
    const count = page.locator('.results-count');
    await expect(count).toHaveAttribute('role', 'status');
    await expect(count).toHaveAttribute('aria-live', 'polite');
    await expect(count).toContainText('OF 1 COMMANDS');

    await page.locator('[data-favorite]').first().click();
    const toast = page.locator('.toast').last();
    await expect(toast).toHaveAttribute('role', 'status');
    await expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  test('workflow tabs support arrow-key navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('#workflow-choice [data-show-workflows]').click();

    const guided = page.getByRole('tab', { name: 'Guided Workflows' });
    const assistant = page.getByRole('tab', { name: 'Work Assistant' });
    await expect(guided).toHaveAttribute('aria-selected', 'true');

    await guided.focus();
    await page.keyboard.press('ArrowRight');
    await expect(assistant).toBeFocused();
    await expect(assistant).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(guided).toBeFocused();
    await expect(guided).toHaveAttribute('aria-selected', 'true');
  });

  test('reduced-motion preference disables smooth scrolling and long animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });

    const motion = await page.evaluate(() => ({
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      heroAnimationDuration: getComputedStyle(document.querySelector('.hero-card'), '::before').animationDuration
    }));

    expect(motion.scrollBehavior).toBe('auto');
    expect(['0s', '0.00001s']).toContain(motion.heroAnimationDuration);
  });
});

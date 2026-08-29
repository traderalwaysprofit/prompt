import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

async function openRadar(page) {
  await page.goto(`${BASE_URL}/#radar`, { waitUntil: 'networkidle' });
  await expect(page.locator('#ai-radar')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI Radar' })).toBeVisible();
}

test.describe('SAMSON Personal AI Radar', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('samsonRadarTestReset')) {
        localStorage.removeItem('samsonRadarState');
        sessionStorage.setItem('samsonRadarTestReset', '1');
      }
    });
  });

  test('opens from desktop navigation as a dedicated entry mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const radarNav = page.getByRole('button', { name: 'AI Radar' });
    await expect(radarNav).toBeVisible();
    await radarNav.click();

    await expect(page).toHaveURL(/#radar$/);
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'radar');
    await expect(page.locator('#ai-radar')).toBeVisible();
    await expect(page.locator('.hero')).toBeHidden();
    await expect(page.locator('#cheatcodes')).toBeHidden();
    await expect(page.locator('#featured')).toBeHidden();
  });

  test('renders curated signals with source provenance and score contract', async ({ page }) => {
    await openRadar(page);

    await expect(page.locator('[data-radar-item]')).toHaveCount(8);
    const codex = page.locator('[data-radar-item="openai-2026-08-24-codex-mcp-server"]');
    await expect(codex).toBeVisible();
    await expect(codex.locator('.radar-score')).toHaveText('98');
    await expect(codex.getByText('PRIMARY', { exact: true })).toBeVisible();
    await expect(codex.getByText('WHAT CHANGED', { exact: true })).toBeVisible();
    await expect(codex.getByText('WHY IT MATTERS', { exact: true })).toBeVisible();
    await expect(codex.getByText('Prompt /github', { exact: true })).toBeVisible();
  });

  test('save state persists locally across reload', async ({ page }) => {
    await openRadar(page);

    const item = page.locator('[data-radar-item="github-2026-08-03-comment-automations"]');
    await item.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(item.getByRole('button', { name: 'Saved ✓', exact: true })).toBeVisible();

    await page.reload({ waitUntil: 'networkidle' });
    const reloaded = page.locator('[data-radar-item="github-2026-08-03-comment-automations"]');
    await expect(reloaded.getByRole('button', { name: 'Saved ✓', exact: true })).toBeVisible();
  });

  test('turns a signal into a testing action and then an applied result', async ({ page }) => {
    await openRadar(page);

    const item = page.locator('[data-radar-item="github-2026-08-03-comment-automations"]');
    await item.getByRole('button', { name: 'Create Action' }).click();
    await expect(item.getByText('TURN THIS SIGNAL INTO ACTION')).toBeVisible();
    await item.getByRole('button', { name: 'Test this feature' }).click();

    await expect(item.getByText('TESTING', { exact: true })).toBeVisible();
    await expect(item.getByText('ACTION: Test this feature', { exact: true })).toBeVisible();
    await expect(page.locator('.radar-stat').filter({ hasText: 'TESTING' }).locator('strong')).toHaveText('1');

    await item.getByRole('button', { name: 'Mark Applied' }).click();
    await expect(item.getByText('APPLIED', { exact: true })).toBeVisible();
    await expect(page.locator('.radar-stat').filter({ hasText: 'APPLIED' }).locator('strong')).toHaveText('1');
  });

  test('topic filter narrows the personal feed', async ({ page }) => {
    await openRadar(page);
    await page.locator('[data-radar-topic]').selectOption('openai');
    await expect(page.locator('[data-radar-item]')).toHaveCount(1);
    await expect(page.locator('[data-radar-item="openai-2026-08-24-codex-mcp-server"]')).toBeVisible();
  });

  test('mobile radar has usable controls and no document overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openRadar(page);

    const layout = await page.locator('#ai-radar').evaluate((section) => {
      const firstButton = section.querySelector('button');
      const rect = firstButton.getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        buttonHeight: rect.height
      };
    });

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.buttonHeight).toBeGreaterThanOrEqual(44);
  });

  test('radar remains visible across all four UI personalities', async ({ page }) => {
    await openRadar(page);
    for (const theme of ['default', 'developer', 'swiss', 'pixel']) {
      await page.evaluate((id) => window.SamsonTheme.set(id), theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('#ai-radar')).toBeVisible();
      await expect(page.locator('[data-radar-item]').first()).toBeVisible();
    }
  });
});

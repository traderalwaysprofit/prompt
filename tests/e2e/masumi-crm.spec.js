import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';
const CRM_URL = 'https://crm.samson.web.id/';

const fulfillCrmShell = async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>MASUMI Sales CRM</title><h1>MASUMI Sales CRM</h1>'
  });
};

test.describe('MASUMI Sales CRM cloud launcher', () => {
  test('opens the production CRM from the Tools catalog without mounting the retired local UI', async ({ page, context }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await context.route(`${CRM_URL}**`, fulfillCrmShell);
    await page.goto(`${BASE_URL}#tools`, { waitUntil: 'networkidle' });

    const card = page.locator('[data-tool-id="masumi-sales-crm"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('href', CRM_URL);
    await expect(card).toHaveAttribute('target', '_blank');
    await expect(card).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(card).toHaveAttribute('data-tool-destination', 'external');
    await expect(card).toHaveAttribute('aria-label', 'MASUMI Sales CRM — buka aplikasi di tab baru');
    await expect(card).toContainText('CLOUD');
    await expect(card).toContainText('CRM');
    await expect(card).toContainText('Aplikasi aktif');
    await expect(card).toContainText('Buka Aplikasi');
    await expect(page.locator('#masumi-crm-style')).toHaveCount(0);

    const cardBox = await card.boundingBox();
    expect(cardBox.height).toBeGreaterThanOrEqual(44);

    const popupPromise = page.waitForEvent('popup');
    await card.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(CRM_URL);
    await expect(page).toHaveURL(/#tools$/);
    await expect(page.locator('#masumi-crm-style')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('samsonMasumiCrmV1'))).toBeNull();
  });

  test('redirects the legacy hash route to the production CRM without leaving a back-loop', async ({ page, context }) => {
    await context.route(`${CRM_URL}**`, fulfillCrmShell);
    await page.goto(`${BASE_URL}#tools/masumi-sales-crm`, { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(CRM_URL);
    await expect(page.getByRole('heading', { name: 'MASUMI Sales CRM' })).toBeVisible();
  });
});

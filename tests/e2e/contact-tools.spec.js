import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('SAMSON Tools Hub and Google Contacts tool', () => {
  test('opens the Tools catalog before Google Contacts and preserves the navigation hierarchy', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.locator('#nav-more').click();
    await page.locator('#nav-tools').click();

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'tools');
    await expect(page.locator('#tools')).toBeVisible();
    await expect(page.locator('#tools')).toHaveAttribute('data-tools-view', 'catalog');
    await expect(page.locator('#tools-title')).toHaveText('Tools');
    await expect(page.locator('.tools-count-pill')).toContainText('2 tool tersedia');
    await expect(page.locator('[data-tool-id="google-contacts"]')).toBeVisible();
    await expect(page.locator('[data-tool-id="b2b-prospecting"]')).toBeVisible();
    await expect(page.locator('#contact-file-input')).toHaveCount(0);
    await expect(page.locator('.hero')).toBeHidden();
    await expect(page).toHaveURL(/#tools$/);

    await page.locator('[data-tool-id="google-contacts"]').click();

    await expect(page.locator('#tools')).toHaveAttribute('data-tools-view', 'google-contacts');
    await expect(page.locator('#tools-title')).toHaveText('Google Contacts Ready');
    await expect(page.locator('.tools-privacy')).toHaveCount(0);
    await expect(page.locator('#contact-template-download')).toBeVisible();
    await expect(page.locator('#contact-template-download')).toHaveAttribute('href', '/assets/templates/samson-template-kontak.xlsx');
    await expect(page).toHaveURL(/#tools\/google-contacts$/);

    await page.locator('[data-tools-catalog-back]').click();
    await expect(page.locator('#tools')).toHaveAttribute('data-tools-view', 'catalog');
    await expect(page.locator('#tools-title')).toHaveText('Tools');
    await expect(page.locator('#contact-file-input')).toHaveCount(0);
    await expect(page).toHaveURL(/#tools$/);

    await page.locator('[data-tools-exit]').click();
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'chooser');
    await expect(page.locator('#tools')).toBeHidden();
  });

  test('downloads the ordered Excel input template', async ({ page }) => {
    await page.goto(`${BASE_URL}#tools/google-contacts`, { waitUntil: 'networkidle' });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#contact-template-download').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('samson-template-kontak.xlsx');

    const path = await download.path();
    const template = await readFile(path);
    expect(template.byteLength).toBeGreaterThan(5000);
    expect(template.subarray(0, 2).toString('utf8')).toBe('PK');
  });

  test('normalizes Indonesian WhatsApp numbers, rejects duplicates, and exports Google CSV', async ({ page }) => {
    await page.goto(`${BASE_URL}#tools/google-contacts`, { waitUntil: 'networkidle' });

    await expect(page.locator('#contact-empty-state')).toBeVisible();
    await expect(page.locator('#contact-preview-content')).toBeHidden();
    await expect(page.locator('#contact-file-meta')).toBeHidden();

    const source = [
      'Nama Kontak,Brand / Perusahaan,WhatsApp',
      'Sari,Masumi,081234567890',
      'Budi,Klinik,+62 812-3456-7891',
      'Duplikat,Masumi,081234567890',
      'Nomor Salah,Test,12345',
      '<img src=x onerror=window.__contactToolXss=1>,Aman,81234567892'
    ].join('\n');

    await page.locator('#contact-file-input').setInputFiles({
      name: 'kontak-masumi.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(source, 'utf8')
    });

    await expect(page.locator('#contact-ready-count')).toHaveText('3');
    await expect(page.locator('#contact-issue-count')).toHaveText('2');
    await expect(page.locator('#contact-empty-state')).toBeHidden();
    await expect(page.locator('#contact-preview-content')).toBeVisible();
    await expect(page.locator('#contact-file-meta')).toBeVisible();
    await expect(page.locator('#contact-header-mode')).toHaveText('Terdeteksi');
    await expect(page.locator('#contact-preview-body tr')).toHaveCount(5);
    await expect(page.locator('.contact-table thead th')).toHaveCount(3);
    await expect(page.locator('.contact-row-status.is-duplicate')).toHaveCount(1);
    await expect(page.locator('.contact-row-status.is-invalid')).toHaveCount(1);
    await expect(page.locator('#contact-preview-body img')).toHaveCount(0);
    expect(await page.evaluate(() => globalThis.__contactToolXss)).toBeUndefined();
    await expect.poll(() => page.evaluate(() => globalThis.XLSX?.version)).toBe('0.20.3');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#contact-download-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^google-contacts-samson-\d{4}-\d{2}-\d{2}\.csv$/);

    const path = await download.path();
    const csv = await readFile(path, 'utf8');
    expect(csv).toContain('"First Name","Organization Name","Phone 1 - Label","Phone 1 - Value"');
    expect(csv).toContain('"Sari","Masumi","Mobile","+6281234567890"');
    expect(csv).toContain('"Budi","Klinik","Mobile","+6281234567891"');
    expect(csv).not.toContain('"Sari - Masumi","Masumi"');
    expect(csv.match(/\+6281234567890/g)).toHaveLength(1);
    expect(csv).not.toContain('+12345');
  });

  test('keeps the hub and tool usable across all four themes and compact mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}#tools`, { waitUntil: 'networkidle' });

    for (const theme of ['default', 'developer', 'swiss', 'pixel']) {
      await page.evaluate((id) => window.SamsonTheme.set(id), theme);
      await expect(page.locator('#tools')).toBeVisible();
      await expect(page.locator('[data-tool-id="google-contacts"]')).toBeVisible();
      await expect(page.locator('[data-tool-id="b2b-prospecting"]')).toBeVisible();
      const height = await page.locator('[data-tools-exit]').evaluate((element) => element.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(44);

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        htmlScroll: document.documentElement.scrollWidth,
        bodyScroll: document.body.scrollWidth
      }));
      expect(dimensions.htmlScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.bodyScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
    }

    await page.locator('[data-tool-id="google-contacts"]').click();
    await expect(page.locator('#contact-drop-zone')).toBeVisible();
    await expect(page.locator('[data-tools-catalog-back]')).toBeVisible();

    const toolDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth
    }));
    expect(toolDimensions.htmlScroll).toBeLessThanOrEqual(toolDimensions.viewport + 1);
    expect(toolDimensions.bodyScroll).toBeLessThanOrEqual(toolDimensions.viewport + 1);

    await page.locator('#mobile-menu-toggle').click();
    await expect(page.locator('[data-mobile-nav="tools"]')).toBeVisible();
  });
});

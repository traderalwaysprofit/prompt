import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const minimalLead = (overrides = {}) => ({
  id: 'lead-seed-1',
  company: 'Brand Seed',
  picName: 'PIC Seed',
  pipeline: 'New',
  scores: { fit: 1, readiness: 1, urgency: 1, value: 1 },
  ...overrides
});

const backupPayload = (leads) => ({
  schema: 'samson.masumi-crm.backup',
  version: 1,
  exportedAt: '2026-09-08T00:00:00.000Z',
  leads
});

test.describe('MASUMI Sales CRM tool', () => {
  test('is lazy-loaded from the Tools catalog and starts without fictional prospects', async ({ page }) => {
    await page.goto(`${BASE_URL}#tools`, { waitUntil: 'networkidle' });

    await expect(page.locator('.tools-count-pill')).toContainText('3 tool tersedia');
    const card = page.locator('[data-tool-id="masumi-sales-crm"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Sales & CRM');
    await expect(card).toContainText('LOCAL');
    await expect(page.locator('#masumi-crm-style')).toHaveCount(0);

    await card.click();
    await expect(page).toHaveURL(/#tools\/masumi-sales-crm$/);
    await expect(page.locator('#tools')).toHaveAttribute('data-tools-view', 'masumi-sales-crm');
    await expect(page.locator('#tools-title')).toHaveText('MASUMI Sales CRM');
    await expect(page.locator('#masumi-crm-style')).toHaveAttribute('href', '/src/tools/masumi-crm.css?v=1');
    await expect(page.locator('#crm-lead-empty')).toBeVisible();
    await expect(page.locator('#crm-lead-body tr')).toHaveCount(0);
    await expect(page.locator('#crm-record-count')).toContainText('0 dari 2.000');
    await expect(page.getByRole('link', { name: 'Buka CRM Cloud' })).toHaveAttribute('href', 'https://crm.samson.web.id/');
    await expect(page.getByRole('link', { name: 'Buka CRM Cloud' })).toHaveAttribute('rel', 'noopener');
    expect(await page.evaluate(() => localStorage.getItem('samsonMasumiCrmV1'))).toBeNull();
  });

  test('creates, persists, searches, filters, edits, scores, follows up, and deletes a lead safely', async ({ page }) => {
    await page.goto(`${BASE_URL}#tools/masumi-sales-crm`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Tambah Lead', exact: true }).click();

    const dialog = page.locator('#crm-lead-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('[name="company"]').fill('<img src=x onerror=window.__crmXss=1> Masumi Test');
    await dialog.locator('[name="picName"]').fill('Sari');
    await dialog.locator('[name="source"]').fill('Website');
    await dialog.locator('[name="owner"]').fill('Lita');
    await dialog.locator('[name="potentialValue"]').fill('100000000');
    await dialog.locator('[name="pipeline"]').selectOption('Contacted');
    await dialog.locator('[name="nextAction"]').fill('Hubungi PIC untuk discovery');
    await dialog.locator('[name="nextActionDate"]').fill('2000-01-01');
    await dialog.locator('[name="fit"]').selectOption('5');
    await dialog.locator('[name="readiness"]').selectOption('4');
    await dialog.locator('[name="urgency"]').selectOption('4');
    await dialog.locator('[name="valueScore"]').selectOption('5');
    await expect(page.locator('#crm-score-preview')).toContainText('18/20');
    await expect(page.locator('#crm-score-preview')).toContainText('Hot');
    await dialog.getByRole('button', { name: 'Simpan Lead' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('#crm-lead-body tr')).toHaveCount(1);
    await expect(page.locator('#crm-lead-body')).toContainText('<img src=x onerror=window.__crmXss=1> Masumi Test');
    await expect(page.locator('#crm-lead-body img')).toHaveCount(0);
    expect(await page.evaluate(() => globalThis.__crmXss)).toBeUndefined();
    await expect(page.locator('#crm-kpi-active')).toHaveText('1');
    await expect(page.locator('#crm-kpi-overdue')).toHaveText('1');
    await expect(page.locator('#crm-kpi-forecast')).toContainText('15.000.000');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('samsonMasumiCrmV1')));
    expect(stored.schema).toBe('samson.masumi-crm.backup');
    expect(stored.leads).toHaveLength(1);
    expect(stored.leads[0].pipeline).toBe('Contacted');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#crm-lead-body tr')).toHaveCount(1);
    await page.locator('#crm-search').fill('tidak ditemukan');
    await expect(page.locator('#crm-lead-empty')).toContainText('Lead tidak ditemukan');
    await page.locator('#crm-search').fill('Sari');
    await page.locator('#crm-pipeline-filter').selectOption('Contacted');
    await expect(page.locator('#crm-lead-body tr')).toHaveCount(1);

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.locator('[name="pipeline"]').selectOption('Lost');
    await expect(page.locator('#crm-lost-field')).toBeVisible();
    await dialog.getByRole('button', { name: 'Simpan Lead' }).click();
    await expect(dialog).toBeVisible();
    expect(await dialog.locator('[name="lostReason"]').evaluate((element) => element.validity.valueMissing)).toBe(true);
    await dialog.locator('[name="lostReason"]').fill('Budget belum tersedia');
    await dialog.getByRole('button', { name: 'Simpan Lead' }).click();

    await expect(dialog).toBeHidden();
    await page.locator('#crm-search').fill('');
    await page.locator('#crm-pipeline-filter').selectOption('');
    await expect(page.locator('#crm-kpi-active')).toHaveText('0');
    await expect(page.locator('#crm-kpi-overdue')).toHaveText('0');
    await page.getByRole('tab', { name: /Follow-up/ }).click();
    await expect(page.locator('#crm-followup-empty')).toBeVisible();
    await expect(page.locator('#crm-followup-list .crm-followup-card')).toHaveCount(0);

    await page.getByRole('tab', { name: /Lead Register/ }).click();
    page.once('dialog', (confirmation) => confirmation.accept());
    await page.getByRole('button', { name: 'Hapus', exact: true }).click();
    await expect(page.locator('#crm-lead-empty')).toContainText('Belum ada lead');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('samsonMasumiCrmV1')).leads)).toEqual([]);
  });

  test('exports safe backup/CSV and only replaces data from a valid confirmed JSON backup', async ({ page }) => {
    await page.goto(`${BASE_URL}#tools/masumi-sales-crm`, { waitUntil: 'networkidle' });
    await page.evaluate((payload) => localStorage.setItem('samsonMasumiCrmV1', JSON.stringify(payload)), backupPayload([
      minimalLead({ company: '=2+2', picName: '@PIC', source: '-Formula', potentialValue: 50000000 })
    ]));
    await page.reload({ waitUntil: 'networkidle' });

    const backupDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Backup JSON/ }).click();
    const backupDownload = await backupDownloadPromise;
    expect(backupDownload.suggestedFilename()).toMatch(/^masumi-sales-crm-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backup = JSON.parse(await readFile(await backupDownload.path(), 'utf8'));
    expect(backup.schema).toBe('samson.masumi-crm.backup');
    expect(backup.leads).toHaveLength(1);

    const csvDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Ekspor CSV/ }).click();
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toMatch(/^masumi-sales-crm-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readFile(await csvDownload.path(), 'utf8');
    expect(csv).toContain('"\'=2+2"');
    expect(csv).toContain('"\'@PIC"');
    expect(csv).toContain('"\'-Formula"');

    const duplicateBackup = backupPayload([
      minimalLead({ id: 'duplicate-id' }),
      minimalLead({ id: 'duplicate-id', company: 'Brand Duplikat' })
    ]);
    await page.locator('#crm-import-input').setInputFiles({
      name: 'duplicate.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(duplicateBackup))
    });
    await expect(page.locator('#crm-status')).toContainText('ID lead duplikat');
    await expect(page.locator('#crm-lead-body tr')).toHaveCount(1);

    page.once('dialog', (confirmation) => confirmation.accept());
    await page.locator('#crm-import-input').setInputFiles({
      name: 'valid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backupPayload([
        minimalLead({ id: 'replacement', company: 'Brand Pengganti', picName: 'Mei', pipeline: 'Qualified' })
      ])))
    });
    await expect(page.locator('#crm-status')).toContainText('1 lead berhasil dipulihkan');
    await expect(page.locator('#crm-lead-body')).toContainText('Brand Pengganti');
    await expect(page.locator('#crm-lead-body')).not.toContainText('=2+2');

    await page.locator('#crm-import-input').setInputFiles({
      name: 'too-large.json',
      mimeType: 'application/json',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 32)
    });
    await expect(page.locator('#crm-status')).toContainText('melebihi batas 5 MB');
    await expect(page.locator('#crm-lead-body')).toContainText('Brand Pengganti');
  });

  test('stays usable without page overflow across all four SAMSON themes on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}#tools/masumi-sales-crm`, { waitUntil: 'networkidle' });

    for (const theme of ['default', 'developer', 'swiss', 'pixel']) {
      await page.evaluate((id) => window.SamsonTheme.set(id), theme);
      await expect(page.locator('#tools-title')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tambah Lead', exact: true })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        htmlScroll: document.documentElement.scrollWidth,
        bodyScroll: document.body.scrollWidth
      }));
      expect(dimensions.htmlScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.bodyScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
    }

    await page.getByRole('button', { name: 'Tambah Lead', exact: true }).click();
    const dialogBox = await page.locator('#crm-lead-dialog').boundingBox();
    expect(dialogBox.width).toBeLessThanOrEqual(360);
    await expect(page.locator('#crm-lead-dialog [name="company"]')).toBeVisible();
  });
});

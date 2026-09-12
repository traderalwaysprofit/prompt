import { test, expect } from '@playwright/test';

const lead = {
  id: 'e2e-lead-1',
  leadDate: '2026-09-01',
  source: 'E2E-SOURCE',
  company: '<img src=x onerror=alert(1)> E2E Brand',
  picName: 'E2E PIC',
  picRole: '',
  decisionMakerStatus: 'Decision Maker',
  contact: '',
  city: 'Jakarta',
  ownerUserId: 'e2e-admin',
  brandStatus: 'Existing Brand',
  needs: '',
  estimatedQuantity: 100,
  potentialValue: 1000000,
  targetLaunch: '',
  pipeline: 'Qualified',
  lastContact: '',
  nextAction: 'E2E follow-up aman',
  nextActionDate: '2026-09-01',
  complianceStatus: 'Ready',
  blocker: '',
  lostReason: '',
  notes: '',
  scores: { fit: 5, readiness: 4, urgency: 4, value: 4 },
  version: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null
};

const localLead = {
  ...lead,
  owner: 'E2E Admin'
};
delete localLead.ownerUserId;
delete localLead.version;
delete localLead.deletedAt;

const json = (data, status = 200, headers = {}) => ({
  status,
  contentType: 'application/json',
  headers,
  body: JSON.stringify(data)
});

const installApi = async (page, { expired = false } = {}) => {
  await page.route('**/api/crm/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/session')) {
      await route.fulfill(expired
        ? json({ success: false, code: 'AUTHENTICATION_REQUIRED', message: 'Sesi berakhir.' }, 401)
        : json({
          success: true,
          data: { id: 'e2e-admin', email: 'admin@example.invalid', displayName: 'E2E Admin', role: 'admin' }
        }));
      return;
    }
    if (path.endsWith('/users')) {
      await route.fulfill(json({
        success: true,
        data: [
          { id: 'e2e-admin', displayName: 'E2E Admin', role: 'admin' },
          { id: 'e2e-sales', displayName: 'E2E Sales', role: 'sales' }
        ]
      }));
      return;
    }
    if (path.endsWith('/dashboard')) {
      await route.fulfill(json({
        success: true,
        data: {
          kpis: { activeLeads: 1, qualifiedRate: 100, overdueFollowUps: 1, weightedForecast: 300000 },
          followUps: [{ ...localLead, overdue: true }]
        }
      }));
      return;
    }
    if (path.endsWith('/leads') && request.method() === 'GET') {
      await route.fulfill(json({ success: true, data: [lead], meta: { total: 1, limit: 50, offset: 0 } }));
      return;
    }
    if (path.endsWith('/imports/validate')) {
      await route.fulfill(json({
        success: true,
        data: {
          schema: 'samson.masumi-crm.backup', version: 1, total: 1, valid: 1,
          invalid: 0, duplicateFile: 0, duplicateTarget: 0, targetMatches: 0,
          finalCount: 2, sourceOwners: ['E2E Legacy'], checksum: 'a'.repeat(64),
          canCommit: true, errors: []
        }
      }));
      return;
    }
    if (path.endsWith('/imports/commit')) {
      await route.fulfill(json({
        success: true,
        data: {
          jobId: 'e2e-import-job', mode: 'append', rowCount: 1,
          committedAt: '2026-09-08T00:00:00.000Z', idempotent: false
        }
      }, 201));
      return;
    }
    if (path.endsWith('/exports/backup.json')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Disposition': 'attachment; filename="masumi-crm-backup.json"' },
        body: JSON.stringify({ schema: 'samson.masumi-crm.backup', version: 1, leads: [localLead] })
      });
      return;
    }
    if (path.endsWith('/exports/leads.csv')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: { 'Content-Disposition': 'attachment; filename="masumi-crm-leads.csv"' },
        body: '"Company"\r\n"E2E Brand"\r\n'
      });
      return;
    }
    await route.fulfill(json({ success: false, code: 'E2E_NOT_FOUND', message: 'Mock tidak tersedia.' }, 404));
  });
};

test('dashboard, follow-up, themes, safe rendering, import, and export work', async ({ page }) => {
  await installApi(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Lead Register', level: 1 })).toBeVisible();
  await expect(page.locator('#kpi-active')).toHaveText('1');
  await expect(page.locator('#kpi-qualified')).toHaveText('100%');
  await expect(page.locator('#kpi-overdue')).toHaveText('1');
  await expect(page.locator('#kpi-forecast')).toContainText('300.000');
  await expect(page.locator('#lead-rows').getByText('<img src=x onerror=alert(1)> E2E Brand')).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);

  await page.getByRole('tab', { name: /Follow-up/ }).click();
  await expect(page.locator('#follow-up-list').getByText('E2E follow-up aman')).toBeVisible();
  await expect(page.locator('.follow-up-card')).toHaveClass(/is-overdue/);

  for (const theme of ['default', 'developer', 'swiss', 'pixel']) {
    await page.locator('#theme-select').selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  await page.getByRole('tab', { name: 'Lead Register' }).click();
  await page.getByRole('button', { name: 'Impor JSON' }).click();
  await page.locator('#import-file').setInputFiles({
    name: 'e2e-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      schema: 'samson.masumi-crm.backup',
      version: 1,
      leads: [{ id: 'e2e-import-1', company: 'E2E Import', picName: 'E2E PIC', owner: 'E2E Legacy' }]
    }))
  });
  await expect(page.locator('#owner-mappings select')).toHaveCount(1);
  await page.getByRole('button', { name: 'Validasi file' }).click();
  await expect(page.locator('#preview-valid')).toHaveText('1');
  await expect(page.locator('#commit-import')).toBeEnabled();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#commit-import').click();
  await expect(page.locator('#app-status-copy')).toContainText('Backup lokal tidak dihapus');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Backup JSON' }).click()
  ]);
  expect(download.suggestedFilename()).toBe('masumi-crm-backup.json');

  expect(await page.evaluate(() => localStorage.getItem('samsonMasumiCrmV1'))).toBeNull();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test('expired Access session shows a recoverable state', async ({ page }) => {
  await installApi(page, { expired: true });
  await page.goto('/');
  await expect(page.locator('#app-status-copy')).toContainText('Sesi login tidak ditemukan atau sudah berakhir');
  await expect(page.locator('#retry-app')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Keluar' })).toHaveAttribute('href', '/cdn-cgi/access/logout');
});

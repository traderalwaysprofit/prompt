import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const candidatePayload = {
  schemaVersion: 1,
  requestId: 'test-request',
  model: 'mock',
  groundingSources: [{ type: 'web', label: 'Official source', url: 'https://example.com/source', verifiedAt: '2026-09-02T00:00:00.000Z', confidence: null }],
  candidates: [{
    brand: '<img src=x onerror=window.__b2bXss=1>Klinik Aman',
    company: 'PT Klinik Aman',
    category: 'aesthetic-clinic',
    region: 'Mojokerto',
    address: 'Jl. Contoh 1, Mojokerto',
    website: 'https://example.com/',
    instagram: 'klinikaman',
    phone: '6281234567890',
    confidence: 0.91,
    sources: [{ type: 'web', label: 'Official source', url: 'https://example.com/source', verifiedAt: '2026-09-02T00:00:00.000Z', confidence: null }]
  }]
};

test.describe('SAMSON B2B Prospecting V1', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/tools/b2b/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready', configured: true, provider: 'gemini', schemaVersion: 1 }) }));
    await page.route('**/api/tools/b2b/search', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(candidatePayload) }));
    await page.route('**/api/tools/b2b/enrich', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(candidatePayload) }));
  });

  test('opens as the second Tools Hub module and reviews AI candidates before save', async ({ page }) => {
    await page.goto(`${BASE_URL}#tools`, { waitUntil: 'networkidle' });
    await expect(page.locator('.tools-count-pill')).toContainText('2 tool tersedia');
    await expect(page.locator('[data-tool-id="google-contacts"]')).toBeVisible();
    await expect(page.locator('[data-tool-id="b2b-prospecting"]')).toBeVisible();

    await page.locator('[data-tool-id="b2b-prospecting"]').click();
    await expect(page.locator('#tools')).toHaveAttribute('data-tools-view', 'b2b-prospecting');
    await expect(page.locator('#tools-title')).toHaveText('B2B Prospecting');
    await expect(page.locator('#b2b-ai-badge')).toHaveText('AI Ready');
    await expect(page.locator('#b2b-stat-total')).toHaveText('0');

    await page.locator('#b2b-search-button').click();
    await expect(page.locator('#b2b-candidate-list .b2b-candidate-card')).toHaveCount(1);
    await expect(page.locator('#b2b-candidate-list img')).toHaveCount(0);
    expect(await page.evaluate(() => globalThis.__b2bXss)).toBeUndefined();
    await expect(page.locator('#b2b-stat-total')).toHaveText('0');

    await page.locator('#b2b-save-candidates').click();
    await expect(page.locator('#b2b-stat-total')).toHaveText('1');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('samson:b2b-prospecting:leads:v1') || '[]'));
    expect(stored).toHaveLength(1);
    expect(stored[0].phone).toBe('+6281234567890');

    await page.locator('[data-b2b-tab="leads"]').click();
    await expect(page.locator('#b2b-lead-body tr')).toHaveCount(1);
    await expect(page.locator('#b2b-lead-body img')).toHaveCount(0);
  });

  test('prevents exact duplicates, supports enrichment review, and creates a visit brief', async ({ page }) => {
    await page.goto(`${BASE_URL}#tools/b2b-prospecting`, { waitUntil: 'networkidle' });
    await page.locator('#b2b-search-button').click();
    await page.locator('#b2b-save-candidates').click();

    await page.locator('[data-b2b-tab="search"]').click();
    await page.locator('#b2b-search-button').click();
    const duplicateCard = page.locator('#b2b-candidate-list .b2b-candidate-card');
    await expect(duplicateCard).toHaveAttribute('data-duplicate', 'exact');
    await expect(duplicateCard.locator('.b2b-candidate-check')).toBeDisabled();

    await page.locator('[data-b2b-tab="enrich"]').click();
    await page.locator('#b2b-enrich-input').fill('Brand A - PT A Mojokerto');
    await page.locator('#b2b-enrich-button').click();
    await expect(page.locator('#b2b-enrich-list .b2b-candidate-card')).toHaveCount(1);

    await page.locator('[data-b2b-tab="route"]').click();
    await page.locator('.b2b-route-check').check();
    await page.locator('#b2b-generate-brief').click();
    await expect(page.locator('#b2b-brief-output')).toHaveValue(/BRIEF KUNJUNGAN SALES B2B/);
    await expect(page.locator('#b2b-open-maps')).toHaveAttribute('href', /google\.com\/maps/);
    await expect(page.locator('#b2b-open-wa')).toHaveAttribute('href', /wa\.me/);
  });

  test('imports CSV through review and remains usable on compact mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}#tools/b2b-prospecting`, { waitUntil: 'networkidle' });
    await page.locator('[data-b2b-tab="leads"]').click();

    const source = [
      'Brand,Perusahaan,Kategori,Wilayah,Alamat,Website,Instagram,WhatsApp,Status,Catatan',
      'Klinik Import,PT Import,aesthetic-clinic,Surabaya,Jl Import,https://import.example,@importclinic,081234567899,new,Prospek import',
      '<img src=x onerror=window.__b2bImportXss=1>,PT X,,Gresik,,,,081234567898,new,unsafe text'
    ].join('\n');
    await page.locator('#b2b-import-file').setInputFiles({ name: 'prospects.csv', mimeType: 'text/csv', buffer: Buffer.from(source) });
    await expect(page.locator('#b2b-import-review')).toBeVisible();
    await expect(page.locator('#b2b-import-body tr')).toHaveCount(2);
    await expect(page.locator('#b2b-import-body img')).toHaveCount(0);
    expect(await page.evaluate(() => globalThis.__b2bImportXss)).toBeUndefined();
    await page.locator('#b2b-confirm-import').click();
    await expect(page.locator('#b2b-stat-total')).toHaveText('2');

    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, htmlScroll: document.documentElement.scrollWidth, bodyScroll: document.body.scrollWidth }));
    expect(dimensions.htmlScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.bodyScroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  });

  test('keeps local workflows available when the AI gateway is not configured', async ({ page }) => {
    await page.unroute('**/api/tools/b2b/health');
    await page.route('**/api/tools/b2b/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready', configured: false, provider: 'gemini', schemaVersion: 1 }) }));
    await page.goto(`${BASE_URL}#tools/b2b-prospecting`, { waitUntil: 'networkidle' });
    await expect(page.locator('#b2b-ai-badge')).toHaveText('AI Setup Required');
    await expect(page.locator('#b2b-search-button')).toBeDisabled();
    await page.locator('[data-b2b-tab="leads"]').click();
    await expect(page.locator('#b2b-import-button')).toBeEnabled();
    await expect(page.locator('#b2b-template-button')).toBeEnabled();
  });
});

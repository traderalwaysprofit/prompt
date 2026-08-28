import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

test.describe('SAMSON trading workflows', () => {
  test('publishes three educational trading workflows with eight steps each', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/data/workflows-trading.json');
    expect(response.ok()).toBeTruthy();
    const workflows = await response.json();

    expect(workflows).toHaveLength(3);
    expect(workflows.map((item) => item.title)).toEqual([
      'Analyze XAU/USD',
      'Analyze Forex Market',
      'Build a Trading System'
    ]);
    for (const workflow of workflows) {
      expect(workflow.group).toBe('Trading');
      expect(workflow.badge).toBe('EDUCATIONAL ANALYSIS');
      expect(workflow.status).toBe('active');
      expect(workflow.steps).toHaveLength(8);
      expect(workflow.steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
  });

  test('catalog reports nine workflows and exposes group filters', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page.locator('[data-catalog-stat="workflows"]')).toHaveText('9');
    await expect(page.locator('#workflow-choice .choice-feature strong')).toHaveText('9 Ready-to-run Workflows');
    await expect(page.getByRole('button', { name: /Lihat 6 Workflow \+ 3 Trading/ })).toBeVisible();

    await page.getByRole('button', { name: /Lihat 6 Workflow \+ 3 Trading/ }).click();
    await expect(page.locator('.workflow-filters')).toBeVisible();
    await expect(page.locator('[data-workflow-filter]')).toHaveCount(7);
    await expect(page.locator('.workflow-catalog-card')).toHaveCount(6);
    await expect(page.locator('.trading-workflow-card')).toHaveCount(3);

    await page.locator('[data-workflow-filter="trading"]').click();
    await expect(page.locator('#workflow-catalog-grid')).toBeHidden();
    await expect(page.locator('#trading-workflow-group')).toBeVisible();
    await expect(page.locator('.trading-workflow-card')).toHaveCount(3);
    await expect(page.locator('.education-badge')).toContainText('EDUCATIONAL ANALYSIS');
  });

  test('Analyze XAU/USD runs as an eight-step educational decision-support workflow', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Lihat 6 Workflow \+ 3 Trading/ }).click();
    await page.locator('[data-workflow-filter="trading"]').click();

    const xauCard = page.locator('.trading-workflow-card').filter({ hasText: 'Analyze XAU/USD' });
    await xauCard.getByRole('button', { name: 'Mulai Analyze XAU/USD' }).click();

    const detail = page.locator('#cheatcode-detail[data-trading-detail="analyze-xauusd"]');
    await expect(detail).toBeVisible();
    await expect(detail.getByRole('heading', { name: 'Analyze XAU/USD' })).toBeVisible();
    await expect(detail.locator('.workflow-step-tab')).toHaveCount(8);
    await expect(detail.locator('.workflow-content')).toContainText('Market Context');
    await expect(detail.getByRole('button', { name: 'Copy prompt /xauanalysis' })).toBeVisible();
    await expect(detail).toContainText('EDUCATIONAL ANALYSIS');

    await detail.getByRole('button', { name: 'Complete & Next' }).click();
    await expect(detail.locator('.workflow-content')).toContainText('Higher Timeframe Bias');
    await expect(detail.locator('.workflow-progress-label')).toContainText('1/8');
    await expect(page).toHaveURL(/#cheatcodes\/analyze-xauusd\/step-2$/);
  });

  test('Forex and Trading System workflows are available from Trading filter', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Lihat 6 Workflow \+ 3 Trading/ }).click();
    await page.locator('[data-workflow-filter="trading"]').click();

    await expect(page.locator('.trading-workflow-card').filter({ hasText: 'Analyze Forex Market' })).toBeVisible();
    await expect(page.locator('.trading-workflow-card').filter({ hasText: 'Build a Trading System' })).toBeVisible();
  });
});

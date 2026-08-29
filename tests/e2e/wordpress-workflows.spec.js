import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';
const workflowChoiceButton = (page) => page.locator('#workflow-choice [data-show-workflows]');

test.describe('SAMSON WordPress workflows', () => {
  test('publishes three WordPress workflows with eight steps each', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/data/workflows-wordpress.json');
    expect(response.ok()).toBeTruthy();
    const workflows = await response.json();

    expect(workflows).toHaveLength(3);
    expect(workflows.map((item) => item.title)).toEqual([
      'Build a WordPress Website',
      'Build a WooCommerce Store',
      'Audit & Optimize WordPress'
    ]);
    for (const workflow of workflows) {
      expect(workflow.group).toBe('WordPress');
      expect(workflow.status).toBe('active');
      expect(workflow.steps).toHaveLength(8);
      expect(workflow.steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
  });

  test('WordPress filter isolates three production workflows', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await workflowChoiceButton(page).click();
    await page.locator('[data-workflow-filter="wordpress"]').click();

    await expect(page.locator('#workflow-catalog-grid')).toBeHidden();
    await expect(page.locator('#wordpress-workflow-group')).toBeVisible();
    await expect(page.locator('#trading-workflow-group')).toBeHidden();
    await expect(page.locator('.wordpress-workflow-card')).toHaveCount(3);
    await expect(page.locator('.wordpress-workflow-card').filter({ hasText: 'Build a WordPress Website' })).toBeVisible();
    await expect(page.locator('.wordpress-workflow-card').filter({ hasText: 'Build a WooCommerce Store' })).toBeVisible();
    await expect(page.locator('.wordpress-workflow-card').filter({ hasText: 'Audit & Optimize WordPress' })).toBeVisible();
  });

  test('Build a WordPress Website connects to /wordpress and persists progress', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await workflowChoiceButton(page).click();
    await page.locator('[data-workflow-filter="wordpress"]').click();

    const card = page.locator('.wordpress-workflow-card').filter({ hasText: 'Build a WordPress Website' });
    await card.getByRole('button', { name: 'Mulai Build a WordPress Website' }).click();

    const detail = page.locator('#cheatcode-detail[data-wordpress-detail="build-wordpress-site"]');
    await expect(detail).toBeVisible();
    await expect(detail.getByRole('heading', { name: 'Build a WordPress Website' })).toBeVisible();
    await expect(detail.locator('.workflow-step-tab')).toHaveCount(8);
    await expect(detail.locator('.workflow-content')).toContainText('Define Website Goal');
    await expect(detail.getByRole('button', { name: 'Copy prompt /wordpress' })).toBeVisible();

    await detail.getByRole('button', { name: 'Complete & Next' }).click();
    await expect(detail.locator('.workflow-content')).toContainText('Choose WordPress Architecture');
    await expect(detail.locator('.workflow-progress-label')).toContainText('1/8');
    await expect(page).toHaveURL(/#cheatcodes\/build-wordpress-site\/step-2$/);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#cheatcode-detail[data-wordpress-detail="build-wordpress-site"] .workflow-content')).toContainText('Choose WordPress Architecture');
    await expect(page.locator('#cheatcode-detail[data-wordpress-detail="build-wordpress-site"] .workflow-progress-label')).toContainText('1/8');
  });

  test('WooCommerce and WordPress audit use dedicated commands', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await workflowChoiceButton(page).click();
    await page.locator('[data-workflow-filter="wordpress"]').click();

    const woo = page.locator('.wordpress-workflow-card').filter({ hasText: 'Build a WooCommerce Store' });
    await woo.getByRole('button', { name: 'Mulai Build a WooCommerce Store' }).click();
    await expect(page.locator('#cheatcode-detail')).toContainText('/woocommerce');

    await page.locator('[data-workflow-filter="wordpress"]').click();
    const audit = page.locator('.wordpress-workflow-card').filter({ hasText: 'Audit & Optimize WordPress' });
    await audit.getByRole('button', { name: 'Mulai Audit & Optimize WordPress' }).click();
    await expect(page.locator('#cheatcode-detail')).toContainText('/wpaudit');
  });
});

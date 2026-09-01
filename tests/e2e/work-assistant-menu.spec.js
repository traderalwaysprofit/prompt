import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const completeOnboarding = async (page) => {
  await page.addInitScript(() => localStorage.setItem('samsonOnboardingCompleted', 'true'));
};

const openWorkflows = async (page) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Lihat \d+ Workflow/ }).click();
  await expect(page.locator('#workflow-catalog')).toBeVisible();
};

const openAssistant = async (page) => {
  await openWorkflows(page);
  await page.getByRole('tab', { name: 'Work Assistant' }).click();
  await expect(page.locator('#work-assistant')).toBeVisible();
};

test.describe('SAMSON Work Assistant menu', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test('menu data exposes seven work areas and ten WhatsApp problems', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/data/work-assistant.json`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.menus).toHaveLength(7);
    expect(data.whatsappProblems).toHaveLength(10);
    expect(data.menus.find((item) => item.id === 'whatsapp-broadcast')?.status).toBe('pilot');
    expect(data.menus.filter((item) => item.status === 'planned')).toHaveLength(6);
  });

  test('Workflows keeps Guided Workflows and Work Assistant as sub-modes', async ({ page }) => {
    await openWorkflows(page);
    const tabs = page.locator('.workflow-mode-tab');
    await expect(tabs).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'Guided Workflows' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Work Assistant' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#workflow-catalog-grid')).toBeVisible();
    await expect(page.locator('#work-assistant')).toBeHidden();
  });

  test('Work Assistant displays seven work-problem menus without changing top navigation', async ({ page }) => {
    await openAssistant(page);
    await expect(page).toHaveURL(/#work-assistant$/);
    await expect(page.getByRole('heading', { name: 'Pilih masalah pekerjaan yang ingin diselesaikan' })).toBeVisible();
    await expect(page.locator('[data-work-assistant-card]')).toHaveCount(7);
    await expect(page.locator('#workflow-catalog-grid')).toBeHidden();
    await expect(page.locator('.workflow-catalog-header')).toBeHidden();
    await expect(page.locator('#nav-cheatcodes')).toHaveText('Workflows');
    await expect(page.locator('#nav-recent')).toHaveText('Prompts');
    await expect(page.locator('#nav-more')).toContainText('More');
  });

  test('WhatsApp Broadcast opens ten problem types while planned work areas remain non-actionable', async ({ page }) => {
    await openAssistant(page);
    const whatsapp = page.locator('[data-work-assistant-card="whatsapp-broadcast"]');
    await whatsapp.getByRole('button', { name: 'Buka WhatsApp Broadcast' }).click();
    await expect(page).toHaveURL(/#work-assistant\/whatsapp-broadcast$/);
    await expect(page.getByRole('heading', { name: 'WhatsApp Broadcast' })).toBeVisible();
    await expect(page.locator('[data-work-problem]')).toHaveCount(10);
    await expect(page.getByRole('button', { name: 'Promo', exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'B2B Outreach', exact: false })).toBeVisible();

    await page.getByRole('button', { name: /Work Assistant/ }).click();
    await expect(page.locator('[data-work-assistant-card="email"] button')).toHaveCount(0);
    await expect(page.locator('[data-work-assistant-card="customer-support"] button')).toHaveCount(0);
  });

  test('selecting a WhatsApp problem stores the choice in the route and selected state', async ({ page }) => {
    await openAssistant(page);
    await page.locator('[data-open-work-assistant="whatsapp-broadcast"]').click();
    const promo = page.locator('[data-work-problem="promo"]');
    await promo.click();
    await expect(page).toHaveURL(/#work-assistant\/whatsapp-broadcast\/promo$/);
    await expect(promo).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.work-problem-selection')).toContainText('Promo');
    await expect(page.locator('.work-problem-selection')).toContainText('Workflow AI akan dibangun pada tahap berikutnya');
  });

  test('deep link restores WhatsApp Broadcast and the selected problem', async ({ page }) => {
    await page.goto(`${BASE_URL}/#work-assistant/whatsapp-broadcast/b2b-outreach`, { waitUntil: 'networkidle' });
    await expect(page.locator('#workflow-catalog')).toBeVisible();
    await expect(page.locator('#work-assistant')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Work Assistant' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-work-problem="b2b-outreach"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.work-problem-selection')).toContainText('B2B Outreach');
  });

  test('Work Assistant remains usable in all four personalities', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openAssistant(page);
    for (const theme of ['default', 'developer', 'swiss', 'pixel']) {
      await page.evaluate((value) => window.SamsonTheme.set(value), theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('#work-assistant')).toBeVisible();
      await expect(page.locator('[data-work-assistant-card]')).toHaveCount(7);
    }
    expect(errors).toEqual([]);
  });

  test('mobile menu cards have safe touch targets and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAssistant(page);
    const assistantTab = page.getByRole('tab', { name: 'Work Assistant' });
    const openButton = page.locator('[data-open-work-assistant="whatsapp-broadcast"]');
    const sizes = await Promise.all([assistantTab, openButton].map((locator) => locator.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    })));
    expect(sizes.every((size) => size.height >= 44)).toBeTruthy();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await openButton.click();
    const problem = page.locator('[data-work-problem="follow-up"]');
    const problemHeight = await problem.evaluate((element) => element.getBoundingClientRect().height);
    expect(problemHeight).toBeGreaterThanOrEqual(44);
    const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(detailOverflow).toBeLessThanOrEqual(1);
  });
});

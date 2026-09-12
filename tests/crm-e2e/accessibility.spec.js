import { test, expect } from '@playwright/test';

test.describe('MASUMI CRM accessibility gate', () => {
  test('workspace uses complete tab semantics and keyboard navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const tablist = page.getByRole('tablist', { name: 'Area kerja CRM' });
    await expect(tablist).toBeVisible();

    const register = page.getByRole('tab', { name: 'Lead Register' });
    const followUp = page.getByRole('tab', { name: /Follow-up/ });

    await expect(register).toHaveAttribute('aria-controls', 'register');
    await expect(followUp).toHaveAttribute('aria-controls', 'follow-up');
    await expect(register).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#register')).toHaveAttribute('role', 'tabpanel');
    await expect(page.locator('#follow-up')).toHaveAttribute('role', 'tabpanel');

    await register.focus();
    await page.keyboard.press('ArrowRight');
    await expect(followUp).toBeFocused();
    await expect(followUp).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#follow-up')).toBeVisible();

    await page.keyboard.press('Home');
    await expect(register).toBeFocused();
    await expect(register).toHaveAttribute('aria-selected', 'true');
  });

  test('native dialogs have accessible names', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#lead-dialog')).toHaveAttribute('aria-labelledby', 'form-title');
    await expect(page.locator('#import-dialog')).toHaveAttribute('aria-labelledby', 'import-title');
    await expect(page.getByRole('button', { name: 'Tutup form' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Tutup impor' })).toHaveCount(1);
  });
});

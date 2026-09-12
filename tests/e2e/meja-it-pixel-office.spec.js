import { test, expect } from '@playwright/test';

test.describe('MEJA-IT Pixel Office', () => {
  test('keeps desktop simulator and exposes a playable pixel office', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/src/games/meja-it/', { waitUntil:'networkidle' });
    const female = page.getByRole('radio', { name:/WANITA/ });
    await female.click();
    await expect(female).toHaveAttribute('aria-checked','true');
    await expect(page.getByRole('radio', { name:/PRIA/ })).toHaveAttribute('aria-checked','false');
    await page.getByRole('button', { name:'MULAI SHIFT' }).click();

    await expect(page.locator('#scrGame')).toBeVisible();
    await page.getByRole('button', { name:'PIXEL OFFICE' }).click();
    await expect(page.locator('#pixelOffice')).toBeVisible();
    await expect(page.locator('#opsMonitor')).toBeHidden();
    await expect(page.locator('#pixelOfficeCanvas')).toBeVisible();
    await expect(page.locator('#pixelOfficeCanvas')).toHaveAttribute('data-character','female');
    expect(await page.evaluate(() => localStorage.getItem('mejait_character'))).toBe('female');

    const before = Number(await page.locator('#pixelOfficeCanvas').getAttribute('data-player-x'));
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    await expect.poll(async () => Number(await page.locator('#pixelOfficeCanvas').getAttribute('data-player-x'))).toBeGreaterThan(before);

    await page.getByRole('button', { name:'MONITOR', exact:true }).click();
    await expect(page.locator('#opsMonitor')).toBeVisible();
    await expect(page.locator('#pixelOffice')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('mobile defaults to Pixel Office and touch controls move the technician', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile control contract');

    await page.goto('/src/games/meja-it/', { waitUntil:'networkidle' });
    await page.getByRole('button', { name:'MULAI SHIFT' }).click();

    await expect(page.locator('#pixelOffice')).toBeVisible();
    await expect(page.locator('.pixel-office-controls')).toBeVisible();

    const canvas = page.locator('#pixelOfficeCanvas');
    const before = Number(await canvas.getAttribute('data-player-x'));
    const right = page.getByRole('button', { name:'Berjalan ke kanan' });
    await right.dispatchEvent('pointerdown', { pointerId:1 });
    await page.waitForTimeout(280);
    await right.dispatchEvent('pointerup', { pointerId:1 });
    await expect.poll(async () => Number(await canvas.getAttribute('data-player-x'))).toBeGreaterThan(before);

    await expect(page.locator('#pixelOfficeStatus')).toContainText(/Tiket #TKT-|Shift dimulai|Jelajahi kantor/, { timeout:5000 });

    const bodyWidth = await page.locator('body').evaluate((body) => ({
      scrollWidth:body.scrollWidth,
      clientWidth:body.clientWidth
    }));
    expect(bodyWidth.scrollWidth).toBeLessThanOrEqual(bodyWidth.clientWidth + 1);
  });
});

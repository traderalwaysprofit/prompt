import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://samson.web.id';

const box = async (locator) => {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value;
};

const inside = (child, parent, tolerance = 1) => (
  child.x >= parent.x - tolerance
  && child.y >= parent.y - tolerance
  && child.x + child.width <= parent.x + parent.width + tolerance
  && child.y + child.height <= parent.y + parent.height + tolerance
);

test.describe('SAMSON choose-path card layout', () => {
  test('hero path card keeps title, subtitle, and footer separated', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const card = page.locator('.hero-card');
    const title = card.locator('h3');
    const subtitle = card.locator('p');
    const footer = card.locator('.hero-card-footer');

    const [cardBox, titleBox, subtitleBox, footerBox] = await Promise.all([
      box(card), box(title), box(subtitle), box(footer)
    ]);

    expect(inside(titleBox, cardBox)).toBeTruthy();
    expect(inside(subtitleBox, cardBox)).toBeTruthy();
    expect(inside(footerBox, cardBox)).toBeTruthy();
    expect(titleBox.y + titleBox.height).toBeLessThanOrEqual(subtitleBox.y + 1);
    expect(subtitleBox.y + subtitleBox.height).toBeLessThanOrEqual(footerBox.y + 1);

    const typography = await title.evaluate((element) => {
      const style = getComputedStyle(element);
      return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
    });
    expect(typography.lineHeight).toBeGreaterThanOrEqual(typography.fontSize * 1.04);
  });

  test('both chooser cards keep content blocks in normal flow without collisions', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const cards = page.locator('.choice-card');
    await expect(cards).toHaveCount(2);

    for (let index = 0; index < 2; index += 1) {
      const card = cards.nth(index);
      const title = card.locator('h3');
      const description = card.locator(':scope > p');
      const feature = card.locator('.choice-feature');
      const action = card.locator('.choice-action');

      const [cardBox, titleBox, descriptionBox, featureBox, actionBox] = await Promise.all([
        box(card), box(title), box(description), box(feature), box(action)
      ]);

      for (const childBox of [titleBox, descriptionBox, featureBox, actionBox]) {
        expect(inside(childBox, cardBox)).toBeTruthy();
      }
      expect(titleBox.y + titleBox.height).toBeLessThanOrEqual(descriptionBox.y + 1);
      expect(descriptionBox.y + descriptionBox.height).toBeLessThanOrEqual(featureBox.y + 1);
      expect(featureBox.y + featureBox.height).toBeLessThanOrEqual(actionBox.y + actionBox.height);
    }
  });
});

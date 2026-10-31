import { expect, test } from '@playwright/test';

test('mobile: bottom nav, no horizontal overflow, playable board', async ({ page }) => {
  for (const path of ['/', '/daily', '/unlimited', '/leaderboards', '/achievements', '/settings']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page.goto('/play/tango?mode=unlimited&difficulty=easy');
  const cell = page.locator('[role="grid"] [data-r="0"]').first();
  await expect(cell).toBeVisible();
  const box = await cell.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(36); // comfortably tappable
});

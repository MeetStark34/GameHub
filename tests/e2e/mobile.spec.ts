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

  // Playing created a guest: both streaks fit in the mobile header, and the explainer opens.
  await page.goto('/dashboard');
  const streaks = page.getByTestId('header-streaks');
  await expect(streaks.locator('[data-streak="normal"]')).toBeVisible();
  await expect(streaks.locator('[data-streak="true-player"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /^Streaks:/ }).click();
  const dialog = page.getByRole('dialog', { name: /^Streaks:/ });
  await expect(dialog.getByText('All 8 Daily games a day')).toBeVisible();
  const d = await dialog.boundingBox();
  expect(d!.x).toBeGreaterThanOrEqual(0); // popover stays on screen
  expect(d!.x + d!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('mobile: Queens Auto X toggle fits and works, guest warning fits', async ({ page }) => {
  await page.goto('/play/queens?mode=unlimited&difficulty=expert');
  const toggle = page.getByRole('button', { name: /Auto X/ });
  await expect(toggle).toBeVisible();
  const b = await toggle.boundingBox();
  expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const crown = page.locator('[role="grid"] [data-r="4"][data-c="4"]');
  await crown.click();
  await crown.click();
  await expect(page.locator('[role="grid"] [data-auto-x]').first()).toBeVisible();
  await expect(page.getByRole('note', { name: 'Temporary guest account' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

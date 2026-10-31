import { test } from '@playwright/test';
const OUT = process.env.SHOTS_DIR!;
test.skip(!OUT, 'screenshots only on demand');
test('screens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/'); await page.screenshot({ path: `${OUT}/landing.png`, fullPage: true });
  for (const g of ['queens', 'zip', 'patches', 'tango', 'werd', 'pinpoint', 'crossclimb', 'sudoku']) {
    await page.goto(`/play/${g}?mode=unlimited&difficulty=normal`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/play-${g}.png` });
  }
  await page.goto('/dashboard'); await page.screenshot({ path: `${OUT}/dashboard.png`, fullPage: true });
  await page.goto('/settings'); await page.getByRole('radio', { name: /Tokyo Night/ }).click(); await page.waitForTimeout(300);
  await page.goto('/play/queens?mode=unlimited&difficulty=hard'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/queens-tokyo.png` });
  await page.goto('/achievements'); await page.screenshot({ path: `${OUT}/achievements-tokyo.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard'); await page.screenshot({ path: `${OUT}/mobile-dashboard.png`, fullPage: true });
  await page.goto('/play/zip?mode=unlimited&difficulty=hard'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/mobile-zip.png` });
});

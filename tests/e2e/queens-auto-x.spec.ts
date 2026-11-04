import { expect, test, type Page } from '@playwright/test';
import { queensBlockedCells, solveQueens } from '../../src/games/queens/logic';
import type { QueensPuzzle } from '../../src/games/queens/types';

/** Queens Auto X and the guest-account warning, in a real browser. */
test.describe.configure({ mode: 'serial' });

async function openQueens(page: Page, difficulty = 'easy') {
  const res = page.waitForResponse((r) => r.url().endsWith('/api/play/start') && r.request().method() === 'POST');
  await page.goto(`/play/queens?mode=unlimited&difficulty=${difficulty}`);
  const view = await (await res).json();
  return view.puzzle as QueensPuzzle;
}

const cell = (page: Page, r: number, c: number) => page.getByRole('grid', { name: 'Place crowns' }).locator(`[data-r="${r}"][data-c="${c}"]`);
const autoCount = (page: Page) => page.getByRole('grid', { name: 'Place crowns' }).locator('[data-auto-x]').count();

test('guest sees the 12-hour deletion warning while playing', async ({ page }) => {
  await openQueens(page);
  const note = page.getByRole('note', { name: 'Temporary guest account' });
  await expect(note).toContainText('Guest accounts are temporary and will be automatically deleted after 12 hours.');
  await expect(note).toContainText('Create a registered account to keep your progress.');
  // After the first move created the guest, the exact deletion time (UTC) is shown.
  await page.reload();
  await expect(note).toContainText(/Scheduled for deletion at \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/);
  await page.goto('/dashboard');
  await expect(page.getByRole('note', { name: 'Temporary guest account' })).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('note', { name: 'Temporary guest account' })).toBeVisible();
});

test('Auto X: marks row, column, region and neighbours; recalculates; keeps manual marks', async ({ page }) => {
  const puzzle = await openQueens(page);
  const sol = solveQueens(puzzle)!;
  const toggle = page.getByRole('button', { name: /Auto X/ });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // OFF: a crown adds no automatic marks (existing behaviour).
  await cell(page, 0, sol[0]).click();
  await cell(page, 0, sol[0]).click();
  await expect(cell(page, 0, sol[0])).toHaveAccessibleName(/crown/);
  expect(await autoCount(page)).toBe(0);
  await cell(page, 0, sol[0]).click(); // crown -> empty

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toContainText('On');

  // A manual X on a cell the crown will also block.
  const manual: [number, number] = [0, (sol[0] + 2) % puzzle.size]; // same row as the crown
  await cell(page, ...manual).click();
  await expect(cell(page, ...manual)).toHaveAccessibleName(/marked empty$/);

  await cell(page, 0, sol[0]).click();
  await cell(page, 0, sol[0]).click();
  const expected = queensBlockedCells(puzzle, [[0, sol[0]]]);
  expected.delete(`${manual[0]},${manual[1]}`); // shown as the player's own mark
  expect(await autoCount(page)).toBe(expected.size);
  for (const k of expected) {
    const [r, c] = k.split(',').map(Number);
    await expect(cell(page, r, c)).toHaveAccessibleName(/marked empty automatically/);
  }
  await expect(cell(page, 0, sol[0])).toHaveAccessibleName(/crown/);

  // Removing the crown clears the automatic marks; the manual one survives.
  await cell(page, 0, sol[0]).click();
  expect(await autoCount(page)).toBe(0);
  await expect(cell(page, ...manual)).toHaveAccessibleName(/marked empty$/);

  // Survives a reload: the preference is remembered.
  await page.reload();
  await expect(page.getByRole('button', { name: /Auto X/ })).toHaveAttribute('aria-pressed', 'true');
});

test('Auto X ON: solving still validates and completes normally', async ({ page }) => {
  const puzzle = await openQueens(page);
  const sol = solveQueens(puzzle)!;
  const toggle = page.getByRole('button', { name: /Auto X/ });
  if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click();
  for (let r = 0; r < sol.length; r++) {
    if (r === sol.length - 1) await page.waitForTimeout(10_000); // plausibility floor
    await expect(cell(page, r, sol[r])).not.toHaveAccessibleName(/automatically/);
    await cell(page, r, sol[r]).click();
    await cell(page, r, sol[r]).click();
  }
  await expect(page.getByRole('heading', { name: 'Queens complete' })).toBeVisible({ timeout: 15_000 });
});

test('registered players never see the guest warning', async ({ page }) => {
  const handle = `ax${Date.now().toString(36)}`;
  await page.goto('/signup');
  await page.getByLabel('Email').fill(`${handle}@example.com`);
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Display name').fill('Auto X');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('note', { name: 'Temporary guest account' })).toHaveCount(0);
  await openQueens(page);
  await expect(page.getByRole('button', { name: /Auto X/ })).toBeVisible();
  await expect(page.getByRole('note', { name: 'Temporary guest account' })).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByRole('note', { name: 'Temporary guest account' })).toHaveCount(0);
});

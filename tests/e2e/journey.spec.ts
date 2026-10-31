import { expect, test, type Page } from '@playwright/test';
import { solveQueens } from '../../src/games/queens/logic';
import { solveSudoku } from '../../src/games/sudoku/logic';
import type { QueensPuzzle } from '../../src/games/queens/types';
import type { SudokuPuzzle } from '../../src/games/sudoku/types';

/**
 * The critical player journey, in order, on one browser context:
 * visitor → Daily game → XP/mastery/achievement/streak → account → 8/8
 * True Player → Unlimited → theme → profile.
 */
test.describe.configure({ mode: 'serial' });

let page: Page;
const handle = `e2e${Date.now().toString(36)}`;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

async function startGame(url: string) {
  const res = page.waitForResponse((r) => r.url().endsWith('/api/play/start') && r.request().method() === 'POST');
  await page.goto(url);
  const view = await (await res).json();
  expect(view.status).toBe('active');
  return view;
}

test('1. visitor opens GameHub', async () => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your daily brain training');
  await expect(page.getByText('Play. Progress. Master.').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Daily Set reset countdown' })).toBeVisible();
});

test('2-7. Daily Queens: solve, XP, mastery, achievement, streak', async () => {
  const view = await startGame('/play/queens?mode=daily');
  const puzzle = view.puzzle as QueensPuzzle;
  const sol = solveQueens(puzzle)!;
  expect(sol).not.toBeNull();
  const board = page.getByRole('grid', { name: 'Place crowns' });
  // All but the last crown, then wait past the plausibility floor.
  for (let r = 0; r < sol.length; r++) {
    if (r === sol.length - 1) await page.waitForTimeout(10_000);
    const cell = board.locator(`[data-r="${r}"][data-c="${sol[r]}"]`);
    await cell.click();
    await cell.click();
  }
  await expect(page.getByRole('heading', { name: 'Queens complete' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('XP earned')).toBeVisible();
  await expect(page.getByText('Queens mastery')).toBeVisible();
  await expect(page.getByRole('status', { name: /Achievement unlocked: First Steps/ })).toBeVisible({ timeout: 10_000 });

  await page.goto('/dashboard');
  await expect(page.getByText('1/8 done')).toBeVisible();
  const normal = page.locator('div', { has: page.getByText('Normal Streak', { exact: true }) }).first();
  await expect(normal).toContainText('1');
  await expect(page.getByText('Done today').first()).toBeVisible();
  const xp = await page.locator('header').getByText(/XP$/).first().textContent();
  expect(Number(xp!.replace(/\D/g, ''))).toBeGreaterThan(0);
});

test('guest claims account (progress kept) and becomes bootstrap admin', async () => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('admin-e2e@example.com');
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Display name').fill('Mr. Stark');
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByText('1/8 done')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Hey, Mr. Stark/ })).toBeVisible();
});

test('8-9. all eight Daily games -> True Player Streak (admin dev tool)', async () => {
  await page.goto(`/admin?q=${handle}`);
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete Daily Set' }).first().click();
  await expect(page.getByText(/Complete Daily Set: done \(7 games\)/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('complete-daily-set').first()).toBeVisible(); // audit log row
  await page.goto('/dashboard');
  await expect(page.getByText('8/8 done')).toBeVisible();
  await expect(page.getByText('Complete. True Player day secured.')).toBeVisible();
  const tp = page.locator('div', { has: page.getByText('True Player Streak', { exact: true }) }).first();
  await expect(tp).toContainText('1');
});

test('10. Unlimited Mini Sudoku works (keyboard play)', async () => {
  const view = await startGame('/play/sudoku?mode=unlimited&difficulty=easy');
  const puzzle = view.puzzle as SudokuPuzzle;
  const { solution } = solveSudoku(puzzle, puzzle.givens, 1);
  const empties: [number, number][] = [];
  puzzle.givens.forEach((row, r) => row.forEach((v, c) => !v && empties.push([r, c])));
  await page.waitForTimeout(4_000);
  for (const [r, c] of empties) {
    await page.locator(`[role="grid"] [data-r="${r}"][data-c="${c}"]`).click();
    await page.keyboard.press(String(solution![r][c]));
  }
  await expect(page.getByRole('heading', { name: 'Mini Sudoku complete' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Unlimited games build XP and mastery')).toBeVisible();
});

test('11. theme switching is global and persistent', async () => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Dracula/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
  await page.waitForTimeout(500);
  await page.goto('/leaderboards');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(33, 34, 44)');
});

test('12. public profile shows rank, streaks and mastery', async () => {
  await page.goto(`/u/${handle}`);
  await expect(page.getByRole('heading', { name: 'Mr. Stark' })).toBeVisible();
  await expect(page.getByText('True Player Sets')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Game mastery' })).toBeVisible();
  await expect(page.getByText('admin-e2e@example.com')).toHaveCount(0); // email never public
});

test('leaderboard lists the member; privacy toggle removes them', async () => {
  await page.goto('/leaderboards?board=xp');
  await expect(page.getByRole('cell', { name: /Mr. Stark/ })).toBeVisible();
  await page.goto('/settings');
  await page.getByLabel(/Appear on leaderboards/).uncheck();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
  await page.goto('/leaderboards?board=xp');
  await expect(page.getByRole('cell', { name: /Mr. Stark/ })).toHaveCount(0);
});

test('non-admins cannot reach admin', async ({ browser }) => {
  const other = await browser.newPage();
  const res = await other.goto('/admin');
  expect(res?.status()).toBe(404);
  await other.close();
});

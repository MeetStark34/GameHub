import { expect, test, type Page } from '@playwright/test';

const GAMES = ['patches', 'sudoku', 'zip', 'werd', 'pinpoint', 'crossclimb', 'tango', 'queens'];
const PASSWORD = 'correct-horse-battery-staple';
const normalHandle = `normal${Date.now().toString(36)}`;

async function signUp(page: Page, email: string, handle: string, name: string) {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Display name').fill(name);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/dashboard');
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe.configure({ mode: 'serial' });

test('every game opens and renders a valid board (Daily), with no page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const game of GAMES) {
    const res = page.waitForResponse((r) => r.url().endsWith('/api/play/start'));
    await page.goto(`/play/${game}?mode=daily`);
    expect((await res).status(), game).toBe(200);
    await expect(page.locator('main [role="grid"], main [role="application"], main ol, main input').first(), game).toBeVisible();
    await expect(page.getByText('could not be loaded')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('normal account cannot reach admin; developer account gets admin, badge and showcase', async ({ page, browser }) => {
  // A normal member (stands in for mpatel.data@gmail.com).
  await signUp(page, 'mpatel.data+e2e@example.com', normalHandle, 'Normal Player');
  expect((await page.goto('/admin'))?.status()).toBe(404);
  await page.goto('/dashboard');
  await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0);
  // Signed in, but not an admin: every admin action is refused server-side.
  for (const data of [
    { action: 'adjust-xp', userId: '00000000-0000-0000-0000-000000000000', amount: 1000 },
    { action: 'adjust-streak', userId: '00000000-0000-0000-0000-000000000000', kind: 'normal', amount: 5 },
    { action: 'set-xp-frozen', userId: '00000000-0000-0000-0000-000000000000', on: true },
    { action: 'delete-account', userId: '00000000-0000-0000-0000-000000000000', confirmHandle: 'x' },
  ])
    expect((await page.request.post('/api/admin', { headers: { Origin: 'http://localhost:3200' }, data })).status(), data.action).toBe(403);
  await signOut(page);

  // starkmeet@gmail.com is in GAMEHUB_BOOTSTRAP_ADMINS (server env), handle mstark = developer account.
  await signUp(page, 'starkmeet@gmail.com', 'mstark', 'Mr. Stark');
  expect((await page.goto('/admin'))?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Developer dashboard' })).toBeVisible();

  await page.goto('/u/mstark');
  await expect(page.getByRole('heading', { name: 'Mr. Stark' })).toBeVisible();
  await expect(page.getByText('Developer', { exact: true })).toBeVisible();
  await expect(page.getByText(/Legend/).first()).toBeVisible();
  await expect(page.getByText('Developer account. Excluded from public leaderboards.')).toBeVisible();

  // Excluded from public leaderboards server-side.
  await page.goto('/leaderboards?board=xp');
  await expect(page.getByRole('cell', { name: /Mr\. Stark/ })).toHaveCount(0);

  // Survives refresh and a "reopened browser" (new context, same cookies).
  await page.reload();
  const state = await page.context().storageState();
  const reopened = await browser.newContext({ storageState: state });
  const p2 = await reopened.newPage();
  expect((await p2.goto('/admin'))?.status()).toBe(200);
  await reopened.close();

  // Sign out, then sign back in with the password: still admin.
  await signOut(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill('starkmeet@gmail.com');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
  expect((await page.goto('/admin'))?.status()).toBe(200);

  // Tampering with client state cannot grant admin to another user.
  const other = await browser.newContext();
  const o = await other.newPage();
  await o.goto('/');
  await other.addCookies([{ name: 'gh_session', value: 'forged-token', url: 'http://localhost:3200' }]);
  expect((await o.goto('/admin'))?.status()).toBe(404);
  const api = await o.request.post('/api/admin', { headers: { Origin: 'http://localhost:3200' }, data: { action: 'adjust-xp', userId: '00000000-0000-0000-0000-000000000000', amount: 1000 } });
  expect(api.status()).toBe(403);
  await other.close();
});

test('header shows both streaks for the developer account and updates after a repair', async ({ page }) => {
  await signIn(page, 'starkmeet@gmail.com');
  const streaks = page.getByTestId('header-streaks');
  await expect(streaks.locator('[data-streak="normal"]')).toHaveText(/^365/);
  await expect(streaks.locator('[data-streak="true-player"]')).toHaveText(/^240/);
  await page.getByRole('button', { name: 'Streaks: Normal Streak 365 days, True Player Streak 240 days' }).click();
  const pop = page.getByRole('dialog', { name: /^Streaks:/ });
  await expect(pop.locator('[data-streak-row="normal"]')).toContainText('Normal Streak');
  await expect(pop.locator('[data-streak-row="normal"]')).toContainText('1+ Daily game a day');
  await expect(pop.locator('[data-streak-row="normal"]')).toContainText('365 days');
  await expect(pop.locator('[data-streak-row="true-player"]')).toContainText('All 8 Daily games a day');
  await expect(pop.locator('[data-streak-row="true-player"]')).toContainText('240 days');
  await page.keyboard.press('Escape');

  // No protection: an admin-simulated missed run breaks it, the header shows 0, a Gold Repair Card restores it.
  await page.goto('/admin?tab=users&q=mstark');
  const me = page.locator('[data-admin-user="mstark"]');
  await me.getByRole('button', { name: 'Break Normal' }).click();
  await me.getByRole('button', { name: 'Break Normal' }).click();
  await expect(me.getByRole('status')).toContainText('Break Normal streak: done');
  await page.goto('/dashboard');
  await expect(streaks.locator('[data-streak="normal"]')).toHaveText(/^0/);
  await page.getByRole('button', { name: 'Repair to 365 days' }).click();
  await page.getByRole('button', { name: 'Use card' }).click();
  await expect(streaks.locator('[data-streak="normal"]')).toHaveText(/^365/, { timeout: 10_000 });
  await page.reload();
  await expect(streaks.locator('[data-streak="normal"]')).toHaveText(/^365/);
  await expect(streaks.locator('[data-streak="true-player"]')).toHaveText(/^240/);
});

test('admin player controls: custom XP, streaks, XP freeze and account deletion', async ({ page }) => {
  await signIn(page, 'starkmeet@gmail.com');
  await page.goto(`/admin?tab=users&q=${normalHandle}`);
  const card = page.locator(`[data-admin-user="${normalHandle}"]`);
  const status = card.getByRole('status');

  // Custom XP: add, remove, and a removal larger than the total is refused.
  await card.getByLabel(/XP amount/).fill('25000');
  await card.getByRole('button', { name: 'Add XP' }).click();
  await expect(status).toContainText('Add 25,000 XP: done');
  await card.getByLabel(/XP amount/).fill('500');
  await card.getByRole('button', { name: 'Remove XP' }).click();
  await expect(status).toContainText('Remove 500 XP: done');
  const total = Number((await card.locator('p', { hasText: /^XP$/ }).locator('xpath=following-sibling::p[1]').textContent())!.replace(/\D/g, ''));
  expect(total).toBeGreaterThanOrEqual(24_500);
  await card.getByLabel(/XP amount/).fill('1000000');
  await card.getByRole('button', { name: 'Remove XP' }).click();
  await expect(status).toContainText('Cannot remove');
  await card.getByLabel(/XP amount/).fill('');
  await card.getByRole('button', { name: 'Add XP' }).click();
  await expect(status).toContainText('Enter a whole number');

  // Custom streaks.
  await card.getByLabel('Streak to adjust').selectOption('true_player');
  await card.getByLabel(/Streak days/).fill('10');
  await card.getByRole('button', { name: 'Add days' }).click();
  await expect(status).toContainText('True Player Streak +10: done (0 → 10 days)');
  await card.getByLabel(/Streak days/).fill('11');
  await card.getByRole('button', { name: 'Remove days' }).click();
  await expect(status).toContainText('Cannot remove');

  // XP freeze, with a confirmation click; persists across reload.
  await card.locator('summary', { hasText: 'Account' }).click();
  await card.getByRole('button', { name: 'Freeze XP' }).click();
  await card.getByRole('button', { name: 'Freeze XP' }).click();
  await expect(status).toContainText('Freeze XP: done');
  await page.reload();
  await expect(card.locator('p', { hasText: /^XP frozen$/ }).locator('xpath=following-sibling::p[1]')).toHaveText('ON');

  // Your own account cannot be deleted here.
  await page.goto('/admin?tab=users&q=mstark');
  await page.locator('[data-admin-user="mstark"]').locator('summary', { hasText: 'Account' }).click();
  await expect(page.locator('[data-admin-user="mstark"]').getByText('This is your account.')).toBeVisible();

  // Deletion: modal shows the target and needs the handle retyped.
  await page.goto(`/admin?tab=users&q=${normalHandle}`);
  await card.locator('summary', { hasText: 'Account' }).click();
  await card.getByRole('button', { name: 'Delete account…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete account?' });
  await expect(dialog).toContainText('Normal Player');
  await expect(dialog).toContainText(`@${normalHandle}`);
  await expect(dialog).toContainText('mpatel.data+e2e@example.com');
  const del = dialog.getByRole('button', { name: 'Delete Account' });
  await expect(del).toBeDisabled();
  await dialog.getByRole('textbox').fill('someone-else');
  await expect(del).toBeDisabled();
  await dialog.getByRole('textbox').fill(`@${normalHandle}`);
  await del.click();
  await expect(card).toHaveCount(0, { timeout: 10_000 });

  // The account is gone: its credentials no longer work, and the audit log keeps the record.
  await page.goto('/admin?tab=system');
  for (const action of ['delete-account', 'xp-freeze', 'streak-adjust', 'xp-remove', 'xp-add'])
    await expect(page.getByRole('cell', { name: action, exact: true }).first(), action).toBeVisible();
  await signOut(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill('mpatel.data+e2e@example.com');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login/);
});

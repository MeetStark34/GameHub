import { expect, test, type Page } from '@playwright/test';

const GAMES = ['patches', 'sudoku', 'zip', 'werd', 'pinpoint', 'crossclimb', 'tango', 'queens'];
const PASSWORD = 'correct-horse-battery-staple';

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
  await signUp(page, 'mpatel.data+e2e@example.com', `normal${Date.now().toString(36)}`, 'Normal Player');
  expect((await page.goto('/admin'))?.status()).toBe(404);
  await page.goto('/dashboard');
  await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0);
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
  const api = await o.request.post('/api/admin', { headers: { Origin: 'http://localhost:3200' }, data: { action: 'grant-xp', userId: '00000000-0000-0000-0000-000000000000', amount: 1000 } });
  expect(api.status()).toBe(403);
  await other.close();
});

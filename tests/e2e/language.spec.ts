import { expect, test } from '@playwright/test';

test.describe('language', () => {
  test('switching is global, persists across reloads, and English is the default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Daily Set' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Language: English/ }).click();
    await page.getByRole('radio', { name: /Français/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('votre entraînement cérébral quotidien');
    await expect(page.getByRole('link', { name: 'Illimité' }).first()).toBeVisible();

    await page.goto('/leaderboards');
    await expect(page.getByRole('heading', { name: 'Classements' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await page.getByRole('button', { name: /Langue: Français/ }).click();
    await page.getByRole('radio', { name: /हिन्दी/ }).click();
    await expect(page.getByRole('heading', { name: 'लीडरबोर्ड' })).toBeVisible();
    await page.getByRole('button', { name: /भाषा: हिन्दी/ }).click();
    await page.getByRole('radio', { name: /Русский/ }).click();
    await expect(page.getByRole('heading', { name: 'Рейтинги' })).toBeVisible();
  });

  test('server game messages are translated', async ({ page, context }) => {
    await context.addCookies([{ name: 'gh-lang', value: 'fr', url: 'http://localhost:3200' }]);
    await page.goto('/play/werd?mode=unlimited&difficulty=normal');
    await expect(page.getByText('Trouvez le mot caché')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Essais' })).toBeVisible();
    for (const k of 'zzzzz') await page.keyboard.press(k);
    await page.keyboard.press('Enter');
    await expect(page.getByText('Mot absent de la liste.')).toBeVisible();
  });

  test('browser language is used only as the first-visit fallback', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'ru-RU' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await page.getByRole('button', { name: /Язык: Русский/ }).click();
    await page.getByRole('radio', { name: /English/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en'); // explicit choice beats the browser
    await ctx.close();
  });
});

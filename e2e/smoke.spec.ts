import { test, expect } from '@playwright/test';

test('first run seeds and tabs are navigable', async ({ page }) => {
  await page.goto('/');

  // Dashboard renders the personal greeting ("Namaste, ...") plus the
  // Net Worth hero — that's how we confirm the Home tab loaded with seeded
  // appMeta in place.
  await expect(page.getByText('Namaste,', { exact: false })).toBeVisible();

  // Tab labels per the Concierge design: Home / Activity / Accounts / Settings.
  await page.getByRole('link', { name: 'Activity' }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();

  await page.getByRole('link', { name: 'Accounts' }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByText('Namaste,', { exact: false })).toBeVisible();
});

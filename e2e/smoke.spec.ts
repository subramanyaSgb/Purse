import { test, expect } from '@playwright/test';

test('first run seeds and tabs are navigable', async ({ page }) => {
  await page.goto('/');

  // Dashboard is the index route; useFirstRun seeds in the background
  // on first visit so we wait on the heading rather than racing the spinner.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Each NavLink is rendered as a <a role="link"> with the label text.
  await page.getByRole('link', { name: 'Transactions' }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();

  await page.getByRole('link', { name: 'Accounts' }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

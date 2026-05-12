import { test, expect } from '@playwright/test';

/**
 * Adds an expense via the FAB → AddTransactionSheet flow:
 * 1. Open dashboard, tap the FAB.
 * 2. The kind toggle defaults to Expense; type an exact amount.
 * 3. Pick the seeded 'Food & Drinks' category from the horizontal picker.
 * 4. Save. Activity should show the row at the top.
 */
test('FAB opens the new-transaction sheet and saves an expense', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Namaste,', { exact: false })).toBeVisible();

  // Open the sheet via the FAB.
  await page.getByRole('button', { name: 'Add transaction' }).click();
  await expect(page.getByRole('heading', { name: 'New transaction' })).toBeVisible();

  // Type an exact amount.
  await page.getByLabel('Exact amount').fill('421');

  // Pick a category. The seeded Cash account is already selected via
  // appMeta.defaultAccountId, so the category is the only required pick.
  await page.getByRole('button', { name: /^Food & Drinks$/ }).click();

  // Save.
  await page.getByRole('button', { name: /^Save expense$/ }).click();

  // The sheet should close (title gone) and the row should land on Activity.
  await expect(page.getByRole('heading', { name: 'New transaction' })).toHaveCount(0);

  // Navigate to Activity and confirm the row exists.
  await page.getByRole('link', { name: 'Activity' }).click();
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await expect(page.getByText('₹421').first()).toBeVisible();
});

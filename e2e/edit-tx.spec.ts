import { test, expect } from '@playwright/test';

/**
 * After adding a transaction, tapping it on Activity opens the detail
 * sheet. Edit changes the amount; Save lands the new value back on the
 * list. A second open + Delete (two-click confirm) removes the row.
 */
test('row tap → detail → edit + delete round-trip', async ({ page }) => {
  await page.goto('/');

  // Seed an expense via the FAB.
  await page.getByRole('button', { name: 'Add transaction' }).click();
  await page.getByLabel('Exact amount').fill('150');
  await page.getByRole('button', { name: /^Food & Drinks$/ }).click();
  await page.getByRole('button', { name: /^Save expense$/ }).click();

  // Navigate to Activity and confirm the row.
  await page.getByRole('link', { name: 'Activity' }).click();
  const row = page.getByRole('button').filter({ hasText: '₹150' }).first();
  await expect(row).toBeVisible();

  // Open detail.
  await row.click();
  await expect(page.getByText('Transaction', { exact: true })).toBeVisible();

  // Edit → bump to 250.
  await page.getByRole('button', { name: /Edit/ }).click();
  await expect(page.getByRole('heading', { name: 'Edit transaction' })).toBeVisible();
  await page.getByLabel('Exact amount').fill('250');
  await page.getByRole('button', { name: /^Save changes$/ }).click();

  // Activity now shows ₹250 instead of ₹150.
  await expect(page.getByText('₹250').first()).toBeVisible();
  await expect(page.getByText('₹150')).toHaveCount(0);

  // Reopen and delete (two-click confirm).
  await page.getByRole('button').filter({ hasText: '₹250' }).first().click();
  const deleteBtn = page.getByRole('button', { name: /^Delete$/ });
  await deleteBtn.click();
  await page.getByRole('button', { name: /^Confirm delete$/ }).click();

  // Empty state replaces the list.
  await expect(page.getByText(/No transactions/)).toBeVisible();
});

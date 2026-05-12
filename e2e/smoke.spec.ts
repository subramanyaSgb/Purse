import { test, expect } from '@playwright/test';

test('app loads dashboard at /', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

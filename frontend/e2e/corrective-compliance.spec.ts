import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('lifecycle views', () => {
  test('corrective actions are populated from the alert workflow', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/corrective-actions');
    await expect(page.getByRole('heading', { name: 'Corrective Actions' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.getByText('No corrective actions found')).toHaveCount(0);
  });

  test('compliance matrix rows render for the site', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/compliance');
    await expect(page.getByRole('heading', { name: 'Compliance' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.getByText('No compliance requirements found')).toHaveCount(0);
  });
});
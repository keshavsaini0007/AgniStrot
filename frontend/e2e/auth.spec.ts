import { test, expect } from '@playwright/test';
import { ACCOUNTS, login } from './helpers';

test.describe('auth', () => {
  test('corporate manager lands on dashboard with Administration nav', async ({ page }) => {
    await login(page, 'corporate');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toBeVisible();
  });

  test('mine official nav excludes Administration and Audit Logs', async ({ page }) => {
    await login(page, 'mineOfficial');
    await expect(page.getByRole('link', { name: 'Alerts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Corrective Actions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toHaveCount(0);
  });

  test('regulator sees audit trail but not administration', async ({ page }) => {
    await login(page, 'regulator');
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  });

  test('field officer has capture-only nav (no alerts/analytics)', async ({ page }) => {
    await login(page, 'fieldOfficer');
    await expect(page.getByRole('link', { name: 'Inspections' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Incidents' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alerts' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'AI Risk Intelligence' })).toHaveCount(0);
  });

  test('wrong password shows an error and stays on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Enter your email').fill(ACCOUNTS.mineOfficial.email);
    await page.getByPlaceholder('Enter your password').fill('wrong-password');
    await page.locator('form').getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
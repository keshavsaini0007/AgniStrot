import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('dashboard', () => {
  test('mine official dashboard renders KPIs + own-site feed', async ({ page }) => {
    await login(page, 'mineOfficial');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Inspections (7d)')).toBeVisible();
    await expect(page.getByText('Alerts (7d)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Incidents' })).toBeVisible();
    await expect(page.getByText('Site Risk Overview')).toBeVisible();
  });

  test('corporate dashboard renders cross-site overview', async ({ page }) => {
    await login(page, 'corporate');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Inspections (7d)')).toBeVisible();
    await expect(page.getByText('Site Risk Overview')).toBeVisible();
    await expect(page.getByText('All sites')).toBeVisible();
  });

  test('regulator dashboard renders overview', async ({ page }) => {
    await login(page, 'regulator');
    await expect(page.getByText('Site Risk Overview')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Incidents' })).toBeVisible();
  });
});
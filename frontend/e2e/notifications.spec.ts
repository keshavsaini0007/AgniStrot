import { test, expect } from '@playwright/test';
import { login } from './helpers';

// Notifications are a live alias over the alert feed (seed guarantees open alerts).
const unreadDot = (page: import('@playwright/test').Page) =>
  page.locator('span.bg-\\[\\#D88A32\\]');

test.describe('notifications', () => {
  test('list is populated from live alerts and shows unread dots', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark All as Read' })).toBeVisible();
    await expect(page.getByText(/alert detected/i).first()).toBeVisible();
    expect(await unreadDot(page).count()).toBeGreaterThan(0);
  });

  test('marking a single notification as read clears its dot', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/notifications');
    await expect(page.getByText(/alert detected/i).first()).toBeVisible({ timeout: 15_000 });
    const before = await unreadDot(page).count();
    expect(before).toBeGreaterThan(0);

    // Click an UNREAD row (the one carrying the amber dot) — the newest row may already be read.
    const unreadRow = page
      .locator('div.px-6.py-4', { has: page.locator('span.bg-\\[\\#D88A32\\]') })
      .first();
    await unreadRow.click();
    await expect.poll(() => unreadDot(page).count()).toBe(before - 1);
  });

  test('mark all as read acknowledges every open alert', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/notifications');
    await expect(page.getByText(/alert detected/i).first()).toBeVisible({ timeout: 15_000 });
    expect(await unreadDot(page).count()).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Mark All as Read' }).click();
    await expect.poll(() => unreadDot(page).count(), { timeout: 30_000 }).toBe(0);
  });
});
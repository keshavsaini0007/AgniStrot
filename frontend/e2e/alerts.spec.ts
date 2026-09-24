import { test, expect } from '@playwright/test';
import { login } from './helpers';

// The "Alert summary" card shows live counts computed from the current list;
// it is the stable, duplication-free signal for status transitions.
const acknowledgedValue = (page: import('@playwright/test').Page) =>
  page
    .locator('section[aria-label="Alert summary"] article', { hasText: 'Acknowledged' })
    .locator('p.text-2xl');

test.describe('alerts — workflow lifecycle', () => {
  test('mine official acknowledges then resolves an open alert', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/alerts');
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();

    const acknowledge = page.getByRole('button', { name: 'Acknowledge' }).first();
    await expect(acknowledge).toBeVisible();
    const ackBefore = await acknowledgedValue(page).textContent();

    // Acknowledge → the summary "Acknowledged" counter ticks up after refetch.
    await acknowledge.click();
    await expect
      .poll(() => acknowledgedValue(page).textContent().then((t) => Number(t)))
      .toBeGreaterThan(Number(ackBefore));

    // The acknowledged alert exposes Resolve → drive it to closure via the modal.
    await page.getByRole('button', { name: 'Resolve' }).first().click();
    await expect(page.getByRole('heading', { name: 'Resolve alert' })).toBeVisible();
    await page
      .getByPlaceholder('Describe the action taken to close this alert')
      .fill('E2E remediation complete — control restored.');
    await page.getByRole('button', { name: 'Confirm resolve' }).click();

    // Modal closes and the closed alert is no longer counted as acknowledged.
    await expect(page.getByRole('heading', { name: 'Resolve alert' })).toHaveCount(0);
    await expect
      .poll(() => acknowledgedValue(page).textContent().then((t) => Number(t)))
      .toBe(Number(ackBefore));
  });

  test('escalation is available on open alerts', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/alerts');
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Escalate' }).first()).toBeVisible();
  });

  test('manual escalation surfaces the ladder chip + full chain', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/alerts');
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();

    // Drive the first open alert to escalated via the existing action.
    const escalatedValue = page
      .locator('section[aria-label="Alert summary"] article', { hasText: 'Escalated' })
      .locator('p.text-2xl');
    const escalatedBefore = await escalatedValue.textContent();
    await page.getByRole('button', { name: 'Escalate' }).first().click();
    await expect
      .poll(() => escalatedValue.textContent().then((t) => Number(t)))
      .toBeGreaterThan(Number(escalatedBefore));

    // Feature 02 — the escalated row now renders the rung chip with the chain
    // TOP role ("Level n/n · Regulator | Corporate manager") and the full
    // ladder line (open rows stay at "Mine official", so the top-role chip +
    // chain are unique to the escalated alert).
    await expect(
      page
        .getByTestId('alert-level-chip')
        .filter({ hasText: /Level \d+\/\d+ · (Regulator|Corporate manager)/ })
        .first()
    ).toBeVisible();
    await expect(page.getByTestId('alert-chain').filter({ hasText: '→' }).first()).toBeVisible();
  });
});
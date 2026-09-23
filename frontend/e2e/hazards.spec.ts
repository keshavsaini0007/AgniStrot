import { test, expect } from '@playwright/test';
import { login } from './helpers';

// ─── Feature 06: Hazard Register & Control Effectiveness (E2E vs real backend) ─
// Drives the whole deterministic lifecycle through the UI:
//   1. corporate registers a hazard → server computes 4×3 = 12 High
//   2. add PPE control → implement → assess → ineffective (stays mitigating)
//   3. add substitution control → implement → assess → effective → controlled
//   4. close the controlled hazard → row retires to Closed (immutable)
//   5. RBAC: field officer has no nav entry; regulator is read-only
//
// The seed does not wipe Hazard rows, so every assertion keys off the unique
// title THIS run registers (never absolute totals).

const hazardRows = (page: import('@playwright/test').Page) => page.getByTestId('hazard-row');
const controlRows = (page: import('@playwright/test').Page) => page.getByTestId('hazard-control-row');

const isHazardListResponse = (r: { url: string; request: () => { method: () => string } }) =>
  r.url().includes('/api/v1/hazards') &&
  !r.url().includes('/dashboard') &&
  r.request().method() === 'GET';

test.describe('hazards — register & control effectiveness (feature 06)', () => {
  test('drives a hazard open → mitigating → controlled → closed via the effectiveness engine', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, 'corporate');

    const listResponse = page.waitForResponse(isHazardListResponse);
    await page.goto('/app/hazards');
    await listResponse;

    const TITLE = `E2E coupling guard ${Date.now()}`;

    // 1) Register → server computes risk (4×3 = 12 → High), status open.
    await page.getByRole('button', { name: 'Register hazard' }).click();
    const registerModal = page.getByTestId('hazard-register-modal');
    // Corporate has no default site — wait for the site picker to hydrate so
    // the submit button becomes enabled.
    await expect(registerModal.locator('select.reg-site option')).not.toHaveCount(0);
    await registerModal.getByPlaceholder('e.g. Damaged crusher coupling guard').fill(TITLE);
    await registerModal
      .getByPlaceholder('Describe the hazard and where it is observed')
      .fill(`E2E lifecycle probe ${Date.now()} - coupling guard damage at the transfer point`);
    await registerModal.locator('select.reg-likelihood').selectOption('4');
    await registerModal.locator('select.reg-consequence').selectOption('3');
    await registerModal.getByRole('button', { name: 'Register hazard' }).click();
    await expect(registerModal).toHaveCount(0);

    const row = hazardRows(page).filter({ hasText: TITLE });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('High', { exact: true })).toBeVisible();
    await expect(row.getByText('Open', { exact: true })).toBeVisible();

    // 2) Add a PPE control → implement → assess → ineffective, stays mitigating.
    await row.getByRole('button', { name: 'Manage' }).click();
    const modal = page.getByTestId('hazard-manage-modal');
    await modal.getByPlaceholder('Control description').fill('Issue + enforce reflective vest usage');
    await modal.locator('select.ctl-type').selectOption('ppe');
    await modal.getByRole('button', { name: 'Add control' }).click();

    const ppeRow = controlRows(page)
      .filter({ hasText: 'reflective vest' })
      .last();
    await expect(ppeRow).toContainText('Planned');
    await ppeRow.getByRole('button', { name: 'Implement' }).click();
    await expect(ppeRow).toContainText('Implemented');

    // Status flips to mitigating after the first implemented control.
    await expect
      .poll(async () => (await row.getByText('Mitigating', { exact: true }).count()), { timeout: 30_000 })
      .toBeGreaterThan(0);

    await modal.getByRole('button', { name: 'Assess effectiveness' }).click();
    await expect
      .poll(async () => (await modal.getByText('Ineffective', { exact: true }).count()), { timeout: 30_000 })
      .toBeGreaterThan(0);
    // PPE adds no structural reduction — the hazard must stay mitigating.
    await expect(row.getByText('Mitigating', { exact: true })).toBeVisible();

    // 3) Substitution control → implement → assess → effective → controlled.
    await modal.getByPlaceholder('Control description').fill('Replace plain bearings with ceramic self-lubricating bearings');
    await modal.locator('select.ctl-type').selectOption('substitution');
    await modal.getByRole('button', { name: 'Add control' }).click();

    const subRow = controlRows(page)
      .filter({ hasText: 'ceramic self-lubricating' })
      .last();
    await subRow.getByRole('button', { name: 'Implement' }).click();
    await expect(subRow).toContainText('Implemented');

    await modal.getByRole('button', { name: 'Assess effectiveness' }).click();
    await expect
      .poll(async () => (await modal.getByText('Effective', { exact: true }).count()), { timeout: 30_000 })
      .toBeGreaterThan(0);
    await expect
      .poll(async () => (await row.getByText('Controlled', { exact: true }).count()), { timeout: 30_000 })
      .toBeGreaterThan(0);

    // 4) Controlled → close with note → row retires to Closed (immutable).
    const closeNote = `Verified zero findings at re-inspection ${Date.now()}`;
    await modal.getByPlaceholder('Closure note (what was verified)').fill(closeNote);
    await modal.getByRole('button', { name: 'Close hazard' }).click();
    await expect(modal).toHaveCount(0);

    await expect
      .poll(async () => (await row.getByText('Closed', { exact: true }).count()), { timeout: 30_000 })
      .toBeGreaterThan(0);

    // 5) Re-open: closed hazards are immutable — no add-control form, and the
    //    closure note is visible.
    await row.getByRole('button', { name: 'Manage' }).click();
    const closedModal = page.getByTestId('hazard-manage-modal');
    await expect(closedModal).toContainText('immutable');
    await expect(closedModal).toContainText(closeNote);
    await expect(closedModal.getByPlaceholder('Control description')).toHaveCount(0);
    await expect(closedModal.getByRole('button', { name: 'Close hazard' })).toHaveCount(0);
  });

  test('hazard register nav + write affordances follow role RBAC', async ({ page }) => {
    // Field officer: no nav entry at all.
    await login(page, 'fieldOfficer');
    await expect(page.getByRole('link', { name: 'Hazard Register' })).toHaveCount(0);

    // Regulator: nav entry + read-only page (no register button).
    await login(page, 'regulator');
    await expect(page.getByRole('link', { name: 'Hazard Register' })).toHaveCount(1);
    await page.getByRole('link', { name: 'Hazard Register' }).click();
    await page.waitForURL('**/app/hazards');
    await expect(page.getByRole('button', { name: 'Register hazard' })).toHaveCount(0);

    // Mine official: nav entry + write affordance present.
    await login(page, 'mineOfficial');
    await expect(page.getByRole('link', { name: 'Hazard Register' })).toHaveCount(1);
    await page.getByRole('link', { name: 'Hazard Register' }).click();
    await page.waitForURL('**/app/hazards');
    await expect(page.getByRole('button', { name: 'Register hazard' })).toHaveCount(1);
  });
});
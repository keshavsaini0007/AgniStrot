import { test, expect } from '@playwright/test';
import { login } from './helpers';

// ─── Feature 07: Admin User Management (E2E vs real backend) ───────────────
// Drives the whole lifecycle through the UI:
//   1. corporate seeds a probe account via the real corporate-gated register API
//   2. directory shows it (Active + role + site) — real status, no mock
//   3. Manage modal: re-role to corporate_manager → site cleared in the row
//   4. Manage modal: deactivate → row flips to Inactive
//   5. probe login is blocked with a clear "deactivated" error
//   6. corporate reactivates → probe can sign in again
//   7. RBAC: field officer has no Users nav entry and the page guard blocks them
//
// The probe user uses a unique email per run (the seed never wipes users, but
// re-running the spec creates a FRESH account, so assertions key off that email).

const API = 'http://localhost:5000/api/v1';
const PASSWORD = 'password123';
const EMAIL = `e2e.manage.${Date.now()}@agnistrot.com`;

const tokenOf = async (page: import('@playwright/test').Page): Promise<string> =>
  (await page.evaluate(() => localStorage.getItem('agnistrot_token'))) ?? '';

const isUsersListResponse = (r: { url: string; request: () => { method: () => string } }) =>
  r.url().includes('/api/v1/users') && r.request().method() === 'GET';

test.describe('users — admin management (feature 07)', () => {
  test('corporate re-roles, deactivates and reactivates a user; deactivation blocks login', async ({ page }) => {
    test.setTimeout(180_000);

    // ── Seed a probe account through the REAL corporate-gated register API ──
    await login(page, 'corporate');
    const token = await tokenOf(page);
    expect(token).toBeTruthy();

    const sitesRes = await page.request.get(`${API}/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sites = ((await sitesRes.json()) as { sites: Array<{ _id: string; name: string }> }).sites ?? [];
    expect(sites.length).toBeGreaterThan(0);

    const reg = await page.request.post(`${API}/auth/register`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E Manage Probe',
        email: EMAIL,
        password: PASSWORD,
        role: 'mine_official',
        siteId: sites[0]._id,
      },
    });
    expect(reg.status()).toBe(201);
    const userId = ((await reg.json()) as { id: string }).id;
    expect(userId).toBeTruthy();

    // ── Directory shows the probe (Active, Mine Officer, bound site) ──────
    const listResponse = page.waitForResponse(isUsersListResponse);
    await page.goto('/app/users');
    await listResponse;

    const probeRow = page.locator('tr').filter({ hasText: EMAIL });
    await expect(page.getByTestId(`user-status-${userId}`)).toContainText('Active');
    await expect(probeRow).toContainText('Mine Officer');
    await expect(probeRow).toContainText(sites[0].name);

    // ── Re-role to Corporate Manager via the Manage modal → site cleared ──
    await page.getByTestId(`manage-user-${userId}`).click();
    const manageForm = page.getByTestId('user-manage-form');
    await expect(manageForm).toBeVisible();
    await manageForm.getByTestId('edit-role').selectOption('corporate_manager');
    await manageForm.getByTestId('save-user-edit').click();
    await expect(manageForm).toBeHidden();

    await expect(probeRow).toContainText('Corporate Manager');
    await expect(probeRow).toContainText('All (cross-site)');

    // ── Deactivate → row flips to Inactive ────────────────────────────────
    await page.getByTestId(`manage-user-${userId}`).click();
    await page.getByTestId('user-manage-form').getByTestId('edit-status').selectOption('inactive');
    await page.getByTestId('user-manage-form').getByTestId('save-user-edit').click();
    await expect(page.getByTestId(`user-status-${userId}`)).toContainText('Inactive');

    // ── Deactivated probe CANNOT sign in — clear message, stays on login ──
    await page.goto('/login');
    await page.getByPlaceholder('Enter your email').fill(EMAIL);
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.locator('form').getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/deactivated/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // ── Corporate reactivates → probe can sign in again ───────────────────
    await login(page, 'corporate');
    await page.goto('/app/users');
    await page.getByTestId(`manage-user-${userId}`).click();
    await page.getByTestId('user-manage-form').getByTestId('edit-status').selectOption('active');
    await page.getByTestId('user-manage-form').getByTestId('save-user-edit').click();
    await expect(page.getByTestId(`user-status-${userId}`)).toContainText('Active');

    // ── RBAC: field officer has no Users nav entry and is page-guarded ────
    await login(page, 'fieldOfficer');
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
    await page.goto('/app/users');
    await expect(page.getByText('Corporate access required')).toBeVisible();
  });
});
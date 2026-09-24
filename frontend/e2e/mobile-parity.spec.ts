import { test, expect } from '@playwright/test';
import { mobileLogin, mobileToken, MOBILE_API } from './mobile-helpers';

// ─── Mobile parity (Expo web, :8081): features 07 + 08 against the real ─────
// backend, mirroring the web specs (users.spec.ts / corrective-closeout.spec.ts):
//   1. corporate re-roles a probe user via the mobile Manage modal
//   2. the deactivated probe cannot sign in; reactivation restores access
//   3. field officer has no Users nav entry and is page-guarded
//   4. mine official resolves an alert (real resolve API) then submits the
//      close-out evidence from the mobile detail screen
//   5. corporate approves → the action closes with review evidence
//   6. field officer is denied at the real close-out gate (403)
//
// Both specs are self-contained (unique probe email + newest non-closed alert).

const PASSWORD = 'password123';
const EMAIL = `e2e.mobile.${Date.now()}@agnistrot.com`;

test.describe('mobile parity — feature 07 admin users', () => {
  test('corporate re-roles and deactivates a user; deactivation blocks login', async ({ page }) => {
    test.setTimeout(240_000);

    // ── Seed a probe account via the real corporate-gated register API ────
    await mobileLogin(page, 'corporate');
    const token = await mobileToken(page);
    expect(token).toBeTruthy();

    const sitesRes = await page.request.get(`${MOBILE_API}/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sites = ((await sitesRes.json()) as { sites: Array<{ _id: string; name: string }> }).sites ?? [];
    expect(sites.length).toBeGreaterThan(0);

    const reg = await page.request.post(`${MOBILE_API}/auth/register`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'Mobile Manage Probe',
        email: EMAIL,
        password: PASSWORD,
        role: 'mine_official',
        siteId: sites[0]._id,
      },
    });
    expect(reg.status()).toBe(201);
    const userId = ((await reg.json()) as { id: string }).id;
    expect(userId).toBeTruthy();

    // ── Directory renders real rows; Manage modal re-roles to corporate ───
    await page.goto('/users');
    await expect(page.getByText(EMAIL)).toBeVisible();
    await expect(page.getByText('MINE OFFICIAL').first()).toBeVisible();
    await expect(page.getByText(sites[0].name, { exact: true }).first()).toBeVisible();

    await page.getByTestId(`manage-user-${userId}`).click();
    const form = page.getByTestId('user-manage-form');
    await expect(form).toBeVisible();
    await form.getByText('Corporate Manager', { exact: true }).click();
    await form.getByTestId('edit-user-save').click();
    await expect(form).toBeHidden();

    await expect(page.getByText('CORPORATE MANAGER').first()).toBeVisible();
    await expect(page.getByText('Cross-site').first()).toBeVisible();

    // ── Deactivate → row flips to Inactive ────────────────────────────────
    await page.getByTestId(`manage-user-${userId}`).click();
    await page.getByTestId('user-manage-form').getByText('Inactive', { exact: true }).click();
    await page.getByTestId('user-manage-form').getByTestId('edit-user-save').click();
    await expect(page.getByText('INACTIVE').first()).toBeVisible();

    // ── Deactivated probe CANNOT sign in — clear message, stays on login ──
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByPlaceholder('you@coalindia.com').fill(EMAIL);
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByText('Sign In', { exact: true }).last().click();
    await expect(page.getByText(/deactivated/i)).toBeVisible();

    // ── Corporate reactivates → row flips back to Active ──────────────────
    await mobileLogin(page, 'corporate');
    await page.goto('/users');
    await page.getByTestId(`manage-user-${userId}`).click();
    await page.getByTestId('user-manage-form').getByText('Active', { exact: true }).click();
    await page.getByTestId('user-manage-form').getByTestId('edit-user-save').click();
    await expect(page.getByText('ACTIVE').first()).toBeVisible();
  });
});

test.describe('mobile parity — feature 07 RBAC', () => {
  test('field officer has no Users entry and is page-guarded', async ({ page }) => {
    test.setTimeout(120_000);

    await mobileLogin(page, 'fieldOfficer');
    await page.goto('/more');
    await expect(page.getByText('Users', { exact: true })).toHaveCount(0);

    await page.goto('/users');
    await expect(page.getByText('Corporate access required')).toBeVisible();
  });
});

test.describe('mobile parity — feature 08 corrective close-out', () => {
  test('mine official submits close-out; corporate approves; verified → closed', async ({ page }) => {
    test.setTimeout(240_000);

    // ── mine official: pick a resolvable corrective action at her site ────
    await mobileLogin(page, 'mineOfficial');
    const moToken = await mobileToken(page);
    expect(moToken).toBeTruthy();

    const alertsRes = await page.request.get(`${MOBILE_API}/alerts`, {
      headers: { Authorization: `Bearer ${moToken}` },
    });
    const alerts =
      ((await alertsRes.json()) as { data: Array<{ id: string; status: string }> }).data ?? [];
    const target = alerts.find((a) => a.status !== 'closed');
    expect(target, 'seed must contain a non-closed alert for the probe').toBeTruthy();
    const caId = target!.id;

    // the alerts list omits `title` — pull the display title from the detail
    // endpoint (returns { data: { title, ... } }) for the UI assertions below
    const detailRes = await page.request.get(`${MOBILE_API}/corrective-actions/${caId}`, {
      headers: { Authorization: `Bearer ${moToken}` },
    });
    const title = ((await detailRes.json()) as { data: { title: string } }).data.title;
    expect(title).toBeTruthy();

    // ── resolve it through the real lifecycle (own-site mine official) ────
    const resolved = await page.request.post(`${MOBILE_API}/alerts/${caId}/resolve`, {
      headers: { Authorization: `Bearer ${moToken}` },
      data: { resolutionNote: 'Mobile E2E close-out probe — fixed on site.' },
    });
    expect([200, 409]).toContain(resolved.status());

    // ── list renders the real row (backend feed, not mock) ────────────────
    await page.goto('/corrective-actions');
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();

    // ── detail: close-out form appears and submission lands the record ────
    const submitResponse = page.waitForResponse(
      (r) => r.url().includes(`/corrective-actions/${caId}/close-out`) && r.request().method() === 'POST'
    );
    await page.goto(`/corrective-action-detail?id=${caId}`);
    const panel = page.getByTestId('closeout-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('closeout-submit')).toBeVisible();

    await page.getByTestId('closeout-recommendation').fill(
      'Fitted a hard barrier at the haul-road crossing plus a daily sign-off sheet.'
    );
    await page.getByTestId('closeout-effectiveness').fill(
      'Thirty days of daily sign-offs with zero repeat findings.'
    );
    await page.getByTestId('closeout-evidence').fill('Daily checklist log, weeks 33–37, in the site register.');
    await page.getByTestId('closeout-submit').click();
    await submitResponse;

    await expect(page.getByText('VERIFIED').first()).toBeVisible();
    await expect(page.getByTestId('closeout-submit')).toHaveCount(0);
    await expect(panel).toContainText('Daily checklist log, weeks 33–37');
    await expect(panel).toContainText('Submitted by');

    // ── corporate: approve → terminal Closed with review evidence ─────────
    await mobileLogin(page, 'corporate');
    const approveResponse = page.waitForResponse(
      (r) => r.url().includes(`/corrective-actions/${caId}/approve`) && r.request().method() === 'POST'
    );
    await page.goto(`/corrective-action-detail?id=${caId}`);
    await expect(page.getByTestId('closeout-approve')).toBeVisible();
    await page.getByTestId('closeout-review-note').fill('Evidence checks out — closing out.');
    await page.getByTestId('closeout-approve').click();
    await approveResponse;

    await expect(page.getByText('CLOSED').first()).toBeVisible();
    await expect(panel).toContainText('Evidence checks out — closing out.');
    await expect(panel).toContainText('Reviewed by');

    // ── RBAC: field officer is denied at the real gate (403) ──────────────
    await mobileLogin(page, 'fieldOfficer');
    const foToken = await mobileToken(page);
    const denied = await page.request.post(`${MOBILE_API}/corrective-actions/${caId}/close-out`, {
      headers: { Authorization: `Bearer ${foToken}` },
      data: {
        recommendation: 'Not allowed to submit a close-out.',
        effectiveness: 'Not allowed to submit a close-out.',
      },
    });
    expect(denied.status()).toBe(403);
  });
});
import { test, expect } from '@playwright/test';
import { login } from './helpers';

// ─── Feature 08: Corrective Action Close-out Loop (E2E vs real backend) ────
// Drives the whole loop through the UI + the real alert lifecycle API:
//   1. mine official resolves an open alert on her own site (real resolve API)
//   2. on the corrective action detail page she submits the close-out evidence
//      → derived status flips to Verified, form is replaced by the record
//   3. corporate opens the same action → Approve & close → derived status
//      flips to Closed, close-out shows Approved with the review note
//   4. RBAC: field officer is denied at the real gate (403), no nav entry
//
// The spec is self-contained: it picks the newest non-closed alert, so it
// works whether or not an earlier spec already resolved that probe.

const API = 'http://localhost:5000/api/v1';

const tokenOf = async (page: import('@playwright/test').Page): Promise<string> =>
  (await page.evaluate(() => localStorage.getItem('agnistrot_token'))) ?? '';

test.describe('corrective close-out (feature 08)', () => {
  test('mine official submits; corporate approves; verified → closed', async ({ page }) => {
    test.setTimeout(180_000);

    // ── 1) mine official: pick a resolvable corrective action at her site ──
    await login(page, 'mineOfficial');
    const moToken = await tokenOf(page);
    expect(moToken).toBeTruthy();

    const alertsRes = await page.request.get(`${API}/alerts`, {
      headers: { Authorization: `Bearer ${moToken}` },
    });
    const alerts = ((await alertsRes.json()) as { data: Array<{ id: string; status: string }> }).data ?? [];
    const target = alerts.find((a) => a.status !== 'closed');
    expect(target, 'seed must contain a non-closed alert for the probe').toBeTruthy();
    const caId = target!.id;

    // ── 2) resolve it through the real lifecycle (own-site mine official) ──
    const resolved = await page.request.post(`${API}/alerts/${caId}/resolve`, {
      headers: { Authorization: `Bearer ${moToken}` },
      data: { resolutionNote: 'E2E close-out probe — fixed on site.' },
    });
    expect([200, 409]).toContain(resolved.status());

    // ── 3) UI: close-out form appears and submission flips to Verified ─────
    const submitResponse = page.waitForResponse(
      (r) => r.url().includes(`/corrective-actions/${caId}/close-out`) && r.request().method() === 'POST'
    );
    await page.goto(`/app/corrective-actions/${caId}`);
    const form = page.getByTestId('closeout-submit-form');
    await expect(form).toBeVisible();

    await form.getByTestId('closeout-recommendation').fill(
      'Fitted a hard barrier at the haul-road crossing plus a daily sign-off sheet.'
    );
    await form.getByTestId('closeout-effectiveness').fill(
      'Thirty days of daily sign-offs with zero repeat findings.'
    );
    await form.getByTestId('closeout-evidence').fill('Daily checklist log, weeks 33–37, in the site register.');
    await form.getByTestId('closeout-submit').click();
    await submitResponse;

    await expect(page.getByText('Verified', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('closeout-submit-form')).toHaveCount(0);
    const panel = page.getByTestId('closeout-panel');
    await expect(panel).toContainText('Daily checklist log, weeks 33–37');
    await expect(panel).toContainText('Submitted by');
    await expect(page.getByText('Submitted', { exact: true }).first()).toBeVisible();

    // ── 4) corporate: approve → terminal Closed with review evidence ───────
    await login(page, 'corporate');
    const approveResponse = page.waitForResponse(
      (r) => r.url().includes(`/corrective-actions/${caId}/approve`) && r.request().method() === 'POST'
    );
    await page.goto(`/app/corrective-actions/${caId}`);
    await expect(page.getByTestId('closeout-approve')).toBeVisible();
    await page.getByTestId('closeout-review-note').fill('Evidence checks out — closing out.');
    await page.getByTestId('closeout-approve').click();
    await approveResponse;

    await expect(page.getByText('Closed', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('closeout-panel')).toContainText('Evidence checks out — closing out.');

    // ── 5) RBAC: field officer cannot submit, no nav entry ─────────────────
    await login(page, 'fieldOfficer');
    await expect(page.getByRole('link', { name: 'Corrective Actions' })).toHaveCount(0);
    const foToken = await tokenOf(page);
    const denied = await page.request.post(`${API}/corrective-actions/${caId}/close-out`, {
      headers: { Authorization: `Bearer ${foToken}` },
      data: { recommendation: 'Not allowed to submit a close-out.', effectiveness: 'Not allowed to submit a close-out.' },
    });
    expect(denied.status()).toBe(403);
  });
});
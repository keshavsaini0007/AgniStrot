import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { login } from './helpers';

// ─── Feature 05: Evidence Integrity (E2E against the REAL backend) ──────────
// Covers the whole attestation loop through the UI:
//   1. upload (sync role) → server-side SHA-256 row created at ingest
//   2. corporate dashboard lists it as Unverified with a content hash
//   3. Verify now → recomputed hash MATCHes → row flips to Verified
//   4. Verify all → no Unverified rows remain
//   5. RBAC: field officer has no nav entry, mine_official does
//
// The seed does not wipe Evidence rows, so assertions reference the unique
// filename of the row THIS run uploads (never absolute totals).

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'form-sample.png');
const API = 'http://localhost:5000/api/v1';
// Unique per run: the seed never wipes Evidence rows, so a fixed name would
// accumulate and match multiple ledger rows on later runs.
const FILE_NAME = `evidence-e2e-sample-${Date.now()}.png`;

const evidenceRows = (page: import('@playwright/test').Page) => page.getByTestId('evidence-row');
const stat = (page: import('@playwright/test').Page, id: string) => page.getByTestId(id);

const isEvidenceListResponse = (r: { url: string; request: () => { method: () => string } }) =>
  r.url().includes('/api/v1/evidence') && !r.url().includes('/dashboard') && r.request().method() === 'GET';

/** POST the fixture as a sync-role upload; returns the backend attestation ids. */
async function uploadEvidence(page: import('@playwright/test').Page) {
  const token = await page.evaluate(() => localStorage.getItem('agnistrot_token'));
  expect(token).toBeTruthy();
  const res = await page.request.post(`${API}/media/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      file: { name: FILE_NAME, mimeType: 'image/png', buffer: fs.readFileSync(fixture) },
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    evidenceId: (body.evidenceId ?? body.data?.evidenceId) as string,
    contentHash: (body.contentHash ?? body.data?.contentHash) as string,
  };
}

test.describe('evidence — integrity dashboard (feature 05)', () => {
  test('attests an upload at ingest, then verify-now re-checks the stored bytes', async ({ page }) => {
    test.setTimeout(120_000);

    // 1) Sync-role upload → Evidence row attested with a full SHA-256.
    await login(page, 'mineOfficial');
    const { evidenceId, contentHash } = await uploadEvidence(page);
    expect(contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(evidenceId).toBeTruthy();

    // 2) Corporate oversight: ledger lists the new file as Unverified with the hash.
    await login(page, 'corporate');
    const listResponse = page.waitForResponse(isEvidenceListResponse);
    await page.goto('/app/evidence');
    await listResponse;

    const row = evidenceRows(page).filter({ hasText: FILE_NAME });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('Unverified')).toBeVisible();
    await expect(row).toContainText(/[0-9a-f]{10}…[0-9a-f]{8}/);

    // 3) Verify now → MATCH flips the row to Verified and bumps the counter.
    await row.getByRole('button', { name: 'Verify now' }).click();
    await expect.poll(() => row.getByText('Verified').count(), { timeout: 30_000 }).toBeGreaterThan(0);
    await expect
      .poll(async () => Number(await stat(page, 'stat-verified').textContent()), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(1);
  });

  test('verify-all leaves no unverified rows behind', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'corporate');
    const listResponse = page.waitForResponse(isEvidenceListResponse);
    await page.goto('/app/evidence');
    await listResponse;

    await page.getByRole('button', { name: 'Verify all' }).click();
    // Every row with a baseline now shows a terminal state (Verified / Mismatch /
    // Unavailable / Upload Failed) — the Unverified count drops to zero.
    await expect
      .poll(() => evidenceRows(page).getByText('Unverified').count(), { timeout: 60_000 })
      .toBe(0);
  });

  test('evidence nav entry follows role RBAC (field officer excluded)', async ({ page }) => {
    await login(page, 'fieldOfficer');
    await expect(page.getByRole('link', { name: 'Evidence Integrity' })).toHaveCount(0);

    await login(page, 'mineOfficial');
    await expect(page.getByRole('link', { name: 'Evidence Integrity' })).toHaveCount(1);
  });
});
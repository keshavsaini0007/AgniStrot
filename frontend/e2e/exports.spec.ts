import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { login } from './helpers';

// Feature 09 — register CSV export.
//   - Corporate downloads the full user register (users.csv, attachment headers).
//   - Mine official downloads only her own site's attendance (role scope).
//   - Field officer is page-gated off the user register entirely.
// Runs against the REAL backend (fresh-seed baseline from e2e-server.mjs).

const asText = (downloadPath: string): string =>
  fs.readFileSync(downloadPath, 'utf8').replace(/^\uFEFF/, '');

test.describe('Register CSV export', () => {
  test('corporate downloads the full user register', async ({ page }) => {
    await login(page, 'corporate');
    await page.goto('/app/users');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-users-csv').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('users-register.csv');
    const txt = asText((await download.path()) ?? '');

    expect(txt).toContain('Name,Email,Role,Site,Status,Created');
    expect(txt).toContain('amit@agnistrot.com');
    expect(txt).toContain('priya@agnistrot.com');
    expect(txt).toContain('meena@agnistrot.com');
  });

  test('mine official exports only own-site attendance rows', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/attendance');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-attendance-csv').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('attendance-register.csv');
    const txt = asText((await download.path()) ?? '');

    // Header row + own site present; no cross-site rows leak through.
    expect(txt).toContain('Site ID,Site,Worker,Check Type,Captured At,Synced At');
    expect(txt).toContain('Jharia Underground Mine');
    expect(txt).not.toContain('Dhanbad Coal Mine');
  });

  test('field officer cannot reach the user register (page gate)', async ({ page }) => {
    await login(page, 'fieldOfficer');
    await page.goto('/app/users');

    await expect(page.getByText('Corporate access required')).toBeVisible();
    await expect(page.getByTestId('export-users-csv')).toHaveCount(0);
    await expect(page.getByTestId('export-users-json')).toHaveCount(0);
  });
});

test.describe('Register JSON export', () => {
  test('corporate downloads the full user register as JSON', async ({ page }) => {
    await login(page, 'corporate');
    await page.goto('/app/users');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-users-json').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('users-register.json');
    const rows = JSON.parse(fs.readFileSync((await download.path()) ?? '', 'utf8')) as Array<Record<string, unknown>>;

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(Object.keys(rows[0] ?? {})).toEqual(
      expect.arrayContaining(['Name', 'Email', 'Role', 'Site', 'Status', 'Created']),
    );
    const emails = rows.map((r) => r.Email);
    expect(emails).toContain('amit@agnistrot.com');
    expect(emails).toContain('priya@agnistrot.com');
    expect(emails).toContain('meena@agnistrot.com');
  });

  test('mine official exports only own-site attendance rows as JSON', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/attendance');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-attendance-json').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('attendance-register.json');
    const rows = JSON.parse(fs.readFileSync((await download.path()) ?? '', 'utf8')) as Array<Record<string, unknown>>;

    expect(Array.isArray(rows)).toBe(true);
    expect(Object.keys(rows[0] ?? {})).toEqual(
      expect.arrayContaining(['Site ID', 'Site', 'Worker', 'Check Type', 'Captured At', 'Synced At']),
    );
    const body = JSON.stringify(rows);
    expect(body).toContain('Jharia Underground Mine');
    expect(body).not.toContain('Dhanbad Coal Mine');
  });
});
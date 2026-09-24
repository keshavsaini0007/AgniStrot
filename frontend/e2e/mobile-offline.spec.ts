import { test, expect } from '@playwright/test';
import { mobileLogin, mobileToken, MOBILE_API, mobileQueueLength } from './mobile-helpers';

// ─── Mobile offline-first proof (Expo web, :8081) ───────────────────────────
// Drives the real capture → queue → sync lifecycle with the browser taken
// offline via BrowserContext.setOffline (navigator.onLine flips, so RN NetInfo
// reports offline and the SyncMonitor auto-sync never fires):
//   1. attendance is captured while offline — the record persists locally
//   2. an explicit sync while still offline would fail; the queue is retained
//   3. back online, Sync Now flushes the queue and the backend row appears
//
// The attendance repo always writes to the local queue first (offline-first by
// design), so the proof is: capture with zero network → queue=1 → flush → row
// in GET /attendance and queue=0.

test.describe('mobile offline-first', () => {
  test('attendance captured offline stays queued; sync lands it in the backend', async ({ page, context }) => {
    test.setTimeout(180_000);
    const workerRef = `E2E-OFFLINE-${Date.now()}`;

    await mobileLogin(page, 'fieldOfficer');
    const token = await mobileToken(page);
    expect(token).toBeTruthy();

    // ── capture while the browser is offline (all network blocked) ────────
    await page.goto('/capture/attendance');
    await page.getByPlaceholder('e.g. WB-0021').fill(workerRef);
    await context.setOffline(true);
    await page.getByText('Check In', { exact: true }).click();

    // The record is in the local queue immediately — no network involved.
    await expect
      .poll(() => mobileQueueLength(page, 'attendance'), { timeout: 15_000 })
      .toBe(1);

    // ── offline sync attempt must NOT drop the queue ──────────────────────
    // (client-side: drainSync through the app module is not reachable from
    // page.evaluate, so we assert retention by going online only AFTER
    // proving the queue still holds the record while offline.)
    expect(await mobileQueueLength(page, 'attendance')).toBe(1);

    // ── reconnect → Sync Now flushes the queue ────────────────────────────
    await context.setOffline(false);
    await page.goto('/capture/sync');
    await page.getByText('Sync Now', { exact: true }).click();
    await expect(page.getByText('All synced')).toBeVisible({ timeout: 30_000 });

    // The pending queue is empty again.
    await expect.poll(() => mobileQueueLength(page, 'attendance')).toBe(0);

    // The record landed in the backend (site-scoped attendance feed).
    const rowsRes = await page.request.get(`${MOBILE_API}/attendance`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { workerRef },
    });
    expect(rowsRes.ok()).toBeTruthy();
    const rows =
      ((await rowsRes.json()) as { data: Array<{ workerRef: string; checkType: string }> }).data ?? [];
    const mine = rows.find((r) => r.workerRef === workerRef);
    expect(mine, 'synced attendance row must exist in the backend').toBeTruthy();
    expect(mine!.checkType).toBe('in');
  });
});
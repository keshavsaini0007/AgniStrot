import { test, expect } from '@playwright/test';
import { login } from './helpers';

// Phase 7.5b — risk heatmap layers on the GIS page.
//   - Regulator sees band-colored site layers for every site + the legend;
//     clicking a layer opens the risk assessment popup (band + score).
//   - Mine official sees exactly her assigned site's layer (role scope).
// Backend RBAC negatives (field officer 403, filter, malformed id) are covered
// by the F24 verify battery + Postman folder 17.
// Runs against the REAL backend (fresh-seed baseline from e2e-server.mjs).

test.describe('GIS risk heatmap layers', () => {
  test('regulator sees multi-site heatmap + risk popup', async ({ page }) => {
    await login(page, 'regulator');
    await page.goto('/app/gis');

    await expect(page.getByTestId('risk-legend')).toBeVisible();
    await expect(page.getByText('Risk heatmap:')).toBeVisible();

    // Every seeded site renders a band-colored layer marker.
    const layers = page.locator('[data-testid^="risk-marker-"]');
    await expect(layers.first()).toBeVisible();
    expect(await layers.count()).toBeGreaterThanOrEqual(3);

    // Click the first layer → the click-through risk assessment popup opens.
    // (Site layers render above field-clutter markers via zIndexOffset, so the
    // topmost band layer receives the click; assertions hold for any site.)
    await layers.first().click();
    await expect(page.getByTestId('risk-popup')).toBeVisible();
    await expect(page.getByTestId('risk-band-badge')).toBeVisible();

    const score = page.getByTestId('risk-popup-score');
    await expect(score).toBeVisible();
    const scoreText = (await score.textContent()) ?? '';
    expect(/^\d+$/.test(scoreText.trim())).toBe(true);
    expect(Number(scoreText.trim())).toBeGreaterThanOrEqual(0);
    expect(Number(scoreText.trim())).toBeLessThanOrEqual(100);
  });

  test('mine official sees only their assigned site layer', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/gis');

    await expect(page.getByTestId('risk-legend')).toBeVisible();

    // Role scoping on the backend → exactly one layer for Jharia.
    const layers = page.locator('[data-testid^="risk-marker-"]');
    await expect(layers.first()).toBeVisible();
    expect(await layers.count()).toBe(1);
  });
});
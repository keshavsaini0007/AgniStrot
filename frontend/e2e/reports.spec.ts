import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('reports', () => {
  test('generates and downloads a statutory PDF', async ({ page }) => {
    await login(page, 'mineOfficial');
    await page.goto('/app/reports');

    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Report' })).toBeDisabled();

    const siteSelect = page.locator('select').nth(0);
    const siteValue = await siteSelect.locator('option').nth(1).getAttribute('value');
    expect(siteValue).toBeTruthy();
    await siteSelect.selectOption(String(siteValue));

    await page.locator('select').nth(1).selectOption('safety');

    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill('2026-01-01');
    await dates.nth(1).fill('2026-12-01');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download report/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    const stream = await download.createReadStream();
    const bytes: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => bytes.push(chunk));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });
    const buffer = Buffer.concat(bytes);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
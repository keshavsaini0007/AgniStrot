import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { login } from './helpers';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'assets',
  'form-sample.png',
);

const documents = (page: import('@playwright/test').Page) =>
  page.locator('div.divide-y > div');

test.describe('documents — OCR ingest', () => {
  test('ingests a paper form and confirms the extracted fields', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'mineOfficial');
    await page.goto('/app/documents');

    await expect(page.getByRole('button', { name: 'Scan Document' })).toBeVisible();
    // Wait for the documents list to finish loading so rowsBefore is accurate.
    await page.waitForResponse(
      (r) => r.url().includes('/api/v1/documents') && r.request().method() === 'GET',
    );
    const rowsBefore = await documents(page).count();

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Scan Document' }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(fixture);

    // Scan in progress, then the list refetches with the new pending document.
    await expect(page.getByRole('button', { name: /scanning/i })).toBeVisible({ timeout: 5_000 });
    await expect
      .poll(() => documents(page).count(), { timeout: 90_000 })
      .toBe(rowsBefore + 1);
    await expect(page.getByText(/failed to scan/i)).toHaveCount(0);

    // Newest document is listed first → its Review action opens the confirm modal.
    await page.getByRole('button', { name: 'Review' }).first().click();
    await expect(page.getByRole('heading', { name: 'Confirm extracted fields' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm record' }).click();
    await expect(page.getByRole('heading', { name: 'Confirm extracted fields' })).toHaveCount(0);

    await expect
      .poll(() => documents(page).first().getByText('Confirmed').count(), { timeout: 30_000 })
      .toBe(1);
  });
});
import { type Page, expect } from '@playwright/test';
import { ACCOUNTS, type AccountKey } from './helpers';

/**
 * Mobile (Expo web, :8081) helpers. The app stores its token under
 * `agnistrot.jwt` (tokenStore.ts) instead of the web app's `agnistrot_token`.
 */
export const MOBILE_API = 'http://localhost:5000/api/v1';

export const mobileToken = async (page: Page): Promise<string> =>
  (await page.evaluate(() => localStorage.getItem('agnistrot.jwt'))) ?? '';

/**
 * Start a fresh mobile session and sign in through the real Expo-web login
 * screen. localStorage is cleared first so account switches are hermetic.
 */
export async function mobileLogin(page: Page, account: AccountKey): Promise<void> {
  const creds = ACCOUNTS[account];
  // Navigate first — localStorage is inaccessible on about:blank.
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.getByPlaceholder('you@coalindia.com').fill(creds.email);
  await page.getByPlaceholder('Enter your password').fill(creds.password);
  await page.getByText('Sign In', { exact: true }).last().click();
  await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
}

/** Reads the persisted mobile queue for a capture kind (localStorage on web). */
export const mobileQueueLength = async (page: Page, kind: string): Promise<number> =>
  page.evaluate((k) => {
    const raw = localStorage.getItem(`agnistrot.queue.${k}`);
    return raw ? (JSON.parse(raw) as unknown[]).length : 0;
  }, kind);
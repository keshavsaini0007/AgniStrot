import { type Page } from '@playwright/test';

export const ACCOUNTS = {
  corporate: { email: 'amit@agnistrot.com', password: 'password123' },
  regulator: { email: 'meena@agnistrot.com', password: 'password123' },
  mineOfficial: { email: 'priya@agnistrot.com', password: 'password123' },
  fieldOfficer: { email: 'rahul@agnistrot.com', password: 'password123' },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;

/** Logs in via the real auth flow and waits until the dashboard is reachable. */
export async function login(page: Page, account: AccountKey): Promise<void> {
  const creds = ACCOUNTS[account];
  await page.goto('/login');
  await page.getByPlaceholder('Enter your email').fill(creds.email);
  await page.getByPlaceholder('Enter your password').fill(creds.password);
  await page.locator('form').getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/app/dashboard');
}
// Phase 6 — web dashboard visibility probe (REAL backend, no reseed).
//
// Proves the rule-triggered alert created by the mobile sync path is visible
// and actionable in the actual web UI:
//   1. log in as the site mine_official (priya) through the real login flow
//   2. open /app/alerts
//   3. assert a SAFETY_CHECKLIST_FAIL alert (sourceType inspection) is rendered
//      with an "Acknowledge" action + severity "High" badge
//
// Requires the Vite dev server on :3000 running in real-API mode:
//   VITE_USE_MOCK_API=false VITE_DEMO_FEATURES=false VITE_API_BASE_URL=http://localhost:5000/api/v1
//
// Run:  node scripts/web-alert-probe.mjs [alertId]

import { chromium } from "playwright";

const BASE = process.env.WEB_BASE_URL ?? "http://localhost:3000";
const ACCOUNTS = {
  mineOfficial: { email: "priya@agnistrot.com", password: "password123" },
};

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();

  // 1. Real login flow (mirrors frontend/e2e/helpers.ts)
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("Enter your email").fill(ACCOUNTS.mineOfficial.email);
  await page.getByPlaceholder("Enter your password").fill(ACCOUNTS.mineOfficial.password);
  await page.locator("form").getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/app/dashboard");
  check(true, "login as mine_official (priya) reached /app/dashboard");

  // 2. Open the alerts dashboard
  await page.goto(`${BASE}/app/alerts`);
  await page.getByRole("heading", { name: "Alerts" }).waitFor();
  check(true, "alerts dashboard rendered");

  // 3. Fetch the newest SAFETY alert created by the mobile-sync path (API),
  //    then assert it is rendered and actionable in the UI.
  const apiRes = await fetch("http://localhost:5000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ACCOUNTS.mineOfficial),
  });
  const { token } = await apiRes.json();
  const listRes = await fetch(
    "http://localhost:5000/api/v1/alerts?ruleCode=SAFETY_CHECKLIST_FAIL",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listJson = await listRes.json();
  const newest = (listJson.data ?? [])
    .filter((a) => a.sourceType === "inspection")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  check(!!newest, "newest SAFETY inspection alert resolved via API", newest ? `id=${newest.id} sev=${newest.severity} status=${newest.status}` : "none");

  const row = page.locator("div.group").filter({ hasText: newest.id }).first();
  await row.waitFor({ timeout: 20000 });
  check(true, "mobile-created alert rendered in list", `id ${newest.id}`);

  const rowText = await row.textContent();
  check(!!rowText && rowText.includes("inspection"), "alert row shows sourceType inspection", `row: ${rowText?.replace(/\s+/g, " ").slice(0, 180)}`);
  check(!!rowText && /high/i.test(rowText ?? ""), "alert shows High severity badge", "");
  check(
    await row.getByRole("button", { name: "Acknowledge" }).isVisible().catch(() => false),
    "Acknowledge action available for the open alert",
    ""
  );

  await page.screenshot({ path: "C:/Users/DELL/AppData/Local/Temp/opencode/phase6-web-alerts.png", fullPage: true });
  console.log("\nEvidence screenshot: phase6-web-alerts.png");
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nWeb probe PASSED." : `\nWeb probe FAILED (${failures}).`);
process.exit(failures ? 1 : 0);
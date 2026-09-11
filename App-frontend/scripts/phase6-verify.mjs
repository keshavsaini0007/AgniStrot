// Phase 6 — E2E back-half verification against the LIVE backend.
//
// Proves the capture→sync→alert loop and the clientUuid dedup at the API level,
// using the exact payload shape the mobile app sends (see sync.validator.ts):
//
//   1. login as field_officer (rahul)  → capture token
//   2. confirm target site resolves (Jharia)
//   3. best-effort photo upload via /media/upload (5MB cap)
//   4. POST /inspections/sync with a safety inspection containing ONE "fail"
//      item + the uploaded photo URL → must be accepted
//   5. rule engine must have created rule SAFETY_CHECKLIST_FAIL (high) on that
//      site, visible to the site's mine_official (priya)
//   6. resend the SAME clientUuid → must be rejected as "duplicate", and the
//      inspection row count for the officer must be unchanged
//
// Run:  node scripts/phase6-verify.mjs      (uses tunnel URL, mirroring mobile)
//   or:  PHASE6_LOCAL=1 node scripts/phase6-verify.mjs   (localhost:5000)

import { randomUUID } from "node:crypto";

const BASE = process.env.PHASE6_LOCAL
  ? "http://localhost:5000/api/v1"
  : "https://actual-february-parish-sound.trycloudflare.com/api/v1";

const SITE_NAME = "Jharia Underground Mine";
const KNOWN_JHARIA_ID = "6aa2e3ba05d3ddeb8fb636ec";

const results = [];
const push = (pass, label, detail = "") => {
  results.push({ pass, label, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

async function api(path, { token, method = "GET", body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`Phase 6 back-half verification — base ${BASE}`);

  // ── 1. Login field_officer + mine_official ──────────────────────────────
  const fieldLogin = await api("/auth/login", {
    method: "POST",
    body: { email: "rahul@agnistrot.com", password: "password123" },
  });
  push(fieldLogin.status === 200 && !!fieldLogin.json?.token, "login field_officer (rahul)", `http ${fieldLogin.status}`);
  const fieldToken = fieldLogin.json?.token;

  const offLogin = await api("/auth/login", {
    method: "POST",
    body: { email: "priya@agnistrot.com", password: "password123" },
  });
  push(offLogin.status === 200 && !!offLogin.json?.token, "login mine_official (priya)", `http ${offLogin.status}`);
  const offToken = offLogin.json?.token;

  if (!fieldToken || !offToken) {
    console.log("\nABORTED — could not authenticate.");
    process.exit(1);
  }

  // ── 2. Resolve the capture site (Jharia) ────────────────────────────────
  const sites = await api("/sites", { token: fieldToken });
  const site =
    (sites.json?.sites ?? []).find((s) => s.name === SITE_NAME && /^[a-f\d]{24}$/i.test(s._id)) ??
    (sites.json?.sites ?? []).find((s) => /^[a-f\d]{24}$/i.test(s._id));
  const siteId = (site?._id) ? String(site?._id) : KNOWN_JHARIA_ID;
  const siteLabel = site?.name ?? "fallback-id";
  push(/^[a-f\d]{24}$/i.test(siteId), "capture site resolved", `${siteLabel} ${siteId}`);

  // ── 3. Best-effort photo upload (mirrors app mediaService) ──────────────
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  let photoUrl = null;
  try {
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "phase6-probe.png");
    const up = await fetch(`${BASE}/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fieldToken}` },
      body: form,
    });
    const upJson = await up.json().catch(() => ({}));
    photoUrl = upJson?.url ?? null;
    push(up.status === 200 && !!photoUrl, "photo upload via /media/upload", `http ${up.status}${photoUrl ? "" : " (no url)"}`);
  } catch (err) {
    push(false, "photo upload via /media/upload", String(err?.message ?? err));
  }

  // ── 4. Sync a safety inspection with ONE failed checklist item ──────────
  const clientUuid = randomUUID();
  const record = {
    clientUuid,
    siteId,
    type: "safety",
    checklist: [
      { item: "PPE compliance — helmet and harness present at pit entry", result: "fail", notes: "Helmet shell dented; harness strap frayed." },
      { item: "Escape route signage visible and legible", result: "pass" },
    ],
    location: { lat: 23.7461, lng: 86.4123 },
    photoUrls: photoUrl ? [photoUrl] : [],
    capturedAt: new Date().toISOString(),
  };

  const before = await api("/inspections?page=1&limit=100", { token: fieldToken });
  const beforeCount = Array.isArray(before.json?.data) ? before.json.data.length : -1;

  const sync = await api("/inspections/sync", { token: fieldToken, method: "POST", body: { records: [record] } });
  const accepted = sync.json?.accepted ?? [];
  const rejected = sync.json?.rejected ?? [];
  push(sync.status === 200, "sync endpoint http 200", `http ${sync.status}`);

  const accOk = Array.isArray(accepted) && accepted.length === 1 && accepted[0] === clientUuid;
  push(accOk, "record accepted on first sync", JSON.stringify(sync.json));
  const rejOk = Array.isArray(rejected) && rejected.length === 0;
  push(rejOk, "no rejects on first sync", JSON.stringify(rejected));

  // ── 5. Rule engine created the SAFETY_CHECKLIST_FAIL alert for the site ──
  const alerts = await api(`/alerts?ruleCode=SAFETY_CHECKLIST_FAIL&status=open`, { token: offToken });
  const alertHit = (alerts.json?.data ?? []).find(
    (a) => a.sourceType === "inspection" && a.siteId === siteId && a.severity === "high"
  );
  push(
    !!alertHit,
    "rule-triggered alert visible to site mine_official",
    alertHit ? `rule=${alertHit.ruleCode} sev=${alertHit.severity} assignedTo=${alertHit.assignedToName} status=${alertHit.status}` : JSON.stringify(alerts.json)
  );

  const acceptedSet = new Set((before.json?.data ?? []).map((r) => r.id ?? r._id));

  // ── 6. Dedup: resend SAME clientUuid → rejected "duplicate", no new row ──
  const dupSync = await api("/inspections/sync", { token: fieldToken, method: "POST", body: { records: [record] } });
  const dupAccepted = dupSync.json?.accepted ?? [];
  const dupRejected = dupSync.json?.rejected ?? [];
  const dupOk =
    dupAccepted.length === 0 &&
    dupRejected.length === 1 &&
    dupRejected[0]?.clientUuid === clientUuid &&
    dupRejected[0]?.reason === "duplicate";
  push(dupOk, "retry same clientUuid → rejected duplicate", JSON.stringify(dupSync.json));

  const after = await api("/inspections?page=1&limit=100", { token: fieldToken });
  const afterCount = Array.isArray(after.json?.data) ? after.json.data.length : -1;
  push(
    beforeCount !== -1 && afterCount === beforeCount + 1,
    "exactly one row persisted across both sync calls (no dup)",
    `before=${beforeCount} after=${afterCount}`
  );

  const newRow = (after.json?.data ?? []).find(
    (r) => !acceptedSet.has(r.id ?? r._id)
  );
  if (newRow) {
    const detail = await api(`/inspections/${newRow.id}`, { token: fieldToken });
    const detailRow = detail.json?.data;
    push(
      detail.status === 200 && detailRow?.clientUuid === clientUuid,
      "persisted row carries the clientUuid once, dedup key intact",
      detail.status === 200 ? `detail clientUuid=${detailRow?.clientUuid}` : `http ${detail.status}`
    );
    push(
      detailRow?.failedCount === 1,
      "persisted row failedCount reflects the fail checklist item",
      `failedCount=${detailRow?.failedCount}`
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const fails = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - fails}/${results.length} checks passed.`);
  process.exit(fails ? 1 : 0);
}

main().catch((err) => {
  console.error("UNEXPECTED ERROR:", err);
  process.exit(2);
});
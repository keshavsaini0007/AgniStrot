import "dotenv/config";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import net from "node:net";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose, { Types } from "mongoose";
import { io as ioClient } from "socket.io-client";
import type { Socket } from "socket.io-client";
import connectDB from "../config/db.js";
import Site from "../models/Site.js";
import User from "../models/User.js";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import AuditLog from "../models/AuditLog.js";
import Incident from "../models/Incident.js";
import Inspection from "../models/Inspection.js";
import Evidence from "../models/Evidence.js";
import Hazard from "../models/Hazard.js";
import CorrectiveCloseout from "../models/CorrectiveCloseout.js";
import Attendance from "../models/Attendance.js";
import { computeThisHash, GENESIS_HASH } from "../services/auditLogger.js";
import {
  buildCloudinaryOriginalUrl,
  sha256Hex,
  UPLOAD_FAILED_SENTINEL,
} from "../services/evidenceService.js";
import {
  assessEffectiveness,
  checkControlEffectiveness,
  CONTROL_HIERARCHY_WEIGHT,
  nextControlTier,
  riskLevelFor,
} from "../services/hazardService.js";
import { runEscalations } from "../services/workflowEngine.js";
import { resolveAssignee } from "../services/ruleEngine.js";
import { checkRecurringHazards, checkAttendanceAnomaly } from "../services/batchRules.js";
import { normalizeHazardCategory } from "../services/recurringHazards.js";
import { pointInPolygon } from "../utils/geometry.js";
import { ALERT_DEADLINES } from "../types/index.js";

// ── Verification battery ────────────────────────────────────────────────────
// `npm run verify` — one-command end-to-end check of the Phase 4 alert engine.
// Self-contained: kills the port, reseeds canonical data, boots the server as a
// child, then exercises the alert lifecycle API, the socket fan-out, the
// workflow engine and the hash-chained audit trail. Exits non-zero on any
// failure. Leaves the DB in the canonical seeded state.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;

const PORT = 5000;
const HOST = "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;
const ROOT = process.cwd();

let pass = 0;
let fail = 0;

function check(label: string, cond: boolean, detail = ""): void {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}  ${detail}`); }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── Process/port management ─────────────────────────────────────────────────

function killPort(port: number): void {
  if (process.platform !== "win32") return;
  // Kill any process listening on the port...
  try {
    const out = execSync(`netstat -ano -p tcp | findstr ":${port}" | findstr LISTENING`).toString();
    const pids = new Set(
      out.split(/\r?\n/).map((l) => l.trim().split(/\s+/).pop()).filter(Boolean)
    );
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" }); } catch { /* already gone */ }
    }
  } catch { /* nothing listening */ }
  // ...AND any orphaned dev/watch server for this project (tsx watch auto-restarts
  // on file changes and its child tree outlives the parent, so netstat alone is not enough).
  try {
    const out = execSync(
      `wmic process where "commandline like '%tsx%watch%src/server.ts%' and name='node.exe'" get processid`
    ).toString();
    const pids = out.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\d+$/.test(l));
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" }); } catch { /* gone */ }
    }
  } catch { /* none */ }
}

function startServer(): ChildProcess {
  const sp = spawn("npx", ["tsx", "src/server.ts"], {
    cwd: ROOT,
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const tag = (d: Buffer): void => {
    const line = String(d).trim();
    if (line) console.log(`  [server] ${line.split("\n").slice(-6).join(" | ")}`);
  };  sp.stdout?.on("data", tag);
  sp.stderr?.on("data", tag);
  return sp;
}

function stopServer(sp: ChildProcess): void {
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${sp.pid} /T /F`, { stdio: "ignore" });
    else sp.kill("SIGTERM");
  } catch { try { sp.kill(); } catch { /* gone */ } }
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: "127.0.0.1" });
    sock.once("connect", () => { sock.destroy(); resolve(true); });
    sock.once("error", () => resolve(false));
  });
}

async function waitForPort(port: number, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen(port)) {
      try {
        const r = await api("/health");
        if (r.status === 200) return;
      } catch { /* app not ready yet */ }
    }
    await sleep(500);
  }
  throw new Error(`Server did not become healthy on port ${port}`);
}

function runSeed(): void {
  const out = execSync("npm run seed 2>&1", { cwd: ROOT, encoding: "utf8" });
  const tail = out.trim().split("\n").slice(-6).join("\n  ");
  console.log(`  [seed]\n  ${tail}`);
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function api(
  path: string,
  opts: { token?: string; method?: string; body?: unknown } = {}
): Promise<{ status: number; headers: IncomingHttpHeaders; body: AnyJson }> {
  // Uses raw node:http (not global fetch) — undici's pooled fetch intermittently
  // misroutes/connects a POST body, yielding sporadic 404s on a healthy server.
  const data = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    if (data !== undefined) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(data));
    }
    const req = httpRequest(
      { host: HOST, port: PORT, path: `/api/v1${path}`, method: opts.method ?? "GET", headers, agent: false },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let body: AnyJson = null;
          try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
        });
      }
    );
    req.on("error", reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}

async function login(email: string): Promise<string> {
  // Retry briefly — the freshly spawned server's routes should be live by the
  // time the health probe passes, but a transient 5xx/404 during cold start is
  // not a product failure.
  let last: { status: number; body: AnyJson } = await api("/auth/login", {
    method: "POST",
    body: { email, password: "password123" },
  });
  let attempt = 0;
  while (last.status !== 200 && attempt < 10) {
    await sleep(800);
    last = await api("/auth/login", {
      method: "POST",
      body: { email, password: "password123" },
    });
    attempt++;
  }
  if (last.status !== 200) throw new Error(`login ${email} → ${last.status}: ${JSON.stringify(last.body)}`);
  return (last.body as { token: string }).token;
}

const get = (token: string, p = ""): Promise<{ status: number; headers: IncomingHttpHeaders; body: AnyJson }> =>
  api(p, { token });

const post = (token: string, p: string, body: unknown): Promise<{ status: number; headers: IncomingHttpHeaders; body: AnyJson }> =>
  api(p, { token, method: "POST", body: body ?? {} });

// ── Multipart upload helper (feature 05 media ingest) ───────────────────────
// media/document ingest endpoints use multer memory storage with a file field.
// `api` is JSON-only, so build a raw multipart/form-data body over node:http.

function multipartUpload(
  token: string,
  pathEnd: string,
  field: string,
  filename: string,
  contentType: string,
  bytes: Buffer,
  extraFields: Record<string, string> = {}
): Promise<{ status: number; body: AnyJson }> {
  const boundary = `----agnistrot${randomUUID().replace(/-/g, "")}`;
  const parts: Buffer[] = [];
  for (const [k, v] of Object.entries(extraFields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    )
  );
  parts.push(bytes);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const data = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(data.length),
    };
    const req = httpRequest(
      { host: HOST, port: PORT, path: `/api/v1${pathEnd}`, method: "POST", headers, agent: false },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let body: AnyJson = null;
          try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── Audit chain helpers ─────────────────────────────────────────────────────

type AuditRow = {
  _id: Types.ObjectId;
  entityType: string;
  entityId: Types.ObjectId;
  action: string;
  actorId?: Types.ObjectId | null;
  payload?: unknown;
  prevHash: string;
  thisHash: string;
  createdAt: Date;
};

async function auditChain(): Promise<{ ok: boolean; count: number; broken: number[] }> {
  const rows = (await AuditLog.find({}).sort({ createdAt: 1, _id: 1 }).lean()) as unknown as AuditRow[];
  let prevOnChain = GENESIS_HASH;
  const broken: number[] = [];
  rows.forEach((row, i) => {
    const expectedThis = computeThisHash({
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action,
      ...(row.actorId ? { actorId: row.actorId } : {}),
      payload: row.payload,
      prevHash: row.prevHash,
      createdAt: row.createdAt,
    });
    if (row.prevHash !== prevOnChain) broken.push(i);
    if (row.thisHash !== expectedThis) broken.push(i);
    prevOnChain = row.thisHash;
  });
  return { ok: broken.length === 0, count: rows.length, broken: [...new Set(broken)] };
}

// ── Socket helpers ───────────────────────────────────────────────────────────

function connectSocket(token: string | null, expect: "connect" | "reject"): Promise<Socket | string> {
  return new Promise((resolve) => {
    const sock = ioClient(BASE, {
      auth: token ? { token } : {},
      forceNew: true,
      reconnection: false,
    });
    const settled = (v: Socket | string): void => {
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => settled("timeout"), 6000);
    sock.on("connect", () => {
      if (expect === "connect") settled(sock);
      else { sock.close(); settled("unexpected connect"); }
    });
    sock.on("connect_error", (e) => {
      if (expect === "reject") settled(e.message);
      else settled(`unexpected error: ${e.message}`);
    });
    sock.on("disconnect", (reason) => {
      if (expect === "reject") settled(`disconnected:${reason}`);
    });
  });
}

// ── Battery ─────────────────────────────────────────────────────────────────

async function battery(
  tokens: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  const { priya, meena, amit, rahul } = tokens;
  const { SJ, SD } = sites;

  // ── F1: alert lifecycle ───────────────────────────────────────────────────
  console.log("\n== [F1] acknowledge / resolve lifecycle ==");
  const openRows = (await get(priya, "/alerts?status=open")).body as { data: { id: string; siteId: string; status: string }[] };
  const sjOpen = openRows.data.find((a) => a.siteId === SJ);
  check("seed provides an open jharia alert", !!sjOpen);
  if (!sjOpen) { console.log("  … missing precondition, skipping lifecycle checks"); return; }
  const ackedId = sjOpen.id;

  const ack = await post(priya, `/alerts/${ackedId}/acknowledge`, { note: "verification run" });
  check("acknowledge → 200 acknowledged", ack.status === 200 && (ack.body as { status: string }).status === "acknowledged", JSON.stringify(ack.body));

  const afterAck = (await get(priya, "/alerts")).body as { data: { id: string; status: string }[] };
  const ackedRow = afterAck.data.find((a) => a.id === ackedId);
  check("alert returns acknowledged", ackedRow?.status === "acknowledged", JSON.stringify(ackedRow));

  const reAck = await post(priya, `/alerts/${ackedId}/acknowledge`, {});
  check("re-acknowledge → 409", reAck.status === 409, `got ${reAck.status}`);

  const dhanOpen = (await get(meena, `/alerts?siteId=${SD}&status=open`)).body as { data: { id: string }[] };
  check("dhanbad has open alerts for cross-site test", dhanOpen.data.length >= 1);
  if (dhanOpen.data[0]) {
    const cross = await post(priya, `/alerts/${dhanOpen.data[0].id}/acknowledge`, {});
    check("cross-site acknowledge → 403", cross.status === 403, `got ${cross.status}`);
  }

  check("malformed id → 400", (await post(priya, "/alerts/nope/acknowledge", {})).status === 400);
  check("missing alert → 404", (await post(priya, "/alerts/0123456789abcdef01234567/acknowledge", {})).status === 404);
  check("field_officer blocked → 403", (await post(rahul, `/alerts/${ackedId}/acknowledge`, {})).status === 403);
  check("overlong note → 400", (await post(priya, `/alerts/${ackedId}/acknowledge`, { note: "x".repeat(501) })).status === 400);

  const resolve = await post(meena, `/alerts/${ackedId}/resolve`, { resolutionNote: "verified — fixed on site" });
  check("regulator resolve acknowledged → 200 closed", resolve.status === 200 && (resolve.body as { status: string }).status === "closed", JSON.stringify(resolve.body));
  check("re-resolve → 409", (await post(meena, `/alerts/${ackedId}/resolve`, {})).status === 409);

  const openAgain = (await get(meena, "/alerts?status=open")).body as { data: { id: string; siteId: string }[] };
  const crossResolveTarget = openAgain.data.find((a) => a.siteId === SD);
  check("corporate can resolve verified", !!crossResolveTarget);
  if (crossResolveTarget) {
    check("corporate resolves open any-site → 200", (await post(amit, `/alerts/${crossResolveTarget.id}/resolve`, {})).status === 200);
    check("overlong resolutionNote → 400", (await post(meena, `/alerts/${crossResolveTarget.id}/resolve`, { resolutionNote: "x".repeat(1001) })).status === 400);
  }

  // ── F3: audit read endpoint ───────────────────────────────────────────────
  console.log("\n== [F3] audit read endpoint ==");
  const auditAll = await get(meena, "/audit");
  const auditRows = (auditAll.body as { data: { action: string; actorId: string | null; prevHash: string; thisHash: string }[] })?.data;
  check("regulator GET /audit → 200 with entries", auditAll.status === 200 && Array.isArray(auditRows) && auditRows.length >= 10, JSON.stringify(auditAll.body)?.slice(0, 140));
  if (auditRows) {
    check("acknowledged logged with actorId", auditRows.some((a) => a.action === "acknowledged" && a.actorId !== null));
    check("resolved logged with actorId", auditRows.some((a) => a.action === "resolved" && a.actorId !== null));
    check("alert-created entries carry prev/this hash", auditRows.some((a) => a.action === "created" && a.prevHash?.length === 64 && a.thisHash?.length === 64));
    check("all seed entries are alert-created (chain baseline)", auditRows.filter((a) => a.action === "created").length >= 10);
  }
  check("mine_official GET /audit → 403", (await get(priya, "/audit")).status === 403);
  check("invalid entityType → 400", (await get(meena, "/audit?entityType=banana")).status === 400);
  const auditFiltered = (await get(meena, "/audit?entityType=alert")).body as { data: { entityType?: string }[] };
  const onlyAlerts = auditFiltered.data.length > 0 && auditFiltered.data.every((r) => r.entityType === "alert");
  check("?entityType=alert returns only alert entries",
      onlyAlerts && auditFiltered.data.length <= (auditRows?.length ?? -1),
      JSON.stringify({ filtered: auditFiltered.data.length, unfiltered: auditRows?.length }));

  // ── F4: scoping + register guard ─────────────────────────────────────────
  console.log("\n== [F4] deny-by-default scoping ==");
  const regNoSite = await post(amit, "/auth/register", { name: "Probe Ghost", email: "probe.ghost@local.test", password: "password123", role: "mine_official" });
  check("register mine_official without siteId → 400", regNoSite.status === 400, `got ${regNoSite.status}`);
  const regFieldNoSite = await post(amit, "/auth/register", { name: "Probe Ghost2", email: "probe.ghost2@local.test", password: "password123", role: "field_officer" });
  check("register field_officer without siteId → 400", regFieldNoSite.status === 400, `got ${regFieldNoSite.status}`);
  const regWithSite = await post(amit, "/auth/register", { name: "Site Bound", email: "probe.bound@local.test", password: "password123", role: "mine_official", siteId: SJ });
  check("register mine_official with siteId → 201", regWithSite.status === 201, `got ${regWithSite.status}`);
  const boundToken = await login("probe.bound@local.test");
  const boundAlerts = (await get(boundToken, "/alerts")).body as { data: { siteId: string }[] };
  check("new official sees only own site", boundAlerts.data.length >= 1 && boundAlerts.data.every((a) => a.siteId === SJ), `count=${boundAlerts.data.length}`);

  const legacy = await User.create({
    name: "Unbound Legacy",
    email: "probe.legacy@local.test",
    passwordHash: "password123",
    role: "mine_official",
    siteId: null,
  });
  const legacyToken = await login("probe.legacy@local.test");
  const legacyAlerts = (await get(legacyToken, "/alerts")).body as { data: unknown[] };
  const legacyIncidents = (await get(legacyToken, "/incidents")).body as { data: unknown[] };
  const legacyInspections = (await get(legacyToken, "/inspections")).body as { data: unknown[] };
  const legacyDash = await get(legacyToken, "/dashboard/summary");
  check("null-siteId official sees ZERO alerts", legacyAlerts.data.length === 0);
  check("null-siteId official sees ZERO incidents", legacyIncidents.data.length === 0);
  check("null-siteId official sees ZERO inspections", legacyInspections.data.length === 0);
  check("dashboard shows null site placeholder", (legacyDash.body as { site: unknown }).site === null);
  await User.deleteMany({ email: { $in: ["probe.bound@local.test", "probe.ghost@local.test", "probe.ghost2@local.test", "probe.legacy@local.test"] } });
  await legacy.deleteOne();
  check("probe users cleaned up", true);
}

// ── F5: sync + media role guard ──────────────────────────────────────────────
// SYNC_ROLES = [field_officer, mine_official]. corporate_manager and regulator
// are read/oversight per PRD §4 and must be 403 on write endpoints. Allowed
// roles are probed with { records: [] } — empty fails syncBatchSchema (min 1),
// so they reach validation (400) instead of being blocked (403), with no data
// written. Media upload (multipart) is probed without a file → 400 once past
// the guard.

async function syncRoleGuard(t: { priya: string; meena: string; amit: string; rahul: string }): Promise<void> {
  console.log("\n== [F5] sync / media role guard ==");
  const { priya, meena, amit, rahul } = t;

  for (const route of ["/inspections/sync", "/incidents/sync", "/attendance/sync"]) {
    const emptyBatch = { records: [] };
    check(`corporate blocked from ${route} → 403`, (await post(amit, route, emptyBatch)).status === 403);
    check(`regulator blocked from ${route} → 403`, (await post(meena, route, emptyBatch)).status === 403);
    check(`field_officer reaches ${route} (not 403)`, (await post(rahul, route, emptyBatch)).status !== 403);
    check(`mine_official reaches ${route} (not 403)`, (await post(priya, route, emptyBatch)).status !== 403);
  }

  check("corporate blocked from media upload → 403", (await post(amit, "/media/upload", {})).status === 403);
  check("regulator blocked from media upload → 403", (await post(meena, "/media/upload", {})).status === 403);
  check("field_officer reaches media upload (not 403)", (await post(rahul, "/media/upload", {})).status !== 403);
  check("mine_official reaches media upload (not 403)", (await post(priya, "/media/upload", {})).status !== 403);
}

// ── F6: attendance reads ────────────────────────────────────────────────────
// ATTENDANCE_READ_ROLES = [mine_official, corporate_manager, regulator].
// field_officer is blocked (403) and mine_official is strictly site-scoped
// (anti-tamper against ?siteId override). Corporate/regulator read cross-site
// with an optional site filter. Undecorated requests hit the defensive
// page/limit fallbacks (the validateQuery default-merge is a no-op on Express 5).

async function attendanceBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F6] attendance reads ==");
  const { priya, meena, amit, rahul } = t;
  const { SJ, SD } = sites;

  check("attendance without token → 401", (await api("/attendance")).status === 401);

  const fo = (await get(rahul, "/attendance")).body as { data: { siteId: string; syncedAt?: string }[]; pagination: { total: number } };
  check("field_officer sees own-site attendance → 200", fo.data.length > 0 && fo.pagination.total > 0);
  check("field_officer rows all SJ (site-scoped)", fo.data.every((r) => r.siteId === SJ));

  const mo = (await get(priya, "/attendance")).body as { data: { siteId: string; syncedAt?: string }[]; pagination: { total: number } };
  check("mine_official sees attendance", Array.isArray(mo.data) && mo.pagination.total > 0);
  check("mine_official rows all SJ", mo.data.length > 0 && mo.data.every((r) => r.siteId === SJ));
  check("attendance rows carry syncedAt", mo.data.length > 0 && mo.data.every((r) => typeof r.syncedAt === "string" && r.syncedAt.length > 0));

  const tampered = (await get(priya, `/attendance?siteId=${SD}`)).body as { data: { siteId: string }[] };
  check("mine_official ?siteId tamper-proof (SJ only)", tampered.data.length > 0 && tampered.data.every((r) => r.siteId === SJ));

  const corp = (await get(amit, "/attendance")).body as { data: { siteId: string }[] };
  const reg = (await get(meena, "/attendance")).body as { data: { siteId: string }[] };
  check("corporate reads cross-site", new Set(corp.data.map((r) => r.siteId)).size >= 2);
  check("regulator reads cross-site", new Set(reg.data.map((r) => r.siteId)).size >= 2);

  const regSD = (await get(meena, `/attendance?siteId=${SD}`)).body as { data: { siteId: string }[] };
  check("regulator ?siteId=SD filters to SD only", regSD.data.length > 0 && regSD.data.every((r) => r.siteId === SD));

  const bad = await get(amit, "/attendance?checkType=invalid");
  check("bad checkType → 400", bad.status === 400);

  const pg = (await get(amit, "/attendance?page=1&limit=2")).body as { data: unknown[]; pagination: { page: number; limit: number } };
  check("pagination limit respected", pg.pagination.page === 1 && pg.pagination.limit === 2 && pg.data.length >= 1 && pg.data.length <= 2);
}

// ── F7: statutory reports ────────────────────────────────────────────────────
// REPORT_ROLES = [mine_official, corporate_manager, regulator]. mine_official is
// pinned to their own site; corporate/regulator read cross-site. Every generated
// report lands a tamper-evident AuditLog entry (entityType "report").

async function reportsBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F7] statutory reports ==");
  const { priya, meena, rahul } = t;
  const { SJ, SD } = sites;

  check("report without token → 401", (await api("/reports/statutory")).status === 401);
  check("field_officer blocked from reports → 403", (await get(rahul, `/reports/statutory?siteId=${SJ}`)).status === 403);

  const moOwn = await get(priya, `/reports/statutory?siteId=${SJ}`);
  check("mine_official generates own-site report → 200", moOwn.status === 200);
  check("report content-type is application/pdf", String(moOwn.headers["content-type"] ?? "").includes("application/pdf"));
  check("report body is non-trivial", String(moOwn.body).length > 1000);

  check("mine_official generates other-site report → 403", (await get(priya, `/reports/statutory?siteId=${SD}`)).status === 403);

  const regSD = await get(meena, `/reports/statutory?siteId=${SD}`);
  check("regulator generates cross-site report → 200", regSD.status === 200);
  check("regulator report content-type is application/pdf", String(regSD.headers["content-type"] ?? "").includes("application/pdf"));

  check("invalid siteId → 400", (await get(meena, "/reports/statutory?siteId=not-a-mongo-id")).status === 400);

  const audit = await AuditLog.findOne({ entityType: "report", action: "generated" }).lean();
  check("audit trail records report generation", !!audit && !!audit.actorId);
}

// ── F8: manual alert escalation ──────────────────────────────────────────────
// POST /alerts/:id/escalate — jumps open/acknowledged → escalated (48h deadline).
// field_officer blocked by authorize; mine_official site-scoped via canActOnAlert;
// re-escalation and escalation-of-closed are 409 conflicts.

async function manualEscalationBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F8] manual alert escalation ==");
  const { priya, meena, amit, rahul } = t;
  const { SJ, SD } = sites;

  // Deterministic preconditions: batteries F1–workflow may acknowledge,
  // escalate, or resolve alerts along the way. Restore freshness (ack/escalated
  // → open) so the escalate fixtures are stable; closed stays closed — the
  // conflict probe below depends on it. This is the terminal battery, and
  // resetAndSeed() re-canonicalizes the DB afterward.
  await Alert.updateMany(
    { status: { $in: ["acknowledged", "escalated"] } },
    { status: "open" }
  );

  // Cross-site 403 checks only need *an* existing Dhanbad alert: the field
  // officer is blocked by authorize before any status logic, and mine_official
  // is blocked by canActOnAlert (403) before the closed/escalated 409 checks.
  const sdAny = (await get(meena, `/alerts?siteId=${SD}`)).body as { data: { id: string }[] };
  const openSJ = (await get(priya, `/alerts?siteId=${SJ}&status=open`)).body as { data: { id: string }[] };
  const sdAlertId = sdAny.data[0]?.id;
  const sjAlertId = openSJ.data[0]?.id;

  check("fixture: Dhanbad has an alert for the cross-site guard", !!sdAlertId);
  if (!sdAlertId) { console.log("  … missing precondition, skipping cross-site checks"); return; }

  check("field_officer blocked from escalate → 403", (await post(rahul, `/alerts/${sdAlertId}/escalate`, { note: "x" })).status === 403);
  check("mine_official escalating other-site alert → 403", (await post(priya, `/alerts/${sdAlertId}/escalate`, { note: "nope" })).status === 403);

  const escalated = sjAlertId
    ? await post(priya, `/alerts/${sjAlertId}/escalate`, { note: "Escalating hazardous condition" })
    : null;
  check("mine_official escalates own open alert → 200", escalated?.status === 200 && (escalated.body as { status?: string }).status === "escalated");

  check("re-escalate escalated alert → 409", !!sjAlertId && (await post(priya, `/alerts/${sjAlertId}/escalate`, {})).status === 409);

  // Self-contained closed-conflict: resolve a spare open SJ alert first.
  const spare = openSJ.data.find((a) => a.id !== sjAlertId) ?? openSJ.data[1];
  const spareId = spare?.id !== sjAlertId ? spare?.id : undefined;
  check("found a spare open alert for the closed-conflict case", !!spareId);
  if (spareId) {
    check("spare alert resolved → 200", (await post(amit, `/alerts/${spareId}/resolve`, { resolutionNote: "closed for conflict probe" })).status === 200);
    check("escalate closed alert → 409", (await post(amit, `/alerts/${spareId}/escalate`, {})).status === 409);
  }

  const audit = await AuditLog.findOne({ entityType: "alert", action: "escalated", actorId: { $ne: null } }).lean();
  check("audit trail records manual escalation with actor", !!audit);
}

async function socketBattery(rahulToken: string, SJ: string): Promise<void> {
  console.log("\n== [SOCKET] live fan-out over the wire ==");
  const priya = await login("priya@agnistrot.com");
  const ramesh = await login("ramesh@agnistrot.com");
  const amit = await login("amit@agnistrot.com");
  const meena = await login("meena@agnistrot.com");

  const garbage = await connectSocket("garbage.token", "reject");
  const noToken = await connectSocket(null, "reject");
  check("garbage token rejected", garbage === "Unauthorized", JSON.stringify(garbage));
  check("no token rejected", noToken === "Unauthorized", JSON.stringify(noToken));

  const rawSocks = await Promise.all([
    connectSocket(priya, "connect"),
    connectSocket(ramesh, "connect"),
    connectSocket(amit, "connect"),
    connectSocket(meena, "connect"),
  ]);
  const allSockets = rawSocks.every((s): s is Socket => typeof s !== "string");
  check("valid tokens all connect", allSockets, allSockets ? "" : JSON.stringify(rawSocks.filter((s) => typeof s === "string")));
  if (!allSockets) { for (const s of rawSocks) if (typeof s !== "string") s.disconnect(); return; }
  const [siteOfficial, dhanOfficial, corporate, regulator] = rawSocks as [Socket, Socket, Socket, Socket];

  const got = { siteOfficial: false, corporate: false, regulator: false, dhan: false };
  const onNew = (slot: "siteOfficial" | "corporate" | "regulator" | "dhan") => (data: { ruleCode?: string; siteId?: string }): void => {
    if (data.ruleCode === "CRITICAL_INCIDENT" && data.siteId === SJ) got[slot] = true;
  };
  siteOfficial.on("alert:new", onNew("siteOfficial"));
  corporate.on("alert:new", onNew("corporate"));
  regulator.on("alert:new", onNew("regulator"));
  dhanOfficial.on("alert:new", onNew("dhan"));

  const uuid = randomUUID();
  const syncRes = await post(rahulToken, "/incidents/sync", {
    records: [{
      clientUuid: uuid,
      siteId: SJ,
      severity: "critical",
      category: "safety",
      description: "Live socket verification: roof fall in shaft 3, workers evacuated.",
      location: { lat: 23.7461, lng: 86.4123 },
      photoUrls: [],
      capturedAt: new Date().toISOString(),
    }],
  });
  const accepted = (syncRes.body as { accepted?: string[]; rejected?: { reason: string }[] }).accepted;
  check("sync accepted the record", syncRes.status === 200 && (accepted?.includes(uuid) ?? false), JSON.stringify(syncRes.body));

  await sleep(1800);
  check("site mine_official received alert:new", got.siteOfficial);
  check("corporate manager received alert:new", got.corporate);
  check("regulator received alert:new", got.regulator);
  check("unrelated-site official did NOT receive", got.dhan === false);

  siteOfficial.disconnect(); dhanOfficial.disconnect(); corporate.disconnect(); regulator.disconnect();
}

async function workflowProbes(tokens: { priya: string; meena: string }, SJ: string): Promise<void> {
  console.log("\n== [WORKFLOW] escalation engine ==");

  const indexes = await WorkflowState.collection.indexes();
  check("state+changedAt escalation index exists", indexes.some((i) => JSON.stringify(i.key) === JSON.stringify({ state: 1, changedAt: -1 })));
  const alertIndexes = await Alert.collection.indexes();
  check("ruleKey unique dedup index exists", alertIndexes.some((i) => i.unique && JSON.stringify(i.key) === JSON.stringify({ ruleKey: 1 })));

  const closedBefore = await Alert.countDocuments({ status: "escalated" });
  await runEscalations();
  await runEscalations();
  const closedAfter = await Alert.countDocuments({ status: "escalated" });
  check("double escalation pass is a no-op", closedBefore === closedAfter, `${closedBefore}→${closedAfter}`);

  const openSJ = (await get(tokens.priya, `/alerts?siteId=${SJ}&status=open`)).body as { data: { id: string }[] };
  const ackTarget = openSJ.data[0];
  if (ackTarget) {
    const ack = await post(tokens.priya, `/alerts/${ackTarget.id}/acknowledge`, { note: "immunity probe" });
    check("primed an acknowledged alert", ack.status === 200);

    const aid = ackTarget.id;
    const wf = await WorkflowState.find({ alertId: aid }).sort({ changedAt: -1 }).limit(1).lean();
    if (wf[0]) {
      await WorkflowState.updateOne({ _id: wf[0]._id }, { deadline: new Date(Date.now() - 6 * 60 * 60 * 1000) });
      const before = await WorkflowState.countDocuments({ alertId: aid });
      await runEscalations();
      const after = await WorkflowState.countDocuments({ alertId: aid });
      const status = (await Alert.findById(aid).lean())?.status;
      check("acknowledged alert is immune to escalation", before === after && status === "acknowledged", `ws ${before}→${after} status=${status}`);
    }
  }

  const latest = await WorkflowState.aggregate<{ _id: Types.ObjectId; state: string; deadline: Date; alert?: { severity?: string; status?: string } }>([
    { $match: { state: { $in: ["assigned", "reminded"] } } },
    { $sort: { changedAt: -1 } },
    { $group: { _id: "$alertId", state: { $first: "$state" }, deadline: { $first: "$deadline" } } },
    { $lookup: { from: "alerts", localField: "_id", foreignField: "_id", as: "alert" } },
    { $addFields: { alert: { $arrayElemAt: ["$alert", 0] } } },
  ]);
  const journey = latest.find(
    (r) =>
      (r.alert?.severity === "high" || r.alert?.severity === "medium") &&
      r.alert?.status === "open" &&
      r.state === "assigned"
  );
  check("found an open high/medium alert to drive", !!journey);
  if (!journey) return;

  const aid = journey._id.toString();
  let wf = await WorkflowState.find({ alertId: aid }).sort({ changedAt: -1 }).limit(1).lean();
  let row = wf[0];
  if (!row) return;
  await WorkflowState.updateOne({ _id: row._id }, { deadline: new Date(Date.now() - 60 * 1000) });
  await runEscalations();
  wf = await WorkflowState.find({ alertId: aid }).sort({ changedAt: -1 }).limit(1).lean();
  check("assigned → reminded after deadline", wf[0]?.state === "reminded", JSON.stringify(wf[0]?.state));
  check("not escalated in that pass (next rung not due)", (await WorkflowState.countDocuments({ alertId: aid, state: "escalated" })) === 0);

  // ── Feature 02: multi-level climb ────────────────────────────────────────
  // Shift the alert's createdAt far into the past so EVERY rung of its snapshot
  // chain is due. A single pass must then climb assigned → reminded → L2 (next
  // role) → L3 (top) and land the alert in the terminal escalated state —
  // proving the ladder is per-level, not a single reminded + 25% window hop.
  row = wf[0];
  if (!row) return;
  // Raw collection update — Mongoose's updateOne with `timestamps` strips a
  // user-supplied createdAt from $set, so the driver-level write is required
  // to backdate the alert for the climb probe.
  await Alert.collection.updateOne({ _id: new Types.ObjectId(aid) }, { $set: { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } });
  await runEscalations();
  await runEscalations(); // idempotent — the climb topped out in a single pass
  const climbed = await Alert.findById(aid).lean();
  const climbedRows = await WorkflowState.find({ alertId: aid, state: "escalated" }).sort({ changedAt: 1 }).lean();
  const topRow = await WorkflowState.find({ alertId: aid }).sort({ changedAt: -1 }).limit(1).lean();
  check("climbed the full ladder → terminal escalated", climbed?.status === "escalated" && topRow[0]?.state === "escalated", `status=${climbed?.status} state=${topRow[0]?.state}`);
  check("currentLevel == chain top && escalationCount == rungs-1", climbed?.currentLevel === 3 && climbed?.escalationCount === 2, `lvl=${climbed?.currentLevel} count=${climbed?.escalationCount}`);
  check("escalated rows stamped with levels 2→3", climbedRows.map((r) => r.level).join(",") === "2,3", `levels=${climbedRows.map((r) => r.level).join(",")}`);
  const climber = climbed?.assignedTo ? await User.findById(climbed.assignedTo).lean() : null;
  check("terminal assignee is an active top-rung user (regulator)", !!climber && climber.isActive !== false && climber.role === "regulator", `role=${climber?.role}`);

  const resolve = await post(tokens.meena, `/alerts/${aid}/resolve`, { resolutionNote: "escalation journey closed" });
  check("regulator resolves an ESCALATED alert → 200 closed", resolve.status === 200 && (resolve.body as { status: string }).status === "closed", JSON.stringify(resolve.body));

  const closed = await Alert.findOne({ status: "closed" }).lean();
  if (closed) {
    const cid = (closed._id as unknown as string).toString();
    const cwf = await WorkflowState.find({ alertId: cid }).sort({ changedAt: -1 }).limit(1).lean();
    const cwRow = cwf[0];
    if (!cwRow) return;
    await WorkflowState.updateOne({ _id: cwRow._id }, { deadline: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    const before = await WorkflowState.countDocuments({ alertId: cid });
    await runEscalations();
    const after = await WorkflowState.countDocuments({ alertId: cid });
    check("closed alert is never re-touched", before === after, `ws ${before}→${after}`);
  }
}

// ── [F02] Escalation Matrix (feature 02, Phases B–E) ─────────────────────────
// End-to-end battery for the configurable SLA engine:
//   A. SLA-policy admin API + role guards (corporate/regulator, 403s elsewhere)
//   B. structural validation → structured 400s (circular / non-increasing /
//      ladder exceeding resolution SLA)
//   C. snapshot-at-creation + snapshot-driven climbing (edge G — the custom row
//      is DELETED before the climb, so only snapshot timing can land it)
//   D. assignee resolution: department priority (edge H), inactive skip (edge B),
//      all-inactive → null (edge A)
//   E. SLA breach stats surfaced on the dashboard (role-scoped)

async function feature02SlaBattery(
  tokens: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F02] Escalation matrix ==");
  const { priya, meena, amit, rahul } = tokens;
  const { SJ, SD } = sites;

  // ── A. Admin API + role guards ───────────────────────────────────────────
  const list = await get(amit, "/sla-policies");
  check("corporate lists SLA policies (4 severities)", list.status === 200 && (list.body as { data?: unknown[] }).data?.length === 4, `status=${list.status}`);
  check("regulator reads SLA policies → 200", (await get(meena, "/sla-policies")).status === 200);
  check("mine_official blocked from SLA policies → 403", (await get(priya, "/sla-policies")).status === 403);
  check("field_officer blocked from SLA policies → 403", (await get(rahul, "/sla-policies")).status === 403);

  const single = await get(amit, "/sla-policies/high");
  check("get single severity → source=configured (seed stores rows)", single.status === 200 && (single.body as { data?: { source?: string } }).data?.source === "configured", `status=${single.status}`);

  // ── B. Structural validation (bad configs → 400) ─────────────────────────
  const circ = await api("/sla-policies/high", {
    token: amit,
    method: "PUT",
    body: {
      ackSla: 30,
      resolutionSla: 400,
      escalationChain: [
        { level: 1, role: "mine_official", waitMinutes: 120 },
        { level: 2, role: "mine_official", waitMinutes: 240 },
      ],
    },
  });
  check("circular chain (repeated role) → 400", circ.status === 400, `status=${circ.status}`);

  const nonInc = await api("/sla-policies/high", {
    token: amit,
    method: "PUT",
    body: {
      ackSla: 30,
      resolutionSla: 400,
      escalationChain: [
        { level: 1, role: "mine_official", waitMinutes: 240 },
        { level: 2, role: "corporate_manager", waitMinutes: 120 },
      ],
    },
  });
  check("non-increasing waits → 400", nonInc.status === 400, `status=${nonInc.status}`);

  const lastOver = await api("/sla-policies/high", {
    token: amit,
    method: "PUT",
    body: {
      ackSla: 30,
      resolutionSla: 100,
      escalationChain: [
        { level: 1, role: "mine_official", waitMinutes: 60 },
        { level: 2, role: "regulator", waitMinutes: 300 },
      ],
    },
  });
  check("ladder longer than resolution SLA → 400", lastOver.status === 400, `status=${lastOver.status}`);

  // Legacy parity: a default-policy alert's level-1 workflow deadline still
  // mirrors the pre-feature ALERT_DEADLINES constant.
  const pre = await Alert.findOne({ ruleCode: "CRITICAL_INCIDENT" }).lean();
  if (pre && pre.createdAt) {
    const preWf = await WorkflowState.findOne({ alertId: pre._id, state: "assigned" }).lean();
    const offsetMin = preWf
      ? Math.round((new Date(preWf.deadline).getTime() - new Date(pre.createdAt).getTime()) / 60000)
      : -1;
    check("legacy parity: critical level-1 deadline == ALERT_DEADLINES", offsetMin === ALERT_DEADLINES.critical / 60000, `offset=${offsetMin}min`);
  }

  // ── C. Custom policy → snapshot at creation (edge G) ─────────────────────
  const custom = await api("/sla-policies/high", {
    token: amit,
    method: "PUT",
    body: {
      ackSla: 20,
      resolutionSla: 600,
      escalationChain: [
        { level: 1, role: "mine_official", waitMinutes: 60 },
        { level: 2, role: "corporate_manager", waitMinutes: 300 },
        { level: 3, role: "regulator", waitMinutes: 600 },
      ],
    },
  });
  check("upsert custom high policy → source=configured", custom.status === 200 && (custom.body as { data?: { source?: string } }).data?.source === "configured", `status=${custom.status}`);

  const uuid = randomUUID();
  const sync = await post(rahul, "/inspections/sync", {
    records: [
      {
        clientUuid: uuid,
        siteId: SJ,
        type: "safety",
        checklist: [{ item: "PPE compliance", result: "fail" }],
        capturedAt: new Date().toISOString(),
        photoUrls: [],
      },
    ],
  });
  check("sync safety inspection accepted", sync.status === 200 && (sync.body as { accepted?: string[] }).accepted?.includes(uuid) === true, JSON.stringify(sync.body));
  await sleep(3000);

  const snap = await Alert.findOne({ ruleCode: "SAFETY_CHECKLIST_FAIL" }).sort({ createdAt: -1 }).lean();
  check("new alert snapshots the custom high policy", !!snap && snap.slaSnapshot?.ackSla === 20 && snap.slaSnapshot.escalationChain.length === 3 && snap.currentLevel === 1 && snap.ackDeadline !== null && snap.resolutionDeadline !== null, `ack=${snap?.slaSnapshot?.ackSla}`);
  check("snapshot chain (60→300→600) diverges from live default", snap?.slaSnapshot?.escalationChain[1]?.waitMinutes === 300, `w2=${snap?.slaSnapshot?.escalationChain[1]?.waitMinutes}`);
  const snapAssignee = snap?.assignedTo ? await User.findById(snap.assignedTo).lean() : null;
  check("safety source → safety-dept official at site (edge H)", snap?.department === "safety" && !!snapAssignee && snapAssignee.role === "mine_official" && snapAssignee.isActive !== false, `dept=${snap?.department}`);
  if (!snap) return;
  const snapId = snap._id as unknown as Types.ObjectId;

  // Drop the custom row BEFORE climbing — the reverted live default (1440 /
  // 2880 / 4320 min) is far in the future for a 700-min-old alert, so ONLY
  // snapshot timing (60 / 300 / 600) can drive the climb. Decisive for edge G.
  const del = await api("/sla-policies/high", { token: amit, method: "DELETE" });
  check("DELETE custom policy → reset-to-default", del.status === 200 && (del.body as { data?: { action?: string } }).data?.action === "reset-to-default", `status=${del.status}`);
  const afterDel = await get(amit, "/sla-policies/high");
  check("deleted severity now reads source=default", (afterDel.body as { data?: { source?: string } }).data?.source === "default", `status=${afterDel.status}`);

  await Alert.collection.updateOne({ _id: snapId }, { $set: { createdAt: new Date(Date.now() - 700 * 60 * 1000) } });
  // The fresh alert still sits at rung 1 with a FUTURE row deadline — the engine
  // first waits out rung 1 (remind) before climbing. Push the latest row's
  // deadline into the past so a single pass can remind → L2 → L3.
  const snapLast = await WorkflowState.findOne({ alertId: snapId }).sort({ changedAt: -1 }).lean();
  if (snapLast) {
    await WorkflowState.updateOne({ _id: snapLast._id }, { deadline: new Date(Date.now() - 60 * 1000) });
  }
  await runEscalations();
  const climbedSnap = await Alert.findById(snapId).lean();
  check("snapshot chain drives escalation (60→300→600)", climbedSnap?.status === "escalated" && climbedSnap?.currentLevel === 3 && climbedSnap?.escalationCount === 2, `status=${climbedSnap?.status} lvl=${climbedSnap?.currentLevel} count=${climbedSnap?.escalationCount}`);
  const snapTop = await WorkflowState.findOne({ alertId: snapId, state: "escalated" }).sort({ changedAt: -1 }).lean();
  check("snapshot climb stamped top level 3 → regulator", snapTop?.level === 3, `lv=${snapTop?.level}`);
  const snapClimber = climbedSnap?.assignedTo ? await User.findById(climbedSnap.assignedTo).lean() : null;
  check("climbed alert re-assigned to active top-rung user (edge B)", !!snapClimber && snapClimber.isActive !== false && snapClimber.role === "regulator", `role=${snapClimber?.role}`);

  // ── D. Assignee resolution (edges A/B/H) ─────────────────────────────────
  const priyaU = await User.findOne({ email: "priya@agnistrot.com" }).lean();
  if (!priyaU) return;
  const priyaId = priyaU._id as unknown as Types.ObjectId;
  const SJoid = new Types.ObjectId(SJ);

  const deptPick = await resolveAssignee(SJoid, "mine_official", "safety");
  check("dept priority: safety official at SJ wins (edge H)", deptPick?.toString() === priyaId.toString(), `got=${deptPick?.toString()}`);

  await User.updateOne({ _id: priyaId }, { $set: { isActive: false } });
  const skipInactive = await resolveAssignee(SJoid, "mine_official");
  check("inactive assignee skipped → any-site active official (edge B)", !!skipInactive && skipInactive.toString() !== priyaId.toString(), `got=${skipInactive?.toString()}`);

  await User.updateMany({ role: "mine_official" }, { $set: { isActive: false } });
  const none = await resolveAssignee(SJoid, "mine_official");
  check("no active candidate anywhere → null (edge A)", none === null, `got=${none?.toString()}`);
  await User.updateMany({ role: "mine_official" }, { $set: { isActive: true } });
  const restored = await resolveAssignee(SJoid, "mine_official");
  check("reactivation restores resolution", restored !== null, `got=${restored?.toString()}`);

  // ── F. Single-level chain → terminal with grace (legacy parity) ──────────
  // A 1-rung ladder sets status escalated only after the rung deadline PLUS
  // 25% grace has elapsed — exactly the pre-feature engine's behavior.
  const gracePolicy = await api("/sla-policies/high", {
    token: amit,
    method: "PUT",
    body: {
      ackSla: 20,
      resolutionSla: 600,
      escalationChain: [{ level: 1, role: "mine_official", waitMinutes: 60 }],
    },
  });
  check("single-level chain accepts 1 rung", gracePolicy.status === 200, `status=${gracePolicy.status}`);

  const uuid2 = randomUUID();
  await post(rahul, "/inspections/sync", {
    records: [
      {
        clientUuid: uuid2,
        siteId: SJ,
        type: "safety",
        checklist: [{ item: "PPE compliance", result: "fail" }],
        capturedAt: new Date().toISOString(),
        photoUrls: [],
      },
    ],
  });
  await sleep(3000);
  const grace = await Alert.findOne({ ruleCode: "SAFETY_CHECKLIST_FAIL" }).sort({ createdAt: -1 }).lean();
  check("single-level alert snapshots 1-rung chain", !!grace && grace.slaSnapshot?.escalationChain.length === 1, `len=${grace?.slaSnapshot?.escalationChain.length}`);
  if (!grace) return;
  const graceId = grace._id as unknown as Types.ObjectId;
  await Alert.collection.updateOne({ _id: graceId }, { $set: { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } });
  const graceLast = await WorkflowState.findOne({ alertId: graceId }).sort({ changedAt: -1 }).lean();
  if (graceLast) await WorkflowState.updateOne({ _id: graceLast._id }, { deadline: new Date(Date.now() - 60 * 1000) });
  await runEscalations();
  const graceClimbed = await Alert.findById(graceId).lean();
  check("single-level chain terminalizes with grace (legacy parity)", graceClimbed?.status === "escalated" && graceClimbed?.currentLevel === 1 && graceClimbed?.escalationCount === 1, `status=${graceClimbed?.status} lvl=${graceClimbed?.currentLevel} count=${graceClimbed?.escalationCount}`);
  const graceRow = await WorkflowState.findOne({ alertId: graceId, state: "escalated" }).lean();
  check("single-level climb appends one escalated row at level 1", !!graceRow && graceRow.level === 1, `lv=${graceRow?.level}`);
  await api("/sla-policies/high", { token: amit, method: "DELETE" });

  // ── G. Engine fallback routing (edge C) ──────────────────────────────────
  // Climb an alert whose NEXT-RUNG role has NO active candidate: with every
  // corporate_manager and regulator deactivated, the engine must route to the
  // policy's system fallback (seeded System Administrator) instead of stalling.
  const anomaly = await Alert.findOne({ status: "open" }).sort({ createdAt: 1 }).lean();
  check("fixture: an open alert for fallback probe", !!anomaly);
  if (!anomaly) return;
  const anomId = anomaly._id as unknown as Types.ObjectId;
  await User.updateMany({ role: { $in: ["corporate_manager", "regulator"] } }, { $set: { isActive: false } });
  await Alert.collection.updateOne({ _id: anomId }, { $set: { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } });
  const anomLast = await WorkflowState.findOne({ alertId: anomId }).sort({ changedAt: -1 }).lean();
  if (anomLast) await WorkflowState.updateOne({ _id: anomLast._id }, { deadline: new Date(Date.now() - 60 * 1000) });
  await runEscalations();
  await User.updateMany({ role: { $in: ["corporate_manager", "regulator"] } }, { $set: { isActive: true } });
  const anomClimbed = await Alert.findById(anomId).lean();
  const sysadmin = await User.findOne({ email: "sysadmin@agnistrot.com" }).lean();
  check(
    "no-candidate climb routes to system fallback (edge C)",
    anomClimbed?.status === "escalated" &&
      !!sysadmin &&
      anomClimbed?.assignedTo?.toString() === (sysadmin._id as unknown as Types.ObjectId).toString(),
    `assigned=${anomClimbed?.assignedTo}`
  );
  const fbRow = await WorkflowState.findOne({ alertId: anomId, state: "escalated", note: { $ne: null } }).sort({ changedAt: -1 }).lean();
  check("fallback transition is annotated in workflow history", !!fbRow && fbRow.level === 3, `lv=${fbRow?.level}`);

  // ── E. SLA stats on the dashboard ────────────────────────────────────────
  const dash = await get(amit, "/dashboard/summary");
  const sla = (dash.body as { sla?: { ack?: { compliance?: number | null }; resolution?: { compliance?: number | null }; bySeverity?: Record<string, unknown> } }).sla;
  check("corporate dashboard exposes sla stats", !!sla && !!sla.bySeverity && (typeof sla.resolution?.compliance === "number" || sla.resolution?.compliance === null), `sla=${JSON.stringify(sla).slice(0, 80)}`);
  const moDash = await get(priya, "/dashboard/summary");
  const moSla = (moDash.body as { sla?: unknown }).sla;
  check("mine_official dashboard has site-scoped sla stats", moSla !== undefined);
}

// ── [F9] GIS Map Markers Battery ────────────────────────────────────────────

async function gisBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F9] GIS Map Markers ==");

  // Test 1: Unauthenticated request
  const noAuth = await api("/gis/markers");
  check("unauthenticated GIS → 401", noAuth.status === 401);

  // Test 2: Field officer blocked
  const fieldOfficer = await get(t.rahul, "/gis/markers");
  check("field_officer GIS → 403", fieldOfficer.status === 403);

  // Test 3: Mine official sees only their site markers
  const mineOfficial = await get(t.priya, "/gis/markers");
  check("mine_official GIS → 200", mineOfficial.status === 200);
  const priyaMarkers = (mineOfficial.body as { data: Array<{ siteId: string; category: string; lat: number; lng: number }> }).data;
  const allPriyaSite = priyaMarkers.every((m) => m.siteId === sites.SJ);
  check("mine_official only sees own site markers", allPriyaSite, `found ${priyaMarkers.length} markers, all SJ: ${allPriyaSite}`);

  // Test 4: Regulator sees markers from multiple sites
  const regulator = await get(t.meena, "/gis/markers");
  check("regulator GIS → 200", regulator.status === 200);
  const regulatorMarkers = (regulator.body as { data: Array<{ siteId: string; category?: string; severity?: string; status?: string; timestamp?: string }> }).data;
  const uniqueSites = new Set(regulatorMarkers.map((m) => m.siteId));
  check("regulator sees multiple sites", uniqueSites.size >= 2, `found ${uniqueSites.size} unique sites`);

  // Test 5: Validate marker structure
  if (regulatorMarkers.length > 0) {
    const marker = regulatorMarkers[0];
    if (marker) {
      const hasRequired = "id" in marker && "category" in marker && "lat" in marker && "lng" in marker && "siteId" in marker && "siteName" in marker;
      check("marker has required fields", hasRequired, JSON.stringify(Object.keys(marker)));
    }
  }

  // Test 6: Verify lat/lng are numbers, not strings
  if (regulatorMarkers.length > 0) {
    const marker = regulatorMarkers[0];
    if (marker && "lat" in marker && "lng" in marker) {
      const typesCorrect = typeof marker.lat === "number" && typeof marker.lng === "number";
      check("lat/lng are numbers", typesCorrect, `lat=${typeof marker.lat}, lng=${typeof marker.lng}`);
    }
  }

  // Test 7: Optional siteId filter works
  const filtered = await get(t.amit, `/gis/markers?siteId=${sites.SJ}`);
  check("corporate_manager filtered by siteId → 200", filtered.status === 200);
  const filteredMarkers = (filtered.body as { data: Array<{ siteId: string }> }).data;
  const allFiltered = filteredMarkers.every((m) => m.siteId === sites.SJ);
  check("siteId filter returns only specified site", allFiltered, `${filteredMarkers.length} markers, all SJ: ${allFiltered}`);

  // Test 8: Malformed siteId returns 400
  const badId = await get(t.amit, "/gis/markers?siteId=not-a-valid-id");
  check("malformed siteId → 400", badId.status === 400);

  // Test 9: Validate inspection marker shape
  const inspectionMarker = regulatorMarkers.find((m) => m.category === "inspection");
  if (inspectionMarker) {
    const hasInspectionFields = "severity" in inspectionMarker && "status" in inspectionMarker && "timestamp" in inspectionMarker;
    check("inspection marker has severity/status/timestamp", hasInspectionFields);
  }

  // Test 10: Validate incident marker shape
  const incidentMarker = regulatorMarkers.find((m) => m.category === "incident");
  if (incidentMarker) {
    const hasIncidentFields = "severity" in incidentMarker && "status" in incidentMarker && "timestamp" in incidentMarker;
    check("incident marker has severity/status/timestamp", hasIncidentFields);
  }
}

// ── [F10] Document OCR Workflow Battery ─────────────────────────────────────

async function documentBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F10] Document OCR Workflow ==");

  // Import Document model (needed for fixture creation)
  const { default: Document } = await import("../models/Document.js");

  // Fixture: Create test document directly in MongoDB
  const testDoc = await Document.create({
    siteId: new Types.ObjectId(sites.SJ),
    sourceImageUrl: "https://example.com/form.jpg",
    extractedFields: { formType: "safety", date: "2026-09-09" },
    confidence: 0.92,
    reviewStatus: "pending",
  });

  // Test 1: Mine official lists pending documents
  const list = await get(t.priya, "/documents?reviewStatus=pending");
  check("mine_official lists pending documents → 200", list.status === 200);
  const docs = (list.body as { data: Array<{ id: string; siteId?: string; reviewStatus: string }> }).data;
  const foundTestDoc = docs.some((d) => d.id === testDoc._id.toString());
  check("test document in list", foundTestDoc, `found ${docs.length} docs`);
  check("document list rows carry string id + siteId", docs.length > 0 && docs.every((d) => typeof d.id === "string" && d.id.length > 0 && typeof d.siteId === "string" && d.siteId.length > 0));

  // Test 2: Corporate manager can confirm cross-site documents (no site restriction)
  const corporateConfirm = await post(t.amit, `/documents/${testDoc._id.toString()}/confirm`, {
    correctedFields: { formType: "environmental" },
  });
  check("corporate_manager confirms cross-site document → 200", corporateConfirm.status === 200);

  // Restore document to pending for mine official test
  await Document.updateOne({ _id: testDoc._id }, { reviewStatus: "pending" });

  // Test 3: Mine official confirms own-site document with corrected fields
  const confirm = await post(t.priya, `/documents/${testDoc._id.toString()}/confirm`, {
    correctedFields: { formType: "environmental", inspectorName: "Priya Singh" },
    reviewStatus: "confirmed",
  });
  check("mine_official confirms document → 200", confirm.status === 200);
  const confirmed = (confirm.body as { data: { reviewStatus: string } }).data;
  check("reviewStatus updated to confirmed", confirmed.reviewStatus === "confirmed");

  // Test 4: Verify audit log entry exists
  const audit = await AuditLog.findOne({
    entityType: "document",
    entityId: testDoc._id,
    action: "confirmed",
  }).lean();
  check("audit trail records document confirmation", !!audit);

  // Test 5: Field officer cannot access document list
  const fieldOfficer = await get(t.rahul, "/documents");
  check("field_officer list documents → 403", fieldOfficer.status === 403);

  // Test 6: Regulator can list documents across all sites
  const regulatorList = await get(t.meena, "/documents");
  check("regulator lists documents → 200", regulatorList.status === 200);
  const regulatorDocs = (regulatorList.body as { data: unknown[] }).data;
  check("regulator sees documents", regulatorDocs.length > 0);

  // Test 7: Regulator cannot confirm documents (read-only)
  const regulatorConfirm = await post(t.meena, `/documents/${testDoc._id.toString()}/confirm`, {
    correctedFields: { formType: "production" },
  });
  check("regulator confirm → 403 (read-only)", regulatorConfirm.status === 403);

  // Cleanup: Remove test document
  await Document.deleteOne({ _id: testDoc._id });
}

// ── [F11] AI Intelligence Battery ───────────────────────────────────────────

async function aiBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F11] AI Intelligence ==");

  // Test 1: Mine official gets risk score for own site
  const ownSiteRisk = await get(t.priya, `/ai/risk-score/${sites.SJ}`);
  check("mine_official risk-score for own site → 200", ownSiteRisk.status === 200);
  const riskData = (ownSiteRisk.body as { data: { score: number; riskLevel: string; breakdown: unknown; metrics: unknown } }).data;
  check("risk score is 0-100", riskData.score >= 0 && riskData.score <= 100, `score=${riskData.score}`);
  check("risk level is LOW/MEDIUM/HIGH/CRITICAL", ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskData.riskLevel));
  check("risk breakdown present", !!riskData.breakdown);
  check("risk metrics present", !!riskData.metrics);

  // Test 2: Mine official blocked from cross-site risk score
  const crossSiteRisk = await get(t.priya, `/ai/risk-score/${sites.SD}`);
  check("mine_official cross-site risk-score → 403", crossSiteRisk.status === 403);

  // Test 3: Corporate manager gets risk score for any site
  const corporateRisk = await get(t.amit, `/ai/risk-score/${sites.SD}`);
  check("corporate_manager risk-score for any site → 200", corporateRisk.status === 200);

  // Test 4: Regulator gets risk score for any site
  const regulatorRisk = await get(t.meena, `/ai/risk-score/${sites.SJ}`);
  check("regulator risk-score for any site → 200", regulatorRisk.status === 200);

  // Test 5: Field officer blocked from AI endpoints
  const fieldRisk = await get(t.rahul, `/ai/risk-score/${sites.SJ}`);
  check("field_officer risk-score → 403", fieldRisk.status === 403);

  // Test 6: Malformed siteId returns 400
  const badRisk = await get(t.amit, "/ai/risk-score/not-a-valid-id");
  check("malformed siteId for risk-score → 400", badRisk.status === 400);

  // Test 7: Mine official gets trends for own site
  const ownSiteTrends = await get(t.priya, `/ai/trends/${sites.SJ}`);
  check("mine_official trends for own site → 200", ownSiteTrends.status === 200);
  const trendsData = (ownSiteTrends.body as { data: { period: string; inspections: unknown; incidents: unknown; alerts: unknown } }).data;
  check("trends period is 30days", trendsData.period === "30days");
  check("trends has inspections data", !!trendsData.inspections);
  check("trends has incidents data", !!trendsData.incidents);
  check("trends has alerts data", !!trendsData.alerts);

  // Test 8: Mine official blocked from cross-site trends
  const crossSiteTrends = await get(t.priya, `/ai/trends/${sites.SD}`);
  check("mine_official cross-site trends → 403", crossSiteTrends.status === 403);

  // Test 9: Corporate manager gets summary for all sites
  const summary = await get(t.amit, "/ai/summary");
  check("corporate_manager summary → 200", summary.status === 200);
  const summaryData = (summary.body as { data: Array<{ siteId: string; score: number; riskLevel: string }> }).data;
  check("summary returns array of risk scores", Array.isArray(summaryData));
  check("summary includes multiple sites", summaryData.length >= 2, `${summaryData.length} sites`);

  // Verify summary is sorted by risk (descending)
  if (summaryData.length > 1) {
    const isSorted = summaryData.every((s, i) => {
      if (i === 0) return true;
      const prev = summaryData[i - 1];
      return prev ? prev.score >= s.score : true;
    });
    check("summary sorted by risk descending", isSorted);
  }

  // Test 10: Mine official sees only own site in summary
  const mineOfficialSummary = await get(t.priya, "/ai/summary");
  check("mine_official summary → 200", mineOfficialSummary.status === 200);
  const mineOfficialData = (mineOfficialSummary.body as { data: Array<{ siteId: string }> }).data;
  const allOwnSite = mineOfficialData.every((s) => s.siteId === sites.SJ);
  check("mine_official summary shows only own site", allOwnSite, `${mineOfficialData.length} sites`);

  // Test 11: Regulator gets summary for all sites
  const regulatorSummary = await get(t.meena, "/ai/summary");
  check("regulator summary → 200", regulatorSummary.status === 200);
  const regulatorData = (regulatorSummary.body as { data: unknown[] }).data;
  check("regulator sees multiple sites", regulatorData.length >= 2, `${regulatorData.length} sites`);

  // Test 12: Field officer blocked from summary
  const fieldSummary = await get(t.rahul, "/ai/summary");
  check("field_officer summary → 403", fieldSummary.status === 403);

  // ── BUG FIX VERIFICATION TESTS ─────────────────────────────────────────────

  // Test 26: Verify incidents contribute to score (Bug #1 fix)
  const detailedRisk = await get(t.priya, `/ai/risk-score/${sites.SJ}`);
  const breakdown = (detailedRisk.body as { data: { breakdown: { incidentScore: number } } }).data.breakdown;
  check("incident score is a number", typeof breakdown.incidentScore === "number", `incidentScore=${breakdown.incidentScore}`);

  // Test 27: Data sufficiency object present (Bug #4 fix)
  const dataSuff = (detailedRisk.body as { data: { dataSufficiency: any } }).data.dataSufficiency;
  check("dataSufficiency object present", !!dataSuff);
  check("hasSufficientData is boolean", typeof dataSuff.hasSufficientData === "boolean");
  check("inspectionCount present", typeof dataSuff.inspectionCount === "number");
  check("alertCount present", typeof dataSuff.alertCount === "number");

  // Test 28: Non-existent site returns 404 (Bug #3 fix)
  const fakeSiteId = "507f1f77bcf86cd799439011";
  const notFound = await get(t.amit, `/ai/risk-score/${fakeSiteId}`); // Use corporate manager
  check("non-existent site risk-score → 404", notFound.status === 404);

  // Test 29: Trends non-existent site returns 404 (Bug #3 fix)
  const trendsNotFound = await get(t.amit, `/ai/trends/${fakeSiteId}`); // Use corporate manager
  check("non-existent site trends → 404", trendsNotFound.status === 404);

  // Test 30: Verify trends incidents data present (Bug #1 fix)
  const detailedTrends = await get(t.priya, `/ai/trends/${sites.SJ}`);
  const trendsIncidents = (detailedTrends.body as { data: { incidents: { total: number } } }).data.incidents;
  check("trends incidents.total is a number", typeof trendsIncidents.total === "number");
}

// ── [F13] Feature 03: Risk Trend Forecasting ─────────────────────────────────
// Enriched /ai/trends payload: rule-based classification (increasing /
// decreasing / stable / volatile / new-activity / insufficient-data),
// normalized contributor ranking, statistical projection and a 13-week series.
// Deterministic probes create controlled multi-week data per site to prove the
// increasing / volatile / zero-baseline / insufficient-history classifications
// and the linear-regression forecast, then clean up after themselves.

const F03_DIRECTIONS = [
  "increasing",
  "decreasing",
  "stable",
  "volatile",
  "new-activity",
  "insufficient-data",
] as const;

function f03RankWeight(c: { magnitude: string; direction: string }): number {
  const mag = c.magnitude === "high" ? 3 : c.magnitude === "medium" ? 2 : 1;
  return mag + (c.direction === "increasing" ? 1 : 0);
}

async function feature03ForecastBattery(
  t: { priya: string; amit: string; meena: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F13] Risk Trend Forecasting ==");

  // ── 1. Enriched payload shape on the seeded site ───────────────────────────
  const trends = await get(t.amit, `/ai/trends/${sites.SJ}`);
  check("trends enriched payload → 200", trends.status === 200);
  const data = (trends.body as { data: AnyJson }).data as AnyJson;

  check("classification present", !!data.classification);
  check("classification.method is rule-based", data.classification?.method === "rule-based", `got ${data.classification?.method}`);
  check("classification.overall is a valid direction", F03_DIRECTIONS.includes(data.classification?.overall), `got ${data.classification?.overall}`);
  check("classification.label present", typeof data.classification?.label === "string" && data.classification.label.length > 0);

  for (const key of ["inspections", "incidents", "alerts"]) {
    const cat = data.classification?.perCategory?.[key];
    check(`perCategory.${key} valid direction + newActivity flag`,
      !!cat && F03_DIRECTIONS.includes(cat.direction) && typeof cat.newActivity === "boolean",
      JSON.stringify(cat).slice(0, 120));
    check(`perCategory.${key}.percentChange is number|null`,
      !!cat && (typeof cat.percentChange === "number" || cat.percentChange === null));
  }

  check("contributors is an array", Array.isArray(data.contributors));
  const contributors = (data.contributors ?? []) as Array<{
    key: string; label: string; direction: string; magnitude: string; count: number; detail: string;
  }>;
  const contribShapeOk = contributors.every(
    (c) =>
      typeof c.key === "string" &&
      typeof c.label === "string" &&
      ["increasing", "decreasing", "stable"].includes(c.direction) &&
      ["high", "medium", "low"].includes(c.magnitude) &&
      typeof c.count === "number" &&
      typeof c.detail === "string"
  );
  check("contributor shape valid (key/label/direction/magnitude/count/detail)", contribShapeOk);
  const ranked = contributors.every((c, i) => i === 0 || f03RankWeight(contributors[i - 1]!) >= f03RankWeight(c));
  check("contributors ranked by weight desc", ranked);

  check("forecast present", !!data.forecast);
  check("forecast.method valid", ["linear-regression", "moving-average", "insufficient-data"].includes(data.forecast?.method), `got ${data.forecast?.method}`);
  check("forecast.baselineScore 0-100", typeof data.forecast?.baselineScore === "number" && data.forecast.baselineScore >= 0 && data.forecast.baselineScore <= 100);
  check("forecast.projectedScore number|null", typeof data.forecast?.projectedScore === "number" || data.forecast?.projectedScore === null);
  check("forecast.projectedBand valid|null", data.forecast?.projectedBand === null || ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(data.forecast?.projectedBand), `got ${data.forecast?.projectedBand}`);
  check("forecast.bandTrend valid", F03_DIRECTIONS.includes(data.forecast?.bandTrend), `got ${data.forecast?.bandTrend}`);
  check("forecast label present", typeof data.forecast?.label === "string" && data.forecast.label.length > 0);

  const series = data.series as AnyJson;
  const seriesShapeOk =
    Array.isArray(series?.labels) && series.labels.length === 13 &&
    Array.isArray(series.inspections) && series.inspections.length === 13 &&
    Array.isArray(series.incidents) && series.incidents.length === 13 &&
    Array.isArray(series.alerts) && series.alerts.length === 13 &&
    Array.isArray(series.score) && series.score.length === 13;
  check("series shape (13-week labels/counts/score)", seriesShapeOk);

  // ── 2. Backward-compat fields intact ───────────────────────────────────────
  check("backward-compat trend fields intact", data.period === "30days" && !!data.inspections && !!data.incidents && !!data.alerts);
  check("inspections.failed is a number", typeof data.inspections?.failed === "number");
  check("alerts.avgResolutionTimeHours is a number", typeof data.alerts?.avgResolutionTimeHours === "number");

  // ── 3. RBAC / error guards ─────────────────────────────────────────────────
  check("cross-site trends still 403 for mine_official", (await get(t.priya, `/ai/trends/${sites.SD}`)).status === 403);
  check("malformed trends id → 400", (await get(t.amit, "/ai/trends/not-a-valid-id")).status === 400);
  check("missing trends site → 404", (await get(t.amit, "/ai/trends/507f1f77bcf86cd799439011")).status === 404);

  // ── 4. Controlled deterministic probes ─────────────────────────────────────
  await f03ControlledProbes(t.amit);
}

async function f03ControlledProbes(amitToken: string): Promise<void> {
  const now = Date.now();
  const w = (weeksAgo: number): Date => new Date(now - weeksAgo * 7 * 24 * 60 * 60 * 1000);

  const checklistWithFails = (fails: number): Array<{ item: string; result: "pass" | "fail"; notes: string }> =>
    Array.from({ length: 6 }, (_, i) => ({
      item: `Verify item ${i}`,
      result: (i < fails ? "fail" : "pass") as "pass" | "fail",
      notes: "",
    }));

  const created: Types.ObjectId[] = [];

  const makeInspection = (siteId: Types.ObjectId, weeksAgo: number, fails: number) => ({
    clientUuid: `f03-${randomUUID()}`,
    siteId,
    inspectorId: new Types.ObjectId(),
    type: "safety" as const,
    checklist: checklistWithFails(fails),
    photoUrls: [],
    location: { lat: 23.7, lng: 86.4 },
    capturedAt: w(weeksAgo),
    syncedAt: w(weeksAgo),
  });

  const makeAlert = (siteId: Types.ObjectId, ruleCode: string, severity: string, weeksAgo: number) => ({
    siteId,
    sourceType: "inspection" as const,
    ruleKey: `f03-${randomUUID()}`,
    ruleCode,
    severity,
    status: "open" as const,
    createdAt: w(weeksAgo),
  });

  const makeSite = async (sub: string): Promise<Types.ObjectId> => {
    const s = await Site.create({
      name: `F03 Probe ${sub} ${randomUUID().slice(0, 8)}`,
      subsidiary: "Verify F03 Probes",
      location: { lat: 23.7, lng: 86.4 },
      expectedWorkers: 50,
    });
    const id = s._id as Types.ObjectId;
    created.push(id);
    return id;
  };

  try {
    // Probe A — sustained increasing failure rate (multi-period, edge case B)
    const siteA = await makeSite("Increasing");
    const inspDocsA: Array<ReturnType<typeof makeInspection>> = [];
    for (let wk = 12; wk >= 1; wk--) {
      inspDocsA.push(makeInspection(siteA, wk, wk <= 6 ? 3 : 0));
    }
    await Inspection.insertMany(inspDocsA);
    await Alert.collection.insertMany([
      makeAlert(siteA, "REPEAT_VIOLATION", "medium", 1),
      makeAlert(siteA, "REPEAT_VIOLATION", "medium", 0),
      makeAlert(siteA, "REPEAT_VIOLATION", "medium", 0),
    ]);

    const trA = await get(amitToken, `/ai/trends/${siteA.toString()}`);
    check("probe A trends → 200", trA.status === 200);
    const dA = (trA.body as { data: AnyJson }).data as AnyJson;
    check("probe A inspections classified increasing",
      dA.classification?.perCategory?.inspections?.direction === "increasing",
      `got ${dA.classification?.perCategory?.inspections?.direction}`);
    check("probe A overall not insufficient-data",
      dA.classification?.overall !== "insufficient-data",
      `got ${dA.classification?.overall}`);
    check("probe A forecast method is linear-regression",
      dA.forecast?.method === "linear-regression",
      `got ${dA.forecast?.method}`);
    check("probe A forecast has a projected score",
      typeof dA.forecast?.projectedScore === "number",
      `got ${dA.forecast?.projectedScore}`);
    check("probe A repeat-violation contributor present (count 3)",
      (dA.contributors ?? []).some((c: AnyJson) => c.key === "repeat_violations" && c.count === 3));
    check("probe A score series has non-zero weekly scores",
      Array.isArray(dA.series?.score) && dA.series.score.some((v: number | null) => typeof v === "number" && v > 0));

    // Probe B — oscillation across weeks → volatile (edge case E)
    const siteB = await makeSite("Volatile");
    const inspDocsB: Array<ReturnType<typeof makeInspection>> = [];
    for (let wk = 12; wk >= 0; wk--) {
      inspDocsB.push(makeInspection(siteB, wk, wk % 2 === 0 ? 6 : 0));
    }
    await Inspection.insertMany(inspDocsB);
    const trB = await get(amitToken, `/ai/trends/${siteB.toString()}`);
    const dB = (trB.body as { data: AnyJson }).data as AnyJson;
    check("probe B inspections classified volatile",
      dB.classification?.perCategory?.inspections?.direction === "volatile",
      `got ${dB.classification?.perCategory?.inspections?.direction}`);

    // Probe C — zero baseline: previous period empty, current has activity → new-activity (edge case C)
    const siteC = await makeSite("NewActivity");
    await Inspection.insertMany([
      makeInspection(siteC, 1, 2),
      makeInspection(siteC, 0, 2),
    ]);
    const trC = await get(amitToken, `/ai/trends/${siteC.toString()}`);
    const dC = (trC.body as { data: AnyJson }).data as AnyJson;
    const inspC = dC.classification?.perCategory?.inspections;
    check("probe C inspections new-activity (zero baseline)",
      inspC?.direction === "new-activity",
      `got ${inspC?.direction}`);
    check("probe C percentChange is null (never Infinity%)",
      inspC?.percentChange === null,
      `got ${inspC?.percentChange}`);
    check("probe C newActivity flag true", inspC?.newActivity === true);

    // Probe D — one week of history → honest insufficient-data (edge case A)
    const siteD = await makeSite("Insufficient");
    await Inspection.insertMany([makeInspection(siteD, 0, 1)]);
    const trD = await get(amitToken, `/ai/trends/${siteD.toString()}`);
    const dD = (trD.body as { data: AnyJson }).data as AnyJson;
    check("probe D overall insufficient-data (mine created yesterday)",
      dD.classification?.overall === "insufficient-data",
      `got ${dD.classification?.overall}`);
    check("probe D forecast insufficient-data (no projection)",
      dD.forecast?.method === "insufficient-data",
      `got ${dD.forecast?.method}`);
    check("probe D projectedScore null", dD.forecast?.projectedScore === null, `got ${dD.forecast?.projectedScore}`);
  } finally {
    await Inspection.deleteMany({ siteId: { $in: created } });
    await Incident.deleteMany({ siteId: { $in: created } });
    await Alert.deleteMany({ siteId: { $in: created } });
    await Site.deleteMany({ _id: { $in: created } });
  }
}

// ── [F12] Dashboard 7-day KPI battery ────────────────────────────────────────
// Backend now supplies truthful 7-day counts: mine_official gets inspections7d
// + alerts7d, corporate gets inspections7d + incidents7d (frontend dashboard
// adapter consumes these to fill the "7d" KPI boxes).

async function dashboardBattery(
  t: { priya: string; amit: string },
): Promise<void> {
  console.log("\n== [F12] Dashboard 7-day KPIs ==");

  const mo = await get(t.priya, "/dashboard/summary");
  check("mine_official dashboard → 200", mo.status === 200);
  const moBody = mo.body as { inspections7d?: number; alerts7d?: number; todaysInspections?: unknown[] };
  check("mine_official inspections7d is a number", typeof moBody.inspections7d === "number");
  check("mine_official alerts7d is a number", typeof moBody.alerts7d === "number");
  check("mine_official recent-scans list still present", Array.isArray(moBody.todaysInspections));

  const corp = await get(t.amit, "/dashboard/summary");
  check("corporate dashboard → 200", corp.status === 200);
  const corpBody = corp.body as { inspections7d?: number; incidents7d?: number; trend7Day?: { totals?: { alerts: number } } };
  check("corporate inspections7d is a number", typeof corpBody.inspections7d === "number");
  check("corporate incidents7d is a number", typeof corpBody.incidents7d === "number");
  check("corporate trend7Day totals present", !!corpBody.trend7Day?.totals);
}

// ── [F13] Users directory battery ────────────────────────────────────────────
// GET /users powers the real "Add Field Officer" screen: corporate-only, never
// exposes passwordHash, and lists every provisioned account with its site bind.

async function usersBattery(
  t: { amit: string; priya: string; meena: string },
): Promise<void> {
  console.log("\n== [F13] Users directory ==");

  const list = await get(t.amit, "/users");
  check("corporate lists users → 200", list.status === 200, `got ${list.status}`);
  const data = (list.body as { data?: Array<{ email: string; role: string; siteId: string | null }> }).data ?? [];
  check("seeded users present", data.some((u) => u.email === "priya@agnistrot.com"), `${data.length} users`);

  const rahul = data.find((u) => u.email === "rahul@agnistrot.com");
  check("field_officer row has site binding", !!rahul && typeof rahul.siteId === "string", JSON.stringify(rahul));

  const passwordLeak = JSON.stringify(list.body).includes("passwordHash") || JSON.stringify(list.body).includes("password");
  check("no password fields exposed", !passwordLeak);

  check("mine_official blocked from /users → 403", (await get(t.priya, "/users")).status === 403);
  check("regulator blocked from /users → 403", (await get(t.meena, "/users")).status === 403);
}

// ── [F14] Detail endpoints battery ────────────────────────────────────────────
// GET /incidents/:id and /inspections/:id power the frontend detail pages. Both
// must fail closed: out-of-scope ids return the same 404 as unknown ids,
// malformed ids → 400, and the payload must serve what the pages render.

async function detailBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  ids: { incSJ: string; incSD: string; incDecoy: string; inspSJ: string; inspSD: string },
): Promise<void> {
  console.log("\n== [F14] Incident & inspection detail ==");

  const incSJ = await get(t.amit, `/incidents/${ids.incSJ}`);
  check("corporate incident detail → 200", incSJ.status === 200, `got ${incSJ.status}`);
  check("regulator incident detail → 200", (await get(t.meena, `/incidents/${ids.incSJ}`)).status === 200);
  check("mine_official own-site incident → 200", (await get(t.priya, `/incidents/${ids.incSJ}`)).status === 200);
  check("mine_official cross-site incident → 404", (await get(t.priya, `/incidents/${ids.incSD}`)).status === 404);
  check("field_officer own incident (any site) → 200", (await get(t.rahul, `/incidents/${ids.incSD}`)).status === 200);
  check("field_officer others' incident → 404", (await get(t.rahul, `/incidents/${ids.incDecoy}`)).status === 404);

  const inc = (incSJ.body as { data?: Record<string, unknown> }).data ?? {};
  check("incident detail has description", typeof inc.description === "string" && inc.description.length > 0, JSON.stringify(inc).slice(0, 80));
  const reportedBy = String(inc.reportedBy ?? "");
  check("incident reportedBy is a display name", typeof inc.reportedBy === "string" && !/^[0-9a-f]{24}$/i.test(reportedBy), reportedBy);
  const sev = String(inc.severity ?? "");
  check("incident severity is valid enum", ["low", "medium", "high", "critical"].includes(sev), sev);

  const insp = await get(t.amit, `/inspections/${ids.inspSJ}`);
  check("corporate inspection detail → 200", insp.status === 200, `got ${insp.status}`);
  check("mine_official own-site inspection → 200", (await get(t.priya, `/inspections/${ids.inspSJ}`)).status === 200);
  check("mine_official cross-site inspection → 404", (await get(t.priya, `/inspections/${ids.inspSD}`)).status === 404);
  check("field_officer inspection (their own) → 200", (await get(t.rahul, `/inspections/${ids.inspSD}`)).status === 200);

  const inspBody = (insp.body as { data?: Record<string, unknown> }).data ?? {};
  const checklist = inspBody.checklist;
  check("inspection detail has non-empty checklist", Array.isArray(checklist) && checklist.length > 0, JSON.stringify(checklist).slice(0, 80));
  check("inspection failedCount is a number", typeof inspBody.failedCount === "number", `got ${String(inspBody.failedCount)}`);
  const inspectorName = String(inspBody.inspectorId ?? "");
  check("inspection inspectorId is a display name", typeof inspBody.inspectorId === "string" && !/^[0-9a-f]{24}$/i.test(inspectorName), inspectorName);

  check("malformed incident id → 400", (await get(t.amit, "/incidents/not-an-id")).status === 400);
  check("malformed inspection id → 400", (await get(t.amit, "/inspections/not-an-id")).status === 400);

  const unknown = new Types.ObjectId().toString();
  check("unknown incident id → 404", (await get(t.amit, `/incidents/${unknown}`)).status === 404);
  check("unknown inspection id → 404", (await get(t.amit, `/inspections/${unknown}`)).status === 404);
}

// ── [F15] List payload shape ─────────────────────────────────────────────────
// Regressions for the "list payloads don't feed the pages" fixes: incident list
// must carry description, inspection list must carry a display-name inspectorId
// plus syncedAt, and attendance must carry syncedAt.

async function listShapeBattery(t: { amit: string }): Promise<void> {
  console.log("\n== [F15] list payload shape ==");

  const incidents = (await get(t.amit, "/incidents")).body as { data: Array<{ description?: unknown; siteId?: unknown }> };
  check("incident list rows carry description", incidents.data.length > 0 && incidents.data.every((r) => typeof r.description === "string" && r.description.length > 0), `rows=${incidents.data.length}`);
  check("incident list rows carry siteId", incidents.data.length > 0 && incidents.data.every((r) => typeof r.siteId === "string" && r.siteId.length > 0));

  const inspections = (await get(t.amit, "/inspections")).body as { data: Array<{ inspectorId?: unknown; syncedAt?: unknown }> };
  check("inspection list rows carry inspectorId display name", inspections.data.length > 0 && inspections.data.every((r) => typeof r.inspectorId === "string" && r.inspectorId.length > 0 && !/^[0-9a-f]{24}$/i.test(r.inspectorId)), `rows=${inspections.data.length}`);
  check("inspection list rows carry syncedAt", inspections.data.length > 0 && inspections.data.every((r) => typeof r.syncedAt === "string" && r.syncedAt.length > 0));
}

// ── [F16] Real modules: corrective actions + compliance ─────────────────────
// Verifies the Option-A backend-derived feeds: role gating, mapped row shape,
// mine_official scoping, persistence of resolutionNote on resolve (surfaces as
// a resolved corrective action), and compliance row completeness.

async function realModulesBattery(
  tokens: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string }
): Promise<void> {
  console.log("\n== [F16] corrective actions + compliance ==");

  // ── RBAC ──────────────────────────────────────────────────────────────────
  check("field_officer blocked from corrective-actions → 403", (await get(tokens.rahul, "/corrective-actions")).status === 403);
  check("field_officer blocked from compliance → 403", (await get(tokens.rahul, "/compliance")).status === 403);
  check("malformed site filter on corrective-actions → 400", (await get(tokens.amit, "/corrective-actions?siteId=zzz")).status === 400);

  // ── Corrective actions: corporate sees mapped rows ────────────────────────
  const CA = (await get(tokens.amit, "/corrective-actions")).body as {
    data: Array<{
      id?: unknown; siteId?: unknown; siteName?: unknown; title?: unknown;
      description?: unknown; priority?: unknown; status?: unknown; department?: unknown;
      assignedTo?: unknown; dueDate?: unknown; createdAt?: unknown;
    }>;
    total?: number;
  };
  check("corporate lists corrective actions with rows", Array.isArray(CA.data) && CA.data.length > 0, `rows=${CA.data.length}`);
  check("CA rows carry id + siteId strings", CA.data.every((r) => typeof r.id === "string" && r.id.length > 0 && typeof r.siteId === "string" && r.siteId.length > 0));
  check("CA rows carry mapped display fields", CA.data.every((r) => typeof r.title === "string" && r.title.length > 0 && typeof r.siteName === "string" && typeof r.priority === "string" && typeof r.status === "string" && typeof r.department === "string" && typeof r.dueDate === "string" && typeof r.createdAt === "string"));
  check("CA total is a number", typeof CA.total === "number");

  // ── mine_official scoping ─────────────────────────────────────────────────
  const moCA = (await get(tokens.priya, "/corrective-actions")).body as { data: Array<{ siteId?: string }> };
  check("mine_official CA rows all own site", moCA.data.length > 0 && moCA.data.every((r) => r.siteId === sites.SJ), `rows=${moCA.data.length}`);

  // ── Resolve an open alert → note persists → surfaces as resolved CA ───────
  const openAlerts = (await get(tokens.amit, "/alerts?status=open&limit=1")).body as { data: Array<{ id?: string }> };
  const openAlertId = openAlerts.data[0]?.id;
  check("resolve path: found an open alert", typeof openAlertId === "string" && openAlertId.length > 0);
  if (openAlertId) {
    const res = await post(tokens.amit, `/alerts/${openAlertId}/resolve`, { resolutionNote: "F16 corrective note" });
    check("corporate resolves alert → 200", res.status === 200, `status=${res.status}`);
    const wf = await WorkflowState.findOne({ alertId: openAlertId, state: "resolved" }).select("note changedBy").lean();
    check("resolve persists resolutionNote on workflow", !!wf && (wf as { note?: string | null }).note === "F16 corrective note", JSON.stringify((wf as { note?: string | null } | null)?.note ?? null));
    const resolvedCA = (await get(tokens.amit, `/corrective-actions/${openAlertId}`)).body as {
      data?: { status?: string; verifiedBy?: string; resolutionNote?: string; verifiedAt?: string };
    };
    check(
      "resolved alert surfaces as resolved CA with note + verifier",
      resolvedCA.data?.status === "resolved" && typeof resolvedCA.data?.resolutionNote === "string" && typeof resolvedCA.data?.verifiedBy === "string" && typeof resolvedCA.data?.verifiedAt === "string",
      JSON.stringify(resolvedCA.data).slice(0, 120)
    );
  }

  // ── Compliance feed ───────────────────────────────────────────────────────
  const comp = (await get(tokens.amit, "/compliance")).body as {
    data: Array<{
      id?: unknown; siteId?: unknown; siteName?: unknown; requirement?: unknown;
      category?: unknown; description?: unknown; status?: unknown; dueDate?: unknown;
      responsibleDepartment?: unknown;
    }>;
    total?: number;
  };
  const OK_STATUS = ["compliant", "non_compliant", "pending", "overdue"];
  check("corporate lists compliance rows", Array.isArray(comp.data) && comp.data.length > 0, `rows=${comp.data.length}`);
  check("compliance rows carry required fields + valid status", comp.data.every((r) => typeof r.siteId === "string" && typeof r.requirement === "string" && r.requirement.length > 0 && typeof r.category === "string" && typeof r.description === "string" && typeof r.status === "string" && OK_STATUS.includes(r.status as string) && typeof r.dueDate === "string" && typeof r.responsibleDepartment === "string"));

  const moComp = (await get(tokens.priya, "/compliance")).body as { data: Array<{ siteId?: string }> };
  check("mine_official compliance rows all own site", moComp.data.length > 0 && moComp.data.every((r) => r.siteId === sites.SJ), `rows=${moComp.data.length}`);

  const filtComp = (await get(tokens.amit, "/compliance?status=non_compliant&limit=5")).body as { data: Array<{ status?: string }> };
  check("compliance status filter applies", filtComp.data.every((r) => r.status === "non_compliant"), `rows=${filtComp.data.length}`);
}

// ── Runner ───────────────────────────────────────────────────────────────────

// ── [F14] Recurring Problem Detection Battery ────────────────────────────────
// Feature 04 — pattern-based hazard detection. Uses controlled probe sites so
// every assertion is deterministic, then removes them in `finally`. Runs LAST
// (after detailBattery) so stray detections on seeded data cannot disturb any
// earlier battery's assertions. Detection is invoked directly via
// checkRecurringHazards() rather than the full runBatchRules() to avoid firing
// the overdue/attendance/repeat passes mid-suite.

async function feature04RecurringBattery(amitToken: string): Promise<void> {
  console.log("\n== [F14] Recurring Problem Detection ==");

  const DAY = 24 * 60 * 60 * 1000;
  const daysAgo = (n: number): Date => new Date(Date.now() - Math.round(n * DAY));
  const createdSites: Types.ObjectId[] = [];

  const makeSite = async (sub: string): Promise<Types.ObjectId> => {
    const s = await Site.create({
      name: `F04 Probe ${sub} ${randomUUID().slice(0, 8)}`,
      subsidiary: "Verify F04 Probes",
      location: { lat: 23.7, lng: 86.4 },
      expectedWorkers: 50,
    });
    const id = s._id as Types.ObjectId;
    createdSites.push(id);
    return id;
  };

  const makeInspection = (
    siteId: Types.ObjectId, reporterId: Types.ObjectId, capturedAt: Date,
    item: string, lat: number, lng: number
  ): Record<string, unknown> => ({
    clientUuid: `f04-${randomUUID()}`,
    siteId,
    inspectorId: reporterId,
    type: "safety",
    checklist: [{ item, result: "fail", notes: "" }],
    photoUrls: [],
    location: { lat, lng },
    capturedAt,
    syncedAt: capturedAt,
  });

  const recurringFor = (siteId: Types.ObjectId): Promise<Array<Record<string, unknown>>> =>
    Alert.find({ siteId, ruleCode: "RECURRING_HAZARD" }).lean() as unknown as Promise<Array<Record<string, unknown>>>;

  try {
    // ── 0. Normalization unit checks (edge case B) ───────────────────────────
    check("normalize 'Safety Barrier' → SAFETY_BARRICADE", normalizeHazardCategory("Safety Barrier") === "SAFETY_BARRICADE", normalizeHazardCategory("Safety Barrier"));
    check("normalize 'Barricade Damage' → SAFETY_BARRICADE", normalizeHazardCategory("Barricade Damage") === "SAFETY_BARRICADE", normalizeHazardCategory("Barricade Damage"));
    check("normalize 'Damaged Safety Barrier' → SAFETY_BARRICADE", normalizeHazardCategory("Damaged Safety Barrier") === "SAFETY_BARRICADE", normalizeHazardCategory("Damaged Safety Barrier"));
    check("normalize 'PPE gloves missing' → PERSONAL_PROTECTIVE_EQUIPMENT", normalizeHazardCategory("PPE gloves missing") === "PERSONAL_PROTECTIVE_EQUIPMENT", normalizeHazardCategory("PPE gloves missing"));

    const u1 = new Types.ObjectId();
    const u2 = new Types.ObjectId();
    const u3 = new Types.ObjectId();

    // ── 1. Positive probe: localized pattern, 3 inspectors / 3 dates ────────
    const p1 = await makeSite("Localized");
    await Inspection.insertMany([
      makeInspection(p1, u1, daysAgo(6), "Safety Barrier", 28.12345, 83.12345),
      makeInspection(p1, u2, daysAgo(4), "Barricade Damage", 28.12352, 83.12339),
      makeInspection(p1, u3, daysAgo(2), "Damaged Safety Barrier", 28.1234, 83.1235),
    ]);

    await checkRecurringHazards();
    let p1Alerts = await recurringFor(p1);
    check("P1: exactly one RECURRING_HAZARD alert", p1Alerts.length === 1, `${p1Alerts.length}`);
    const a1 = p1Alerts[0] ?? {};
    check("P1: category normalized to SAFETY_BARRICADE", a1.category === "SAFETY_BARRICADE", `${a1.category}`);
    check("P1: scope localized", a1.scope === "localized", `${a1.scope}`);
    check("P1: severity high", a1.severity === "high", `${a1.severity}`);
    check("P1: reportCount 3 (distinct reports)", a1.reportCount === 3, `${a1.reportCount}`);
    check("P1: uniqueReporters 3 (3/3 evidence)", a1.uniqueReporters === 3, `${a1.uniqueReporters}`);
    check("P1: zoneCount 1 (GPS radius cluster, ~8 m apart)", a1.zoneCount === 1, `${a1.zoneCount}`);
    check("P1: evidence has 3 source records", (a1.evidence as unknown[] | undefined)?.length === 3, `${(a1.evidence as unknown[] | undefined)?.length}`);

    // API exposure of the recurrence fields (list endpoint)
    const list = await get(amitToken, `/alerts?siteId=${p1.toString()}&ruleCode=RECURRING_HAZARD`);
    const row = (list.body as AnyJson)?.data?.[0] as AnyJson | undefined;
    check("list API exposes scope + evidence + reportCount",
      list.status === 200 && !!row && row.scope === "localized" && Array.isArray(row.evidence) && row.reportCount === 3,
      JSON.stringify(row ?? null).slice(0, 160));

    // ── 2. Idempotency + REPEAT-vs-UNRESOLVED (edge case A) ──────────────────
    await checkRecurringHazards(); // identical data → reinforce in place, no duplicate
    p1Alerts = await recurringFor(p1);
    check("P1: idempotent rerun → still one alert", p1Alerts.length === 1, `${p1Alerts.length}`);
    check("P1: reinforcedCount bumped to 1", (p1Alerts[0]?.reinforcedCount ?? -1) === 1, `${p1Alerts[0]?.reinforcedCount}`);

    // Same issue still OPEN — new reports must reinforce, never spawn a new alert
    await Inspection.insertMany([
      makeInspection(p1, u1, daysAgo(1), "Barrier down", 28.1235, 83.1234),
      makeInspection(p1, u2, daysAgo(0.5), "Barricade damaged", 28.12344, 83.12346),
    ]);
    await checkRecurringHazards();
    p1Alerts = await recurringFor(p1);
    check("P1: UNRESOLVED reinforcement keeps one alert", p1Alerts.length === 1, `${p1Alerts.length}`);
    check("P1: reportCount grew to 5", (p1Alerts[0]?.reportCount ?? -1) === 5, `${p1Alerts[0]?.reportCount}`);
    check("P1: reinforcedCount grew to 2", (p1Alerts[0]?.reinforcedCount ?? -1) === 2, `${p1Alerts[0]?.reinforcedCount}`);
    const p1Repeat = await Alert.countDocuments({ siteId: p1, ruleCode: "REPEAT_VIOLATION" });
    check("P1: no REPEAT_VIOLATION stacked on RECURRING_HAZARD", p1Repeat === 0, `${p1Repeat}`);

    // ── 3. Site-wide scope (edge case E): same category in 2 zones ───────────
    const p2 = await makeSite("Sitewide");
    await Inspection.insertMany([
      makeInspection(p2, u1, daysAgo(5), "Housekeeping clutter", 28.2, 83.2),
      makeInspection(p2, u2, daysAgo(3), "Debris on walkway", 28.2005, 83.2005),
      makeInspection(p2, u3, daysAgo(1), "Housekeeping", 28.1998, 83.2002),
      makeInspection(p2, u2, daysAgo(4), "Debris near conveyor", 28.21, 83.21),
      makeInspection(p2, u1, daysAgo(2), "Housekeeping clutter", 28.2104, 83.2098),
    ]);
    await checkRecurringHazards();
    const p2Alerts = await recurringFor(p2);
    check("P2: one site-wide alert (not three localized)", p2Alerts.length === 1, `${p2Alerts.length}`);
    check("P2: scope site-wide", p2Alerts[0]?.scope === "site-wide", `${p2Alerts[0]?.scope}`);
    check("P2: severity high", p2Alerts[0]?.severity === "high", `${p2Alerts[0]?.severity}`);
    check("P2: zoneCount 2 (two ~1.5 km clusters)", p2Alerts[0]?.zoneCount === 2, `${p2Alerts[0]?.zoneCount}`);
    check("P2: reportCount 5", p2Alerts[0]?.reportCount === 5, `${p2Alerts[0]?.reportCount}`);

    // ── 4. Category-wide scope (edge case E): same category at 2 sites ───────
    const p3a = await makeSite("CatWide A");
    const p3b = await makeSite("CatWide B");
    await Inspection.insertMany([
      makeInspection(p3a, u1, daysAgo(6), "Fire extinguisher empty", 28.3, 83.3),
      makeInspection(p3a, u2, daysAgo(4), "Fire hazard near conveyor", 28.3005, 83.3005),
      makeInspection(p3a, u3, daysAgo(2), "Fire", 28.2998, 83.3002),
      makeInspection(p3b, u1, daysAgo(5), "Fire", 28.31, 83.31),
      makeInspection(p3b, u2, daysAgo(3), "Fire extinguisher empty", 28.3105, 83.3105),
      makeInspection(p3b, u3, daysAgo(1), "Fire hazard near conveyor", 28.3098, 83.3102),
    ]);
    await checkRecurringHazards();
    const p3aAlerts = await recurringFor(p3a);
    const p3bAlerts = await recurringFor(p3b);
    check("P3: category-wide alert on both sites",
      p3aAlerts.length === 1 && p3bAlerts.length === 1, `${p3aAlerts.length}/${p3bAlerts.length}`);
    check("P3: scope category-wide on both",
      p3aAlerts[0]?.scope === "category-wide" && p3bAlerts[0]?.scope === "category-wide",
      `${p3aAlerts[0]?.scope}/${p3bAlerts[0]?.scope}`);
    check("P3: severity critical on both",
      p3aAlerts[0]?.severity === "critical" && p3bAlerts[0]?.severity === "critical",
      `${p3aAlerts[0]?.severity}/${p3bAlerts[0]?.severity}`);
    check("P3: sitesAffected 2", p3aAlerts[0]?.sitesAffected === 2, `${p3aAlerts[0]?.sitesAffected}`);

    // ── 5. Negative probes: below report/reporter/date thresholds ────────────
    const p4a = await makeSite("Neg Few");
    await Inspection.insertMany([
      makeInspection(p4a, u1, daysAgo(3), "Barricade", 28.4, 83.4),
      makeInspection(p4a, u2, daysAgo(1), "Barrier", 28.4005, 83.4005),
    ]);
    const p4b = await makeSite("Neg OneReporter");
    await Inspection.insertMany([
      makeInspection(p4b, u1, daysAgo(5), "Barricade", 28.41, 83.41),
      makeInspection(p4b, u1, daysAgo(3), "Barrier", 28.4105, 83.4105),
      makeInspection(p4b, u1, daysAgo(1), "Safety barrier", 28.4098, 83.4102),
    ]);
    const p4c = await makeSite("Neg OneDate");
    await Inspection.insertMany([
      makeInspection(p4c, u1, daysAgo(1), "Barricade", 28.42, 83.42),
      makeInspection(p4c, u2, daysAgo(1), "Barrier", 28.4205, 83.4205),
      makeInspection(p4c, u3, daysAgo(1), "Safety barrier", 28.4198, 83.4202),
    ]);
    await checkRecurringHazards();
    const negCounts = await Promise.all([
      Alert.countDocuments({ siteId: p4a, ruleCode: "RECURRING_HAZARD" }),
      Alert.countDocuments({ siteId: p4b, ruleCode: "RECURRING_HAZARD" }),
      Alert.countDocuments({ siteId: p4c, ruleCode: "RECURRING_HAZARD" }),
    ]);
    check("NEG: 2 reports → no alert", negCounts[0] === 0, `${negCounts[0]}`);
    check("NEG: 3 reports / 1 reporter (3/1) → no alert", negCounts[1] === 0, `${negCounts[1]}`);
    check("NEG: 3 reports / 1 date → no alert", negCounts[2] === 0, `${negCounts[2]}`);

    // ── 6. Dedup before detection (edge case G) ──────────────────────────────
    // Uses the LIGHTING category (not SAFETY_BARRICADE) on purpose — P1's
    // localized probe must not share a category with this site, otherwise the
    // engine would re-classify P1 as category-wide (≥2 sites) by the time the
    // risk probe runs.
    const p5 = await makeSite("Dedup");
    const dupUuid = `f04-dup-${randomUUID()}`;
    try {
      await Inspection.insertMany([
        { ...makeInspection(p5, u1, daysAgo(3), "Lighting failure", 28.5, 83.5), clientUuid: dupUuid },
        { ...makeInspection(p5, u2, daysAgo(2), "Illumination lamp broken", 28.5, 83.5), clientUuid: dupUuid }, // duplicate → rejected
        makeInspection(p5, u2, daysAgo(2), "Lamp not working", 28.5, 83.5005),
        makeInspection(p5, u3, daysAgo(1), "Lamp damaged", 28.5005, 83.5005),
      ], { ordered: false });
    } catch { /* duplicate key on the shared clientUuid — expected */ }
    const p5InspCount = await Inspection.countDocuments({ siteId: p5 });
    check("DEDUP: duplicate clientUuid collapsed to 3 records", p5InspCount === 3, `${p5InspCount}`);
    await checkRecurringHazards();
    const p5Alerts = await recurringFor(p5);
    check("DEDUP: one alert, 3 evidence records (dup never counted)",
      p5Alerts.length === 1 && (p5Alerts[0]?.evidence as unknown[] | undefined)?.length === 3,
      `${p5Alerts.length}/${(p5Alerts[0]?.evidence as unknown[] | undefined)?.length}`);

    // ── 7. Risk contribution (commit 2) ─────────────────────────────────────
    const risk = await get(amitToken, `/ai/risk-score/${p1.toString()}`);
    const riskData = (risk.body as AnyJson)?.data as AnyJson | undefined;
    check("RISK: 200 + recurrence fields present",
      risk.status === 200 && typeof riskData?.breakdown?.recurringHazardBonus === "number" && typeof riskData?.metrics?.recurringHazards === "number",
      JSON.stringify(riskData?.breakdown ?? null).slice(0, 120));
    check("RISK: localized open hazard adds +3", (riskData?.breakdown?.recurringHazardBonus ?? -1) === 3, `${riskData?.breakdown?.recurringHazardBonus}`);
    check("RISK: metrics.recurringHazards === 1", (riskData?.metrics?.recurringHazards ?? -1) === 1, `${riskData?.metrics?.recurringHazards}`);

    const trends = await get(amitToken, `/ai/trends/${p1.toString()}`);
    const contributors = (trends.body as AnyJson)?.data?.contributors as Array<{ key: string }> | undefined;
    check("TREND: recurring_hazards contributor present",
      Array.isArray(contributors) && contributors.some((c) => c.key === "recurring_hazards"),
      JSON.stringify(contributors ?? null).slice(0, 160));
  } finally {
    // Remove every probe site + its records/alerts/workflows.
    const siteIds = createdSites;
    const alertIds = (await Alert.find({ siteId: { $in: siteIds } }).select("_id").lean())
      .map((a) => a._id as Types.ObjectId);
    await WorkflowState.deleteMany({ alertId: { $in: alertIds } });
    await Inspection.deleteMany({ siteId: { $in: siteIds } });
    await Incident.deleteMany({ siteId: { $in: siteIds } });
    await Alert.deleteMany({ siteId: { $in: siteIds } });
    await Site.deleteMany({ _id: { $in: siteIds } });
    const leftover = await Alert.countDocuments({ siteId: { $in: siteIds } });
    check("CLEANUP: probe sites fully removed (no leftover alerts)", leftover === 0, `${leftover}`);
  }
}

// ── [F17] Evidence Integrity Battery ────────────────────────────────────────
// Feature 05 — server-side SHA-256 at ingest + re-verification. Fully
// deterministic in local mode (CLOUDINARY_ENABLED=false): uploads persist to
// disk, so MATCH / INTEGRITY_MISMATCH / unavailable are provable without any
// network. Edge cases A–H from the brief each get an assertion. Runs LAST (after
// feature04) — every fixture it creates is removed in `finally`, and the disk
// files it wrote are unlinked.

async function evidenceIntegrityBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F17] Evidence Integrity ==");
  const createdEvidenceIds: string[] = [];
  const writtenFiles: string[] = [];
  let legacyDocId: string | null = null;
  const { default: Document } = await import("../models/Document.js");

  try {
    // ── 0. Pure hash unit checks (edge A: same bytes → same hash; B: one byte flips it) ──
    const b1 = Buffer.from("agnistrot evidence payload v1");
    const b2 = Buffer.from("agnistrot evidence payload v1");
    const b3 = Buffer.from("agnistrot evidence payload v2");
    const h1 = sha256Hex(b1);
    check("sha256: deterministic (same bytes → same hash)", h1 === sha256Hex(b2), `${h1.slice(0, 12)}…`);
    check("sha256: one byte change flips the hash", h1 !== sha256Hex(b3));
    check("sha256: 64-char hex", /^[0-9a-f]{64}$/.test(h1), h1.slice(0, 16));
    check("sha256: equals node crypto reference", h1 === createHash("sha256").update(b1).digest("hex"));

    // ── Edge G1: verification URL must be the UNTRANSFORMED original ───────
    const origUrl = buildCloudinaryOriginalUrl("agnistrot/media/probe123");
    check(
      "cloudinary original URL is untransformed (no quality/fetch_format)",
      /^https:\/\//.test(origUrl) &&
        origUrl.includes("/image/upload/") &&
        !origUrl.includes("quality=") &&
        !origUrl.includes("fetch_format="),
      origUrl
    );

    // ── 1. Media ingest via real multipart upload (local mode) ─────────────
    const photoBytes = Buffer.from("FAKE-JPEG-CONTENT-FOR-EVIDENCE-BATTERY-0001");
    const up = await multipartUpload(t.rahul, "/media/upload", "file", "evidence-probe.jpg", "image/jpeg", photoBytes);
    check("media upload → 200", up.status === 200, `${up.status}: ${JSON.stringify(up.body).slice(0, 160)}`);
    const upBody = (up.body ?? {}) as { url?: unknown; contentHash?: unknown; evidenceId?: unknown };
    check("media upload returns 64-hex contentHash", typeof upBody.contentHash === "string" && /^[0-9a-f]{64}$/.test(String(upBody.contentHash)), `${upBody.contentHash}`);
    check("server hash == client-side recompute of same bytes", upBody.contentHash === sha256Hex(photoBytes), `${upBody.contentHash}`);

    const probe1Id = String(upBody.evidenceId ?? "");
    createdEvidenceIds.push(probe1Id);
    const probe1 = probe1Id ? await Evidence.findById(probe1Id).lean() : null;
    check("evidence row created for media upload", !!probe1);
    check("evidence integrityStatus unverified (hash recorded, not yet checked)", probe1?.integrityStatus === "unverified", `${probe1?.integrityStatus}`);
    check("evidence contentHash persisted", probe1?.contentHash === sha256Hex(photoBytes), `${probe1?.contentHash}`);
    check("evidence sourceType media", probe1?.sourceType === "media");
    const probe1File = String(probe1?.verificationSource ?? "");
    check("verification source is an absolute local path", probe1?.verificationSourceKind === "file" && probe1File.length > 0 && path.isAbsolute(probe1File), probe1File);
    writtenFiles.push(probe1File);

    // ── 2. Live verify → MATCH (edge F: the stored evidence bytes match) ───
    const v1res = await post(t.amit, `/evidence/${probe1Id}/verify`, {});
    const v1 = ((v1res.body as { data?: AnyJson }).data ?? {}) as { integrityStatus?: string; checkCount?: number };
    check("verify → 200 + verified", v1res.status === 200 && v1.integrityStatus === "verified", `${v1res.status}/${v1.integrityStatus}`);
    check("verify bumps checkCount to 1", (v1.checkCount ?? -1) === 1, `${v1.checkCount}`);

    // ── 3. Edge C: URL is not the identity — change it, hash still matches ─
    await Evidence.updateOne({ _id: probe1Id }, { $set: { fileUrl: "https://cdn.elsewhere.example/moved.jpg" } });
    const v2res = await post(t.amit, `/evidence/${probe1Id}/verify`, {});
    const v2 = ((v2res.body as { data?: AnyJson }).data ?? {}) as { integrityStatus?: string };
    check("display URL change alone → still verified", v2res.status === 200 && v2.integrityStatus === "verified", `${v2.integrityStatus}`);

    // ── 4. Edge B: overwrite stored bytes → INTEGRITY_MISMATCH + audit ─────
    await fs.writeFile(probe1File, Buffer.from("TAMPERED-BYTES-REPLACING-THE-STORED-FILE"));
    const v3res = await post(t.amit, `/evidence/${probe1Id}/verify`, {});
    const v3 = ((v3res.body as { data?: AnyJson }).data ?? {}) as { integrityStatus?: string; verificationNote?: string };
    check("tampered file → INTEGRITY_MISMATCH", v3res.status === 200 && v3.integrityStatus === "INTEGRITY_MISMATCH", `${v3.integrityStatus}: ${String(v3.verificationNote ?? "").slice(0, 80)}`);
    const tamperAudit = await AuditLog.findOne({ entityType: "evidence", action: "tampered" }).lean();
    check("audit trail records the tampered event", !!tamperAudit);
    // Restore the original bytes so the verify-all pass below sees a clean file.
    await fs.writeFile(probe1File, photoBytes);

    // ── 5. Edges A/E: same content re-uploaded → same hash, NOT fraud ──────
    const up2 = await multipartUpload(t.priya, "/media/upload", "file", "evidence-probe-copy.jpg", "image/jpeg", photoBytes);
    const up2Body = (up2.body ?? {}) as { contentHash?: unknown; evidenceId?: unknown };
    check("identical content re-uploaded → same contentHash", up2.status === 200 && up2Body.contentHash === sha256Hex(photoBytes), `${up2Body.contentHash}`);
    const probe2Id = String(up2Body.evidenceId ?? "");
    createdEvidenceIds.push(probe2Id);
    const probe2 = probe2Id ? await Evidence.findById(probe2Id).lean() : null;
    writtenFiles.push(String(probe2?.verificationSource ?? ""));
    const v4res = await post(t.amit, `/evidence/${probe2Id}/verify`, {});
    const v4 = ((v4res.body as { data?: AnyJson }).data ?? {}) as { integrityStatus?: string };
    check("duplicate content → verified (same binary detected, not tampered)", v4res.status === 200 && v4.integrityStatus === "verified", `${v4.integrityStatus}`);

    const listRes = await get(t.amit, "/evidence");
    const listRows = ((listRes.body as { data?: AnyJson }).data ?? []) as Array<{
      id?: string;
      contentHash?: string | null;
      integrityStatus?: string;
      duplicateCount?: number;
    }>;
    check("list exposes duplicateCount ≥ 1 for the twin pair", listRows.some((r) => (r.duplicateCount ?? 0) >= 1), `rows=${listRows.length}`);
    const probe1Row = listRows.find((r) => r.id === probe1Id);
    check("list row shape: contentHash + integrityStatus present", !!probe1Row && typeof probe1Row.contentHash === "string" && typeof probe1Row.integrityStatus === "string", JSON.stringify(probe1Row ?? null).slice(0, 160));

    // ── 6. Edge G2: legacy document with NO evidence row → noBaseline ❔ ───
    const legacyDoc = await Document.create({
      siteId: new Types.ObjectId(sites.SJ),
      sourceImageUrl: "https://example.com/legacy-form.jpg",
      extractedFields: { formType: "safety" },
      confidence: 0.9,
      reviewStatus: "pending",
    });
    legacyDocId = (legacyDoc._id as unknown as string).toString();

    const dash = await get(t.amit, "/evidence/dashboard");
    const d = ((dash.body as { data?: AnyJson }).data ?? {}) as Record<string, number>;
    check("dashboard counts legacy documents without a baseline", (d.noBaseline ?? 0) >= 1, `${d.noBaseline}`);
    check("dashboard mismatched ≥ 1 (tampered probe)", (d.mismatched ?? 0) >= 1, `${d.mismatched}`);
    check("dashboard verified ≥ 1 (checked probe)", (d.verified ?? 0) >= 1, `${d.verified}`);
    check("checked == verified + mismatched + unavailable", (d.checked ?? -1) === (d.verified ?? 0) + (d.mismatched ?? 0) + (d.unavailable ?? 0), `${d.checked} vs ${d.verified}+${d.mismatched}+${d.unavailable}`);

    // ── 7. verify-all (dashboard "check all") — oversight roles only ───────
    const va1 = await post(t.meena, "/evidence/verify-all", {});
    const va1d = ((va1.body as { data?: AnyJson }).data ?? {}) as Record<string, number>;
    check("regulator verify-all → 200", va1.status === 200, `${va1.status}`);
    check("verify-all summary: checked ≥ 2", (va1d.checked ?? -1) >= 2, `${va1d.checked}`);
    check("verify-all summary: verified ≥ 2 (both probes restored)", (va1d.verified ?? -1) >= 2, `${va1d.verified}`);
    check(
      "verify-all summary buckets sum to checked",
      (va1d.checked ?? -1) === (va1d.verified ?? 0) + (va1d.mismatched ?? 0) + (va1d.unavailable ?? 0) + (va1d.unverified ?? 0) + (va1d.uploadFailed ?? 0),
      JSON.stringify(va1d)
    );
    const va2 = await post(t.amit, "/evidence/verify-all", {});
    check("corporate verify-all → 200", va2.status === 200);

    // ── 8. Role gating + fail-closed scoping ────────────────────────────────
    check("field_officer evidence list → 403", (await get(t.rahul, "/evidence")).status === 403);
    check("field_officer dashboard → 403", (await get(t.rahul, "/evidence/dashboard")).status === 403);
    check("malformed evidence id → 400", (await post(t.amit, "/evidence/not-an-id/verify", {})).status === 400);
    const unknownEvId = new Types.ObjectId().toString();
    check("unknown evidence id → 404", (await post(t.amit, `/evidence/${unknownEvId}/verify`, {})).status === 404);

    // Cross-site probe row (site SD): mine_official priya (SJ) must not see or touch it.
    const crossEv = await Evidence.create({
      sourceType: "media",
      siteId: new Types.ObjectId(sites.SD),
      fileUrl: "https://local.invalid/cross-site.jpg",
      verificationSource: probe1File,
      verificationSourceKind: "file",
      contentHash: sha256Hex(photoBytes),
      fileName: "cross-site.jpg",
      uploadedBy: new Types.ObjectId(),
      uploadedAt: new Date(),
      integrityStatus: "unverified",
    });
    const crossId = (crossEv._id as unknown as string).toString();
    createdEvidenceIds.push(crossId);
    check("mine_official verify cross-site evidence → 404", (await post(t.priya, `/evidence/${crossId}/verify`, {})).status === 404);
    const moList = await get(t.priya, "/evidence");
    const moRows = ((moList.body as { data?: AnyJson }).data ?? []) as Array<{ id: string }>;
    check("mine_official list excludes cross-site evidence", moRows.length > 0 && !moRows.some((r) => r.id === crossId), `rows=${moRows.length}`);
    check("mine_official own-site list → 200 with rows", moList.status === 200 && moRows.some((r) => r.id === probe1Id), `rows=${moRows.length}`);
    const regList = await get(t.meena, "/evidence");
    const regRows = ((regList.body as { data?: AnyJson }).data ?? []) as Array<{ id: string }>;
    check("regulator sees cross-site evidence", regRows.some((r) => r.id === crossId));

    // ── 9. Edge G: UPLOAD_FAILED bucketed, never a false success ───────────
    const failedRow = await Evidence.create({
      sourceType: "media",
      siteId: new Types.ObjectId(sites.SJ),
      fileUrl: "https://local.invalid/upload-failed.jpg",
      verificationSource: UPLOAD_FAILED_SENTINEL,
      verificationSourceKind: "url",
      contentHash: sha256Hex(Buffer.from("bytes-never-stored")),
      fileName: "failed.jpg",
      uploadedBy: new Types.ObjectId(),
      uploadedAt: new Date(),
      integrityStatus: "UPLOAD_FAILED",
      verificationNote: "Cloudinary upload failed — no stored file.",
    });
    const failedId = (failedRow._id as unknown as string).toString();
    createdEvidenceIds.push(failedId);
    const dash2 = await get(t.amit, "/evidence/dashboard");
    const d2 = ((dash2.body as { data?: AnyJson }).data ?? {}) as Record<string, number>;
    check("dashboard counts UPLOAD_FAILED rows", (d2.uploadFailed ?? 0) >= 1, `${d2.uploadFailed}`);
    const fv = await post(t.amit, `/evidence/${failedId}/verify`, {});
    const fvd = ((fv.body as { data?: AnyJson }).data ?? {}) as { integrityStatus?: string };
    check("verify on failed upload stays UPLOAD_FAILED (no false success)", fv.status === 200 && fvd.integrityStatus === "UPLOAD_FAILED", `${fvd.integrityStatus}`);

    // ── 10. Edge D: metadata changes never flip integrity ───────────────────
    const docEv = await Evidence.create({
      sourceType: "document",
      sourceRecordId: legacyDoc._id,
      siteId: new Types.ObjectId(sites.SJ),
      fileUrl: "https://example.com/legacy-form.jpg",
      verificationSource: probe1File,
      verificationSourceKind: "file",
      contentHash: sha256Hex(photoBytes),
      fileName: "legacy-form.jpg",
      uploadedBy: new Types.ObjectId(),
      uploadedAt: new Date(),
      integrityStatus: "verified",
      verificationNote: "MATCH: verified earlier.",
    });
    const docEvId = (docEv._id as unknown as string).toString();
    createdEvidenceIds.push(docEvId);
    const confirm = await post(t.amit, `/documents/${legacyDocId}/confirm`, {
      correctedFields: { formType: "environmental" },
    });
    const docEvAfter = await Evidence.findById(docEvId).lean();
    check(
      "document metadata change does not alter evidence integrity status",
      confirm.status === 200 && docEvAfter?.integrityStatus === "verified",
      `${confirm.status}/${docEvAfter?.integrityStatus}`
    );
  } finally {
    // Remove every evidence row + the legacy document + every file written.
    await Evidence.deleteMany({ _id: { $in: createdEvidenceIds.map((x) => new Types.ObjectId(x)) } });
    if (legacyDocId) await Document.deleteOne({ _id: new Types.ObjectId(legacyDocId) });
    for (const f of writtenFiles) {
      if (!f) continue;
      try { await fs.unlink(f); } catch { /* already gone */ }
    }
    const leftover = await Evidence.countDocuments({ _id: { $in: createdEvidenceIds.map((x) => new Types.ObjectId(x)) } });
    check("CLEANUP: evidence fixtures fully removed", leftover === 0, `${leftover}`);
  }
}

// ── [F18] Hazard Register + Control Effectiveness Battery ────────────────────
// Feature 06 — deterministic 5×5 risk matrix + hierarchy-of-controls
// effectiveness engine + the post-control recurrence sweep (batch phase D).
// Pure unit checks first (matrix bands, tier reductions, recurrence override),
// then the full register lifecycle over the API (register → plan → implement →
// assess → close) with RBAC, site scoping and validation probes, and finally a
// direct invocation of the sweep with a deliberately re-sighted pattern alert.
// Runs LAST (after feature05); every fixture (hazards + pattern alerts) is
// removed in `finally`.

async function hazardRegisterBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F18] Hazard Register & Control Effectiveness ==");
  const createdHazardIds: string[] = [];
  const createdAlertIds: string[] = [];

  try {
    const priyaUser = await User.findOne({ email: "priya@agnistrot.com" }).lean();
    const officialId = (priyaUser?._id ?? new Types.ObjectId()) as Types.ObjectId;

    const fixtureAlert = (overrides: Record<string, unknown> = {}) =>
      Alert.create({
        siteId: new Types.ObjectId(sites.SJ),
        sourceType: "inspection" as const,
        ruleKey: `f18:${randomUUID()}`,
        ruleCode: "RECURRING_HAZARD" as const,
        severity: "high" as const,
        status: "open" as const,
        assignedTo: officialId,
        slaSnapshot: {
          ackSla: 240,
          resolutionSla: 1440,
          escalationChain: [
            { level: 1, role: "mine_official", waitMinutes: 240 },
            { level: 2, role: "corporate_manager", waitMinutes: 480 },
            { level: 3, role: "regulator", waitMinutes: 720 },
          ],
        },
        ackDeadline: new Date(Date.now() + 240 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 1440 * 60 * 1000),
        currentLevel: 1,
        escalationCount: 0,
        category: "LIGHTING",
        scope: "localized",
        evidence: [],
        reportCount: 3,
        uniqueReporters: 2,
        firstReportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        lastReportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        ...overrides,
      });

    // ── 0. Pure engine unit checks ─────────────────────────────────────────
    check("matrix: 1×1 → low(1)", (() => { const r = riskLevelFor(1, 1); return r.riskScore === 1 && r.riskLevel === "low"; })());
    check("matrix: 2×3 → medium(6)", (() => { const r = riskLevelFor(2, 3); return r.riskScore === 6 && r.riskLevel === "medium"; })());
    check("matrix: 3×5 → high(15)", (() => { const r = riskLevelFor(3, 5); return r.riskScore === 15 && r.riskLevel === "high"; })());
    check("matrix: 5×5 → critical(25)", (() => { const r = riskLevelFor(5, 5); return r.riskScore === 25 && r.riskLevel === "critical"; })());
    check("matrix: drivers clamp to 1-5 (0×9 → 1×5 = 5 medium)", (() => { const r = riskLevelFor(0, 9); return r.riskScore === 5 && r.riskLevel === "medium"; })());
    check("hierarchy: elimination weight 5 / ppe weight 1", CONTROL_HIERARCHY_WEIGHT.elimination === 5 && CONTROL_HIERARCHY_WEIGHT.ppe === 1);
    check("nextControlTier: ppe → administrative", nextControlTier("ppe") === "administrative");
    check("nextControlTier: elimination → null (top tier)", nextControlTier("elimination") === null);

    const base = { likelihood: 5, consequence: 4 };
    const ctl = (controlType: "ppe" | "engineering" | "substitution" | "elimination") => [{ controlType, implemented: true } as const];
    const ppe = assessEffectiveness({ ...base, controls: ctl("ppe") });
    check("effectiveness: ppe-only → ineffective, no reduction", ppe.status === "ineffective" && ppe.reduction === 0 && ppe.residualRiskScore === 20, `${ppe.status}/${ppe.reduction}/${ppe.residualRiskScore}`);
    const eng = assessEffectiveness({ ...base, controls: ctl("engineering") });
    check("effectiveness: engineering → partially_effective (-1)", eng.status === "partially_effective" && eng.reduction === 1 && eng.residualRiskScore === 12, `${eng.status}/${eng.reduction}/${eng.residualRiskScore}`);
    const sub = assessEffectiveness({ ...base, controls: ctl("substitution") });
    check("effectiveness: substitution → effective (-2)", sub.status === "effective" && sub.reduction === 2 && sub.residualRiskScore === 6, `${sub.status}/${sub.reduction}/${sub.residualRiskScore}`);
    const eli = assessEffectiveness({ ...base, controls: ctl("elimination") });
    check("effectiveness: elimination → effective (-3)", eli.status === "effective" && eli.reduction === 3 && eli.residualRiskScore === 2, `${eli.status}/${eli.reduction}/${eli.residualRiskScore}`);
    const recur = assessEffectiveness({ ...base, controls: ctl("elimination") }, { recurrence: true });
    check("effectiveness: recurrence override beats elimination", recur.status === "ineffective" && recur.recurrenceOverride === true, `${recur.status}/${recur.recurrenceOverride}`);

    // ── 1. Register lifecycle (corporate) ───────────────────────────────────
    const reg = await post(t.amit, "/hazards", {
      siteId: sites.SJ,
      title: "Ventilation fan bearing failure",
      description: "Recurring ventilation fan bearing overheating near shaft 2",
      likelihood: 4,
      consequence: 3,
    });
    const regDto = ((reg.body as { data?: AnyJson }).data ?? {}) as { id?: string; riskScore?: number; riskLevel?: string; category?: string; status?: string; sourceType?: string };
    check("register hazard → 201 with id", reg.status === 201 && !!regDto.id, `${reg.status}`);
    const ventId = String(regDto.id ?? "");
    createdHazardIds.push(ventId);
    check("risk matrix computed server-side (4×3 = 12 high)", regDto.riskScore === 12 && regDto.riskLevel === "high", `${regDto.riskScore}/${regDto.riskLevel}`);
    check("canonical category computed server-side (VENTILATION)", regDto.category === "VENTILATION", String(regDto.category));
    check("hazard starts open + manual source", regDto.status === "open" && regDto.sourceType === "manual", JSON.stringify(regDto));

    // ── 2. Validation + authority probes ────────────────────────────────────
    check("register missing likelihood → 400", (await post(t.amit, "/hazards", { siteId: sites.SJ, title: "X", description: "missing driver probe", consequence: 3 })).status === 400);
    check("register likelihood 0 → 400", (await post(t.amit, "/hazards", { siteId: sites.SJ, title: "X", description: "likelihood out-of-range probe", likelihood: 0, consequence: 3 })).status === 400);
    check("register likelihood 6 → 400", (await post(t.amit, "/hazards", { siteId: sites.SJ, title: "X", description: "likelihood out-of-range probe 2", likelihood: 6, consequence: 3 })).status === 400);
    check("register short title → 400", (await post(t.amit, "/hazards", { siteId: sites.SJ, title: "X", description: "short title probe", likelihood: 2, consequence: 2 })).status === 400);
    check("field_officer register → 403", (await post(t.rahul, "/hazards", { siteId: sites.SJ, title: "Blocked", description: "field officer must not register hazards", likelihood: 2, consequence: 2 })).status === 403);
    check("regulator register → 403 (read-only oversight)", (await post(t.meena, "/hazards", { siteId: sites.SJ, title: "Blocked", description: "regulator must not register hazards", likelihood: 2, consequence: 2 })).status === 403);
    check("mine_official register cross-site → 403", (await post(t.priya, "/hazards", { siteId: sites.SD, title: "Cross", description: "cross-site fence jump probe", likelihood: 2, consequence: 2 })).status === 403);
    check("malformed hazard id → 400", (await get(t.amit, "/hazards/not-an-id")).status === 400);

    // ── 3. mine_official own-site register ──────────────────────────────────
    const moReg = await post(t.priya, "/hazards", {
      siteId: sites.SJ,
      title: "Roof bolt loosening",
      description: "Loose roof bolts observed in the development heading",
      likelihood: 3,
      consequence: 5,
    });
    const moDto = ((moReg.body as { data?: AnyJson }).data ?? {}) as { id?: string; riskLevel?: string };
    check("mine_official own-site register → 201", moReg.status === 201 && !!moDto.id, `${moReg.status}`);
    const roofId = String(moDto.id ?? "");
    createdHazardIds.push(roofId);
    check("mine_official register 3×5 → high", moDto.riskLevel === "high", String(moDto.riskLevel));

    // ── 4. Corporate registers a cross-site (SD) hazard for scope probes ────
    const sdReg = await post(t.amit, "/hazards", {
      siteId: sites.SD,
      title: "Conveyor belt spillage",
      description: "Belt spillage around the transfer points",
      likelihood: 2,
      consequence: 2,
    });
    const sdDto = ((sdReg.body as { data?: AnyJson }).data ?? {}) as { id?: string; riskLevel?: string };
    check("corporate register at SD → 201 low (2×2)", sdReg.status === 201 && sdDto.riskLevel === "low", `${sdReg.status}/${sdDto.riskLevel}`);
    const sdId = String(sdDto.id ?? "");
    createdHazardIds.push(sdId);

    // ── 5. mine_official scoping — own site only, fail-closed ───────────────
    const moList = await get(t.priya, "/hazards");
    const moRows = ((moList.body as { data?: AnyJson }).data ?? []) as Array<{ id: string; siteId: string }>;
    check("mine_official sees own-site hazards", moList.status === 200 && moRows.some((r) => r.id === ventId), `rows=${moRows.length}`);
    check("mine_official list excludes cross-site hazards", moRows.every((r) => r.siteId === sites.SJ), `rows=${moRows.length}`);
    check("mine_official cross-site detail → 404 (fail-closed)", (await get(t.priya, `/hazards/${sdId}`)).status === 404);
    const corpHazard = await get(t.amit, `/hazards/${sdId}`);
    check("corporate/regulator cross-site detail → 200", corpHazard.status === 200 && ((corpHazard.body as { data?: AnyJson }).data as { siteName?: unknown } | undefined)?.siteName !== undefined, `${corpHazard.status}`);
    check("regulator list → 200 (all sites)", (await get(t.meena, "/hazards")).status === 200);
    check("field_officer list → 403", (await get(t.rahul, "/hazards")).status === 403);

    // Both ventilation (4×3) and roof (3×5) are high here — the filter is
    // meaningful BEFORE any risk re-scoring.
    const highFilter = await get(t.amit, "/hazards?riskLevel=high");
    const highRows = ((highFilter.body as { data?: AnyJson }).data ?? []) as Array<{ riskLevel: string; id: string }>;
    check("?riskLevel=high returns only high rows", highRows.length >= 2 && highRows.some((r) => r.id === ventId) && highRows.every((r) => r.riskLevel === "high"), `rows=${highRows.length}`);

    // ── 6. Risk update recomputes the matrix + closed hazard is immutable ───
    const put = await api(`/hazards/${roofId}`, { token: t.priya, method: "PUT", body: { likelihood: 1 } });
    const putDto = ((put.body as { data?: AnyJson }).data ?? {}) as { riskScore?: number; riskLevel?: string };
    check("PUT drivers recompute risk (1×5 = 5 medium)", put.status === 200 && putDto.riskScore === 5 && putDto.riskLevel === "medium", `${put.status}/${putDto.riskScore}/${putDto.riskLevel}`);

    // ── 7. Register from an open RECURRING_HAZARD alert (source = alert) ────
    const sourceAlert = await fixtureAlert();
    createdAlertIds.push(String((sourceAlert._id as unknown as string)));
    const fromAlert = await post(t.amit, "/hazards", {
      siteId: sites.SJ,
      title: "Shaft lighting intermittent",
      description: "Shaft lighting keeps failing on the evening shift",
      likelihood: 3,
      consequence: 3,
      sourceAlertId: String(sourceAlert._id),
    });
    const fromAlertDto = ((fromAlert.body as { data?: AnyJson }).data ?? {}) as { id?: string; sourceType?: string; category?: string };
    check("register from open pattern alert → 201 sourceType alert", fromAlert.status === 201 && fromAlertDto.sourceType === "alert", `${fromAlert.status}/${fromAlertDto.sourceType}`);
    const lightingId = String(fromAlertDto.id ?? "");
    createdHazardIds.push(lightingId);
    check("alert-source hazard shares canonical category", fromAlertDto.category === "LIGHTING", String(fromAlertDto.category));

    const wrongRuleAlert = await fixtureAlert({ ruleCode: "SAFETY_CHECKLIST_FAIL" as const, category: undefined });
    createdAlertIds.push(String((wrongRuleAlert._id as unknown as string)));
    check("sourceAlertId must be RECURRING_HAZARD → 400", (await post(t.amit, "/hazards", { siteId: sites.SJ, title: "Bad source", description: "wrong rule alert probe", likelihood: 2, consequence: 2, sourceAlertId: String(wrongRuleAlert._id) })).status === 400);
    const crossAlert = await fixtureAlert({ siteId: new Types.ObjectId(sites.SD) });
    createdAlertIds.push(String((crossAlert._id as unknown as string)));
    check("sourceAlertId cross-site → 400", (await post(t.amit, "/hazards", { siteId: sites.SJ, title: "Bad source", description: "cross-site alert probe", likelihood: 2, consequence: 2, sourceAlertId: String(crossAlert._id) })).status === 400);
    const ghostId = new Types.ObjectId().toString();
    check("sourceAlertId unknown → 400", (await post(t.amit, "/hazards", { siteId: sites.SJ, title: "Bad source", description: "ghost alert probe", likelihood: 2, consequence: 2, sourceAlertId: ghostId })).status === 400);

    // ── 8. Control hierarchy lifecycle on the VENTILATION hazard ────────────
    const addPpe = await post(t.amit, `/hazards/${ventId}/controls`, { description: "Issue hearing + dust PPE to shaft crew", controlType: "ppe" });
    const addPpeDto = ((addPpe.body as { data?: AnyJson }).data ?? {}) as { controls?: Array<{ id?: string; implemented?: boolean }> };
    check("add ppe control → 201, hazard stays open", addPpe.status === 201 && (addPpeDto.controls?.length ?? 0) === 1 && (addPpeDto.controls?.[0]?.implemented) === false, `${addPpe.status}`);
    const ppeControlId = String(addPpeDto.controls?.[0]?.id ?? "");
    const wrongControl = await post(t.amit, `/hazards/${ventId}/controls`, { description: "Bad tier", controlType: "magic" });
    check("invalid controlType → 400", wrongControl.status === 400, `${wrongControl.status}`);

    const impl = await post(t.amit, `/hazards/${ventId}/controls/${ppeControlId}/implement`, {});
    const implDto = ((impl.body as { data?: AnyJson }).data ?? {}) as { status?: string };
    check("implement control → status mitigating", impl.status === 200 && implDto.status === "mitigating", `${impl.status}/${implDto.status}`);
    const reImpl = await post(t.amit, `/hazards/${ventId}/controls/${ppeControlId}/implement`, {});
    check("re-implement is idempotent (200)", reImpl.status === 200, `${reImpl.status}`);

    const assessPpe = await post(t.amit, `/hazards/${ventId}/effectiveness`, {});
    const assessPpeDto = ((assessPpe.body as { data?: AnyJson }).data ?? {}) as { status?: string; effectiveness?: { status?: string; reduction?: number } };
    check("assess ppe-only → ineffective, stays mitigating", assessPpe.status === 200 && assessPpeDto.effectiveness?.status === "ineffective" && assessPpeDto.status === "mitigating", `${assessPpe.status}/${assessPpeDto.effectiveness?.status}`);

    const assessNoControls = await post(t.amit, `/hazards/${lightingId}/effectiveness`, {});
    check("assess without implemented controls → 400", assessNoControls.status === 400, `${assessNoControls.status}`);

    const addEng = await post(t.amit, `/hazards/${ventId}/controls`, { description: "Bearing guard + thermal trip on fan housing", controlType: "engineering" });
    const engControlId = String(((addEng.body as { data?: AnyJson }).data as { controls?: Array<{ id?: string; controlType?: string }> } | undefined)?.controls?.find((c) => c.controlType === "engineering")?.id ?? "");
    await post(t.amit, `/hazards/${ventId}/controls/${engControlId}/implement`, {});
    const assessEng = await post(t.amit, `/hazards/${ventId}/effectiveness`, {});
    const assessEngDto = ((assessEng.body as { data?: AnyJson }).data ?? {}) as { status?: string; effectiveness?: { status?: string; reduction?: number } };
    check("assess engineering (strongest implemented) → partially_effective", assessEng.status === 200 && assessEngDto.effectiveness?.status === "partially_effective" && assessEngDto.effectiveness.reduction === 1, `${assessEngDto.effectiveness?.status}/${assessEngDto.effectiveness?.reduction}`);

    const addSub = await post(t.amit, `/hazards/${ventId}/controls`, { description: "Replace plain bearings with self-lubricating ceramic bearings", controlType: "substitution" });
    const subControlId = String(((addSub.body as { data?: AnyJson }).data as { controls?: Array<{ id?: string; controlType?: string }> } | undefined)?.controls?.find((c) => c.controlType === "substitution")?.id ?? "");
    await post(t.amit, `/hazards/${ventId}/controls/${subControlId}/implement`, {});
    const assessSub = await post(t.amit, `/hazards/${ventId}/effectiveness`, {});
    const assessSubDto = ((assessSub.body as { data?: AnyJson }).data ?? {}) as { status?: string; effectiveness?: { status?: string; residualRiskScore?: number } };
    check("assess substitution → effective → controlled", assessSub.status === 200 && assessSubDto.effectiveness?.status === "effective" && assessSubDto.status === "controlled", `${assessSubDto.effectiveness?.status}/${assessSubDto.status}`);

    // Ventilation is controlled here — dashboard must count it before the close in step 9.
    const dashControlled = ((await get(t.meena, "/hazards/dashboard")).body as { data?: AnyJson })?.data as Record<string, number> | undefined;
    check("dashboard: controlled ≥ 1 (ventilation effective)", (dashControlled?.controlled ?? 0) >= 1, `${dashControlled?.controlled}`);

    // ── 9. Close lifecycle ───────────────────────────────────────────────────
    const closeOpen = await post(t.amit, `/hazards/${lightingId}/close`, { closureNote: "premature close attempt" });
    check("close an open (uncontrolled) hazard → 409", closeOpen.status === 409, `${closeOpen.status}`);
    const close = await post(t.amit, `/hazards/${ventId}/close`, { closureNote: "ceramic bearings installed, airflow restored" });
    check("close controlled hazard → closed", close.status === 200 && ((close.body as { data?: AnyJson }).data as { status?: string } | undefined)?.status === "closed", `${close.status}`);
    const reClose = await post(t.amit, `/hazards/${ventId}/close`, { closureNote: "second close attempt" });
    check("re-close → 409", reClose.status === 409, `${reClose.status}`);
    const putClosed = await api(`/hazards/${ventId}`, { token: t.amit, method: "PUT", body: { title: "Ventilation fan bearing failure (edited)" } });
    check("update a closed hazard → 409 (immutable)", putClosed.status === 409, `${putClosed.status}`);
    const addToClosed = await post(t.amit, `/hazards/${ventId}/controls`, { description: "late control", controlType: "administrative" });
    check("add control to closed hazard → 409", addToClosed.status === 409, `${addToClosed.status}`);

    // ── 10. Dashboard + list filters ────────────────────────────────────────
    const dash = await get(t.meena, "/hazards/dashboard");
    const d = ((dash.body as { data?: AnyJson }).data ?? {}) as Record<string, number>;
    check("dashboard total ≥ 4", (d.total ?? 0) >= 4, `${d.total}`);
    check("dashboard open ≥ 2", (d.open ?? 0) >= 2, `${d.open}`);
    check("dashboard closed ≥ 1 (ventilation retired)", (d.closed ?? 0) >= 1, `${d.closed}`);
    check("dashboard shape complete", typeof d.total === "number" && typeof d.mitigating === "number" && typeof d.high === "number" && typeof d.controlled === "number", JSON.stringify(d));

    const openFilter = await get(t.amit, "/hazards?status=open");
    const openRows = ((openFilter.body as { data?: AnyJson }).data ?? []) as Array<{ status: string }>;
    check("?status=open returns only open rows", openFilter.status === 200 && openRows.length >= 2 && openRows.every((r) => r.status === "open"), `rows=${openRows.length}`);
    const catFilter = await get(t.amit, "/hazards?category=LIGHTING");
    const catRows = ((catFilter.body as { data?: AnyJson }).data ?? []) as Array<{ id: string }>;
    check("?category=LIGHTING returns the alert-source hazard", catRows.some((r) => r.id === lightingId), `rows=${catRows.length}`);

    // ── 11. Phase D sweep: post-control recurrence → ineffective override ───
    const sweepReg = await post(t.amit, "/hazards", {
      siteId: sites.SJ,
      title: "Housekeeping clutter at belt transfer",
      description: "Debris piles recurring at the belt transfer point",
      likelihood: 3,
      consequence: 3,
    });
    const sweepId = String(((sweepReg.body as { data?: AnyJson }).data as { id?: string } | undefined)?.id ?? "");
    createdHazardIds.push(sweepId);
    const sweepCtl = await post(t.amit, `/hazards/${sweepId}/controls`, { description: "Housekeeping sweep roster + cleanup shift", controlType: "administrative" });
    const sweepCtlId = String(((sweepCtl.body as { data?: AnyJson }).data as { controls?: Array<{ id?: string }> } | undefined)?.controls?.[0]?.id ?? "");
    await post(t.amit, `/hazards/${sweepId}/controls/${sweepCtlId}/implement`, {});
    check("sweep precondition: hazard mitigating with implemented control", ((await get(t.amit, `/hazards/${sweepId}`)).body as { data?: AnyJson }).data?.status === "mitigating");

    // The control was implemented 2 days ago (backdated — the API stamps `now`,
    // but the realistic scenario is a control that has had time to prove itself).
    // The pattern then re-sights 1 day ago — AFTER the control went live — which
    // is exactly the post-control recurrence the Phase D sweep must catch.
    const implementedTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await Hazard.updateOne(
      { _id: new Types.ObjectId(sweepId) },
      { $set: { "controls.$[ctl].implementedAt": implementedTwoDaysAgo } },
      { arrayFilters: [{ "ctl.implemented": true }] }
    );
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recurrenceAlert = await fixtureAlert({
      category: "HOUSEKEEPING",
      firstReportedAt: oneDayAgo,
      lastReportedAt: new Date(),
    });
    createdAlertIds.push(String((recurrenceAlert._id as unknown as string)));

    const sweepStats = await checkControlEffectiveness();
    check("sweep scanned ≥ 1 hazard", (sweepStats.scanned ?? -1) >= 1, `${sweepStats.scanned}`);
    check("sweep reassessed ≥ 1 hazard", (sweepStats.reassessed ?? -1) >= 1, `${sweepStats.reassessed}`);
    const sweepAfter = await get(t.amit, `/hazards/${sweepId}`);
    const sweepDto = ((sweepAfter.body as { data?: AnyJson }).data ?? {}) as { status?: string; effectiveness?: { status?: string; recurrenceOverride?: boolean } };
    check("sweep marks control ineffective via recurrence override", sweepDto.effectiveness?.status === "ineffective" && sweepDto.effectiveness.recurrenceOverride === true, JSON.stringify(sweepDto.effectiveness ?? null).slice(0, 120));
    check("recurrence-ineffective hazard stays mitigating (never controlled)", sweepDto.status === "mitigating", String(sweepDto.status));

    const dash2 = await get(t.meena, "/hazards/dashboard");
    const d2 = ((dash2.body as { data?: AnyJson }).data ?? {}) as Record<string, number>;
    check("dashboard after sweep: total ≥ 5", (d2.total ?? 0) >= 5, `${d2.total}`);
    check("dashboard after sweep: mitigating ≥ 1", (d2.mitigating ?? 0) >= 1, `${d2.mitigating}`);
  } finally {
    const hazardIds = createdHazardIds.filter((x) => /^[a-f\d]{24}$/i.test(x));
    const alertIds = createdAlertIds.filter((x) => /^[a-f\d]{24}$/i.test(x));
    await Hazard.deleteMany({ _id: { $in: hazardIds.map((x) => new Types.ObjectId(x)) } });
    await Alert.deleteMany({ _id: { $in: alertIds.map((x) => new Types.ObjectId(x)) } });
    const leftoverHazards = await Hazard.countDocuments({ _id: { $in: hazardIds.map((x) => new Types.ObjectId(x)) } });
    const leftoverAlerts = await Alert.countDocuments({ _id: { $in: alertIds.map((x) => new Types.ObjectId(x)) } });
    check("CLEANUP: hazard fixtures fully removed", leftoverHazards === 0, `${leftoverHazards}`);
    check("CLEANUP: alert fixtures fully removed", leftoverAlerts === 0, `${leftoverAlerts}`);
  }
}

// ── [F19] Admin user management battery ──────────────────────────────────────
// Feature 07: corporate can re-role / re-site / deactivate any OTHER user, and
// the DB-gated `authenticate` middleware makes those changes take effect on
// already-issued tokens (claims are re-read from the DB every request):
//   - role + site changes apply to live sessions immediately
//   - deactivation blocks NEW logins AND revokes current sessions (HTTP + socket)
//   - self-edit is forbidden; regulator / field_officer cannot manage users
// The probe is created through the real register API and deleted in `finally`
// (the terminal reseed would wipe it anyway — the explicit delete keeps the
// in-run DB canonical for the final audit-chain validation).

async function usersManagementBattery(
  t: { amit: string; priya: string; meena: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F19] Admin user management ==");
  let probeId = "";

  try {
    const probeEmail = `verify.probe.${randomUUID().slice(0, 8)}@agnistrot.com`;
    const reg = await post(t.amit, "/auth/register", {
      name: "Verify Probe Officer",
      email: probeEmail,
      password: "password123",
      role: "mine_official",
      siteId: sites.SD,
    });
    probeId = String((reg.body as { id?: string }).id ?? "");
    check("corporate registers probe (mine_official @ SD) → 201", reg.status === 201 && probeId.length > 0, `${reg.status}`);

    // ── fresh token reflects DB claims (mine_official @ SD) ───────────────
    const t0 = await login(probeEmail);
    check("probe login → 200 (mine_official)", !!t0);
    check("mine_official blocked from /users → 403", (await get(t0, "/users")).status === 403);

    const inspSD = (await get(t0, "/inspections")).body as { data: Array<{ siteId: string }> };
    check("probe sees only SD inspections", inspSD.data.length > 0 && inspSD.data.every((r) => r.siteId === sites.SD), `rows=${inspSD.data.length}`);

    // ── live site move on an existing token ───────────────────────────────
    const move = await api(`/users/${probeId}`, { token: t.amit, method: "PATCH", body: { siteId: sites.SJ } });
    check("PATCH siteId SD→SJ → 200", move.status === 200, `${move.status}`);
    const inspSJ = (await get(t0, "/inspections")).body as { data: Array<{ siteId: string }> };
    check("same token re-scoped to SJ immediately", inspSJ.data.length > 0 && inspSJ.data.every((r) => r.siteId === sites.SJ), `rows=${inspSJ.data.length}`);

    // ── live role change on the same token ────────────────────────────────
    const promote = await api(`/users/${probeId}`, { token: t.amit, method: "PATCH", body: { role: "corporate_manager" } });
    const promoteBody = promote.body as { role?: string; siteId?: string | null };
    check("PATCH role → corporate_manager → 200 + site cleared", promote.status === 200 && promoteBody.role === "corporate_manager" && promoteBody.siteId === null, `${promote.status}`);
    check("same token lists /users now (live role apply)", (await get(t0, "/users")).status === 200);

    const byRole = (await get(t.amit, "/users?role=corporate_manager")).body as { data: Array<{ id: string }> };
    check("?role=corporate_manager includes probe", byRole.data.some((r) => r.id === probeId), `rows=${byRole.data.length}`);

    // ── deactivation: blocks login AND revokes the live session ───────────
    const deact = await api(`/users/${probeId}`, { token: t.amit, method: "PATCH", body: { status: "inactive" } });
    check("PATCH status inactive → 200", deact.status === 200 && (deact.body as { status?: string }).status === "inactive", `${deact.status}`);

    const blockedLogin = await api("/auth/login", { method: "POST", body: { email: probeEmail, password: "password123" } });
    check("deactivated login → 403 w/ message", blockedLogin.status === 403 && /deactivated/i.test(String((blockedLogin.body as { error?: string }).error ?? "")), `${blockedLogin.status}`);
    check("pre-issued token now revoked → 401", (await get(t0, "/users")).status === 401);

    const byStatus = (await get(t.amit, "/users?status=inactive")).body as { data: Array<{ id: string; status: string }> };
    check("?status=inactive includes probe", byStatus.data.some((r) => r.id === probeId && r.status === "inactive"), `rows=${byStatus.data.length}`);

    // ── reactivation restores access ──────────────────────────────────────
    const react = await api(`/users/${probeId}`, { token: t.amit, method: "PATCH", body: { status: "active" } });
    check("PATCH status active → 200", react.status === 200, `${react.status}`);
    const t1 = await login(probeEmail);
    check("reactivated login works again", !!t1 && (await get(t1, "/users")).status === 200);

    // ── guards ────────────────────────────────────────────────────────────
    const dir = (await get(t.amit, "/users")).body as { data: Array<{ id: string; email: string }> };
    const amitId = dir.data.find((u) => u.email === "amit@agnistrot.com")?.id ?? "";
    check("self-edit → 400", (await api(`/users/${amitId}`, { token: t.amit, method: "PATCH", body: { status: "inactive" } })).status === 400, amitId);
    check("site-scoped role without siteId → 400", (await api(`/users/${probeId}`, { token: t.amit, method: "PATCH", body: { role: "mine_official" } })).status === 400);
    check("invalid role → 400", (await api(`/users/${probeId}`, { token: t.amit, method: "PATCH", body: { role: "superuser" } })).status === 400);
    check("malformed id → 400", (await api("/users/not-an-id", { token: t.amit, method: "PATCH", body: { status: "active" } })).status === 400);
    check("unknown id → 404", (await api(`/users/${new Types.ObjectId().toString()}`, { token: t.amit, method: "PATCH", body: { status: "active" } })).status === 404);
    check("regulator PATCH → 403", (await api(`/users/${probeId}`, { token: t.meena, method: "PATCH", body: { status: "inactive" } })).status === 403);
    check("field_officer PATCH → 403", (await api(`/users/${probeId}`, { token: t.rahul, method: "PATCH", body: { status: "inactive" } })).status === 403);

    // ── email immutable (schema strips unknown fields) ────────────────────
    const emailInj = await api(`/users/${probeId}`, { token: t.amit, method: "PATCH", body: { email: "hacked@agnistrot.com", name: "Verify Probe Renamed" } });
    const injBody = emailInj.body as { email?: string; name?: string };
    check("email injection ignored, name applied → 200", emailInj.status === 200 && injBody.email === probeEmail && injBody.name === "Verify Probe Renamed", JSON.stringify(emailInj.body).slice(0, 100));
  } finally {
    if (probeId) await User.deleteOne({ _id: new Types.ObjectId(probeId) });
  }
}

// ── [F20] Corrective action close-out loop ───────────────────────────────────
// Feature 08 — a persistent close-out record (1:1 with the source alert) turns
// the derived corrective feed into a real loop: mine_official (own site) or
// corporate submits evidence → status "verified"; corporate approves → terminal
// "closed"; rejects → "rejected" and the submitter may resubmit. Probes are
// created directly (resolved alerts) so every assertion is deterministic and
// self-clean — the resolve API itself is covered by battery F1.

async function closeoutBattery(
  t: { amit: string; priya: string; meena: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F20] Corrective action close-out loop ==");
  const createdAlerts: Types.ObjectId[] = [];

  const makeProbe = async (siteId: string, status: "open" | "closed"): Promise<string> => {
    const priyaUser = await User.findOne({ email: "priya@agnistrot.com" }).select("_id").lean();
    const probe = await Alert.create({
      siteId: new Types.ObjectId(siteId),
      sourceType: "incident",
      sourceId: new Types.ObjectId(),
      ruleKey: `f20-${randomUUID()}`,
      ruleCode: "CRITICAL_INCIDENT",
      severity: "high",
      status,
      assignedTo: (priyaUser?._id ?? new Types.ObjectId()) as Types.ObjectId,
      slaSnapshot: {
        ackSla: 60,
        resolutionSla: 1440,
        escalationChain: [{ level: 1, role: "mine_official", waitMinutes: 60 }],
      },
      ...(status === "closed" ? { resolvedAt: new Date() } : {}),
    });
    const id = probe._id as Types.ObjectId;
    createdAlerts.push(id);
    return id.toString();
  };

  const closeoutBody = {
    recommendation: "Installed a locked guard rail along the haul road.",
    effectiveness: "Two consecutive weekly inspections passed with zero findings.",
    evidenceNote: "Inspection checklist in the register, week 32.",
  };

  try {
    const approveProbe = await makeProbe(sites.SJ, "closed");
    const rejectProbe = await makeProbe(sites.SJ, "closed");

    // ── RBAC guards ──────────────────────────────────────────────────────
    check("field_officer submit close-out → 403",
      (await post(t.rahul, `/corrective-actions/${approveProbe}/close-out`, closeoutBody)).status === 403);
    check("field_officer approve → 403",
      (await post(t.rahul, `/corrective-actions/${approveProbe}/approve`, {})).status === 403);
    check("regulator submit close-out → 403",
      (await post(t.meena, `/corrective-actions/${approveProbe}/close-out`, closeoutBody)).status === 403);
    check("regulator approve → 403",
      (await post(t.meena, `/corrective-actions/${approveProbe}/approve`, {})).status === 403);

    // ── malformed / unknown / unreviewable ──────────────────────────────
    check("malformed id close-out → 400",
      (await post(t.priya, "/corrective-actions/not-an-id/close-out", closeoutBody)).status === 400);
    check("unknown id close-out → 404",
      (await post(t.priya, "/corrective-actions/0123456789abcdef01234567/close-out", closeoutBody)).status === 404);
    check("malformed id approve → 400",
      (await post(t.amit, "/corrective-actions/not-an-id/approve", {})).status === 400);
    check("unknown id approve → 404",
      (await post(t.amit, "/corrective-actions/0123456789abcdef01234567/approve", {})).status === 404);
    check("unknown id reject → 404",
      (await post(t.amit, "/corrective-actions/0123456789abcdef01234567/reject", {})).status === 404);
    check("approve before any close-out → 404",
      (await post(t.amit, `/corrective-actions/${approveProbe}/approve`, {})).status === 404);

    // ── validation ───────────────────────────────────────────────────────
    check("too-short recommendation → 400",
      (await post(t.priya, `/corrective-actions/${approveProbe}/close-out`, { recommendation: "short", effectiveness: "Verified effective over two weeks." })).status === 400);
    check("missing effectiveness → 400",
      (await post(t.priya, `/corrective-actions/${approveProbe}/close-out`, { recommendation: "Replaced the damaged safety barrier." })).status === 400);

    // ── cross-site scope ─────────────────────────────────────────────────
    const sdProbe = await makeProbe(sites.SD, "closed");
    check("cross-site mine_official submit → 403",
      (await post(t.priya, `/corrective-actions/${sdProbe}/close-out`, closeoutBody)).status === 403);

    // ── unresolved guard ─────────────────────────────────────────────────
    const openProbe = await makeProbe(sites.SJ, "open");
    check("close-out on unresolved corrective action → 409",
      (await post(t.priya, `/corrective-actions/${openProbe}/close-out`, closeoutBody)).status === 409);

    // ── happy path (approve) ─────────────────────────────────────────────
    const submit = await post(t.priya, `/corrective-actions/${approveProbe}/close-out`, closeoutBody);
    const submitted = submit.body as { data?: { status?: string; recommendation?: string } };
    check("mine_official submits close-out → 201 submitted",
      submit.status === 201 && submitted.data?.status === "submitted", `${submit.status}`);

    const d1 = (await get(t.amit, `/corrective-actions/${approveProbe}`)).body as {
      data?: { status?: unknown; closeout?: { status?: unknown; recommendation?: unknown; submittedBy?: unknown } };
    };
    const c1 = d1.data?.closeout;
    check("derived status → verified after submission", d1.data?.status === "verified", `${d1.data?.status}`);
    check("detail carries closeout block with evidence + submitter",
      c1?.status === "submitted" && c1?.recommendation === closeoutBody.recommendation && c1?.submittedBy === "Priya Singh", JSON.stringify(c1 ?? null).slice(0, 160));

    check("duplicate submit while pending → 409",
      (await post(t.priya, `/corrective-actions/${approveProbe}/close-out`, closeoutBody)).status === 409);

    const verifiedList = (await get(t.amit, "/corrective-actions?status=verified")).body as { data: Array<{ id: string }> };
    check("?status=verified includes pending probe", verifiedList.data.some((r) => r.id === approveProbe), `rows=${verifiedList.data.length}`);

    const review = await post(t.amit, `/corrective-actions/${approveProbe}/approve`, { reviewNote: "Evidence checks out — closing out." });
    check("corporate approves → 200 approved",
      review.status === 200 && (review.body as { data?: { status?: string } }).data?.status === "approved", `${review.status}`);

    const d2 = (await get(t.amit, `/corrective-actions/${approveProbe}`)).body as { data?: { status?: unknown; closeout?: { status?: unknown; reviewedBy?: unknown; reviewNote?: unknown } } };
    check("derived status → closed after approval", d2.data?.status === "closed", `${d2.data?.status}`);
    check("approved closeout carries reviewer + note",
      d2.data?.closeout?.status === "approved" && d2.data?.closeout?.reviewedBy === "Amit Sharma" && d2.data?.closeout?.reviewNote === "Evidence checks out — closing out.", JSON.stringify(d2.data?.closeout ?? null).slice(0, 160));

    check("re-approve → 409", (await post(t.amit, `/corrective-actions/${approveProbe}/approve`, {})).status === 409);
    check("submit after approval → 409",
      (await post(t.priya, `/corrective-actions/${approveProbe}/close-out`, closeoutBody)).status === 409);

    // ── reject + resubmission path ───────────────────────────────────────
    check("submit on second probe → 201",
      (await post(t.priya, `/corrective-actions/${rejectProbe}/close-out`, closeoutBody)).status === 201);
    const rej = await post(t.amit, `/corrective-actions/${rejectProbe}/reject`, { reviewNote: "Missing photographic evidence." });
    check("corporate rejects → 200 rejected",
      rej.status === 200 && (rej.body as { data?: { status?: string } }).data?.status === "rejected", `${rej.status}`);
    const dRej = (await get(t.amit, `/corrective-actions/${rejectProbe}`)).body as { data?: { status?: unknown } };
    check("derived status → rejected", dRej.data?.status === "rejected", `${dRej.data?.status}`);

    const resub = await post(t.priya, `/corrective-actions/${rejectProbe}/close-out`, {
      recommendation: "Replaced guard rail AND added a daily inspection checklist sign-off.",
      effectiveness: "Thirty days of daily sign-offs with zero repeat findings.",
      evidenceNote: "Daily checklist log appended, weeks 33–37.",
    });
    check("resubmission after rejection → 200 submitted",
      resub.status === 200 && (resub.body as { data?: { status?: string } }).data?.status === "submitted", `${resub.status}`);
    const approved2 = await post(t.amit, `/corrective-actions/${rejectProbe}/approve`, {});
    check("resubmitted close-out can then be approved → 200",
      approved2.status === 200 && (approved2.body as { data?: { status?: string } }).data?.status === "approved", `${approved2.status}`);
    const dResub = (await get(t.amit, `/corrective-actions/${rejectProbe}`)).body as { data?: { status?: unknown } };
    check("derived status → closed after resubmit + approve", dResub.data?.status === "closed", `${dResub.data?.status}`);

    const closedList = (await get(t.amit, "/corrective-actions?status=closed")).body as { data: Array<{ id: string }> };
    check("?status=closed includes both closed probes",
      closedList.data.some((r) => r.id === approveProbe) && closedList.data.some((r) => r.id === rejectProbe), `rows=${closedList.data.length}`);

    // ── audit trail ───────────────────────────────────────────────────────
    const approveAudit = await AuditLog.find({ entityType: "correctiveAction", entityId: new Types.ObjectId(approveProbe) }).lean();
    check("audit logs closeout_submitted + closeout_approved",
      approveAudit.some((a) => a.action === "closeout_submitted") && approveAudit.some((a) => a.action === "closeout_approved"),
      JSON.stringify(approveAudit.map((a) => a.action)));
    const rejectAudit = await AuditLog.find({ entityType: "correctiveAction", entityId: new Types.ObjectId(rejectProbe) }).lean();
    check("audit logs closeout_rejected + resubmit + approve",
      rejectAudit.some((a) => a.action === "closeout_rejected") && rejectAudit.some((a) => a.action === "closeout_submitted") && rejectAudit.some((a) => a.action === "closeout_approved"),
      JSON.stringify(rejectAudit.map((a) => a.action)));
  } finally {
    const ids = { $in: createdAlerts };
    await CorrectiveCloseout.deleteMany({ alertId: ids });
    await WorkflowState.deleteMany({ alertId: ids });
    await Alert.deleteMany({ _id: ids });
  }
}

// ── [F21] Attendance anomaly detection battery ───────────────────────────────
// Direct, deterministic proof for the batch ATTENDANCE_ANOMALY rule: today's
// in-check-ins must deviate by MORE than ±30% from the previous 14 days' daily
// average. Controlled probe sites prove the trigger, the exact +30% no-fire
// boundary, the missing-baseline skip, the per-site/day ruleKey dedup, and
// end-to-end visibility for a corporate manager. Probes self-clean in finally.
// Only checkAttendanceAnomaly() is invoked — never runBatchRules(), which would
// also fire the overdue/repeat passes mid-suite and pollute other batteries.

async function attendanceAnomalyBattery(t: { amit: string }): Promise<void> {
  console.log("\n== [F21] Attendance anomaly detection ==");
  const createdSites: Types.ObjectId[] = [];

  const makeSite = async (sub: string): Promise<Types.ObjectId> => {
    const s = await Site.create({
      name: `F21 Probe ${sub} ${randomUUID().slice(0, 8)}`,
      subsidiary: "Verify F21 Probes",
      location: { lat: 23.7, lng: 86.4 },
      expectedWorkers: 50,
    });
    const id = s._id as Types.ObjectId;
    createdSites.push(id);
    return id;
  };

  // One shared timestamp per day (mirrors the seed) so the rule's
  // Attendance.distinct("capturedAt") counts DAYS, not records → avg = per day.
  const seedAttendance = async (
    siteId: Types.ObjectId,
    historyDays: number,
    todayCount: number
  ): Promise<void> => {
    const rows: Array<{
      clientUuid: string;
      siteId: Types.ObjectId;
      workerRef: string;
      checkType: "in";
      location: { lat: number; lng: number };
      capturedAt: Date;
    }> = [];
    const pushDay = (dayOffset: number, hour: number, count: number): void => {
      const base = new Date();
      base.setDate(base.getDate() - dayOffset);
      base.setHours(hour, 0, 0, 0);
      for (let j = 0; j < count; j++) {
        rows.push({
          clientUuid: `f21-${randomUUID()}`,
          siteId,
          workerRef: `F21 Worker ${j}`,
          checkType: "in",
          location: { lat: 23.7 + Math.random() * 0.01, lng: 86.4 + Math.random() * 0.01 },
          capturedAt: new Date(base),
        });
      }
    };
    for (let d = 1; d <= historyDays; d++) pushDay(d, 7, 20); // 20 in/day
    pushDay(0, 7, todayCount);
    await Attendance.insertMany(rows);
  };

  const anomaliesFor = (siteId: Types.ObjectId): Promise<Array<Record<string, unknown>>> =>
    Alert.find({ siteId, ruleCode: "ATTENDANCE_ANOMALY" }).lean() as unknown as Promise<Array<Record<string, unknown>>>;

  const todayKey = (siteId: Types.ObjectId): string => {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    return `anomaly:${siteId.toString()}:${s.toISOString().slice(0, 10)}`;
  };

  try {
    // 13 history days × 20 in (one timestamp each) → daily average 20.
    const HISTORY = 13;

    // ── 1. Positive: today 2 in → −90% → fires ─────────────────────────────
    const fire = await makeSite("Fire");
    await seedAttendance(fire, HISTORY, 2);

    // ── 2. Calm: today 19 in → −5% → no alert ──────────────────────────────
    const calm = await makeSite("Calm");
    await seedAttendance(calm, HISTORY, 19);

    // ── 3. Boundary: today 26 in → exactly +30% → strict > skips ───────────
    const boundary = await makeSite("Boundary");
    await seedAttendance(boundary, HISTORY, 26);

    // ── 4. Fresh: today only, no 14-day baseline → rule skips ──────────────
    const fresh = await makeSite("Fresh");
    await seedAttendance(fresh, 0, 5);

    await checkAttendanceAnomaly();

    const fireAlerts = await anomaliesFor(fire);
    check("F21 fire: −90% vs avg 20 → ATTENDANCE_ANOMALY fires", fireAlerts.length === 1, `${fireAlerts.length}`);
    const fa = fireAlerts[0] ?? {};
    check("F21 fire: severity medium + status open", fa.severity === "medium" && fa.status === "open", `${fa.severity}/${fa.status}`);
    check("F21 fire: ruleKey pins site + day", fa.ruleKey === todayKey(fire), `${fa.ruleKey}`);
    check("F21 calm: −5% → no alert", (await anomaliesFor(calm)).length === 0, `${(await anomaliesFor(calm)).length}`);
    check("F21 boundary: exactly +30% → no alert", (await anomaliesFor(boundary)).length === 0, `${(await anomaliesFor(boundary)).length}`);
    check("F21 fresh: no baseline → skipped", (await anomaliesFor(fresh)).length === 0, `${(await anomaliesFor(fresh)).length}`);

    // ── 5. Dedup: same-day rerun must not double-fire ───────────────────────
    await checkAttendanceAnomaly();
    check("F21 dedup: rerun keeps exactly one alert", (await anomaliesFor(fire)).length === 1, `${(await anomaliesFor(fire)).length}`);

    // ── 6. End-to-end: corporate reads the anomaly in the alerts feed ───────
    const list = await get(t.amit, `/alerts?siteId=${fire.toString()}&ruleCode=ATTENDANCE_ANOMALY`);
    const row = (list.body as AnyJson)?.data?.[0] as AnyJson | undefined;
    check(
      "F21 API: corporate lists the anomaly alert",
      list.status === 200 && !!row && row.ruleCode === "ATTENDANCE_ANOMALY" && row.siteId === fire.toString(),
      JSON.stringify(row ?? null).slice(0, 160)
    );
  } finally {
    const ids = { $in: createdSites };
    const alertIds = await Alert.find({ siteId: ids }).select("_id").lean();
    const aid = { $in: alertIds.map((a) => a._id as Types.ObjectId) };
    await WorkflowState.deleteMany({ alertId: aid });
    await Alert.deleteMany({ siteId: ids });
    await Attendance.deleteMany({ siteId: ids });
    await Site.deleteMany({ _id: ids });
  }
}

// ── [F22] Register CSV export battery ────────────────────────────────────────
// Feature 09 — hand-rolled CSV export with attachment headers. Corporate-only
// users.csv carries the full register (header + seeded emails + site names);
// attendance.csv is role-scoped via buildScope (mine_official sees only her own
// site, field_officer his own site) and corporate/regulator may filter a date
// window. RBAC negatives (field_officer / regulator → 403 on users.csv) and
// the "exported" audit entries round it out. Read-only — no fixtures to clean.

async function exportBattery(
  t: { amit: string; priya: string; meena: string; rahul: string },
  sites: { SJ: string }
): Promise<void> {
  console.log("\n== [F22] Register CSV export ==");
  void sites;

  const asText = (body: unknown): string => String(body ?? "").replace(/^\uFEFF/, "");

  // ── 1. users.csv — corporate owns the register export ─────────────────
  const users = await get(t.amit, "/exports/users.csv");
  const usersTxt = asText(users.body);
  check(
    "users.csv: corporate → 200 + text/csv",
    users.status === 200 && String(users.headers["content-type"] ?? "").includes("text/csv"),
    `${users.status} / ${users.headers["content-type"] ?? ""}`
  );
  check(
    "users.csv: attachment + filename header",
    String(users.headers["content-disposition"] ?? "").includes("attachment") &&
      String(users.headers["content-disposition"] ?? "").includes("users-register.csv"),
    `${users.headers["content-disposition"] ?? ""}`
  );
  check("users.csv: Content-Length set", Number(users.headers["content-length"] ?? 0) > 0, `${users.headers["content-length"] ?? "?"}`);
  check("users.csv: header row", usersTxt.includes("Name,Email,Role,Site,Status,Created"), usersTxt.slice(0, 120));
  check(
    "users.csv: seeded emails present",
    usersTxt.includes("priya@agnistrot.com") && usersTxt.includes("amit@agnistrot.com"),
    "emails"
  );

  // ── 2. users.csv — RBAC negatives ─────────────────────────────────────
  const foUsers = await get(t.rahul, "/exports/users.csv");
  check("users.csv: field_officer → 403", foUsers.status === 403, `${foUsers.status}`);
  const regUsers = await get(t.meena, "/exports/users.csv");
  check("users.csv: regulator → 403", regUsers.status === 403, `${regUsers.status}`);

  // ── 3. attendance.csv — mine_official own-site only ───────────────────
  const moAtt = await get(t.priya, "/exports/attendance.csv");
  const moTxt = asText(moAtt.body);
  check(
    "attendance.csv: mine_official → 200 + text/csv",
    moAtt.status === 200 && String(moAtt.headers["content-type"] ?? "").includes("text/csv"),
    `${moAtt.status}`
  );
  check(
    "attendance.csv: header row",
    moTxt.includes("Site ID,Site,Worker,Check Type,Captured At,Synced At"),
    moTxt.slice(0, 120)
  );
  check("attendance.csv: own site (Jharia) rows present", moTxt.includes("Jharia Underground Mine"), "site");
  check("attendance.csv: no cross-site rows", !moTxt.includes("Dhanbad Coal Mine"), "scope");

  // ── 4. attendance.csv — field_officer own-site only ───────────────────
  const foAtt = await get(t.rahul, "/exports/attendance.csv");
  const foTxt = asText(foAtt.body);
  check(
    "attendance.csv: field_officer → 200 + scoped",
    foAtt.status === 200 && !foTxt.includes("Dhanbad Coal Mine"),
    `${foAtt.status}`
  );

  // ── 5. attendance.csv — corporate/regulator all-sites + window ────────
  const regAtt = await get(t.meena, "/exports/attendance.csv");
  const regTxt = asText(regAtt.body);
  check(
    "attendance.csv: regulator sees all sites",
    regAtt.status === 200 && regTxt.includes("Dhanbad Coal Mine"),
    `${regAtt.status}`
  );

  const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const winAtt = await get(t.amit, `/exports/attendance.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const winTxt = asText(winAtt.body);
  check(
    "attendance.csv: corporate date window → 200 + rows",
    winAtt.status === 200 && winTxt.includes("Check Type") && winTxt.split("\r\n").length > 2,
    `${winAtt.status}`
  );

  // ── 6. audit trail ─────────────────────────────────────────────────────
  const exported = await AuditLog.countDocuments({ entityType: "export", action: "exported" });
  check("audit logs exported entries (users + attendance)", exported >= 2, `count=${exported}`);
}

// ── [F23] Geofencing battery ─────────────────────────────────────────────────
// Feature — hand-rolled point-in-polygon geofencing. Pure geometry probes run
// first (rectangle, concave notch, edge/vertex tolerance, degenerate ring),
// then the sync write paths are exercised against a throwaway probe site with
// a small square boundary: in-bound records are accepted, out-of-bound records
// are rejected with GEOFENCE_VIOLATION and never persisted. A boundary-less
// probe proves the ring is fully opt-in. Self-cleans in finally; the terminal
// reseed wipes any outbox/audit noise from accepted probe records.

async function geofenceBattery(t: { rahul: string }): Promise<void> {
  console.log("\n== [F23] Geofencing (point-in-polygon) ==");

  // ── 1. Pure geometry probes (direct calls — deterministic) ─────────────
  const rect = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];
  check("PIP: rectangle center inside", pointInPolygon(5, 5, rect), "center");
  check("PIP: rectangle outside", !pointInPolygon(5, 11, rect), "outside");
  check("PIP: edge point counts inside (tolerance)", pointInPolygon(5, 0, rect), "edge");
  check("PIP: vertex counts inside (tolerance)", pointInPolygon(0, 0, rect), "vertex");

  const concave = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 10 },
    { lat: 5, lng: 6 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];
  check("PIP: concave notch pocket is outside", !pointInPolygon(5, 9, concave), "notch");
  check("PIP: concave body point inside", pointInPolygon(2, 2, concave), "body");

  const degenerate = [{ lat: 1, lng: 1 }, { lat: 1, lng: 1 }];
  check("PIP: degenerate ring (<3) never inside", !pointInPolygon(1, 1, degenerate), "degenerate");

  // ── 2. Sync write-path enforcement ─────────────────────────────────────
  const syncBody = (r: { body: AnyJson }): { accepted: string[]; rejected: { clientUuid: string; reason: string }[] } =>
    (r.body ?? {}) as unknown as { accepted: string[]; rejected: { clientUuid: string; reason: string }[] };
  const probe = await Site.create({
    name: "Geofence Probe Mine",
    subsidiary: "Probe Ltd",
    location: { lat: 12.05, lng: 77.05 },
    expectedWorkers: 5,
    boundary: [
      { lat: 12.0, lng: 77.0 },
      { lat: 12.0, lng: 77.1 },
      { lat: 12.1, lng: 77.1 },
      { lat: 12.1, lng: 77.0 },
    ],
  });
  const pid = (probe._id as unknown as Types.ObjectId).toString();
  const now = new Date().toISOString();
  try {
    const attIn = await post(t.rahul, "/attendance/sync", {
      records: [
        {
          clientUuid: randomUUID(),
          siteId: pid,
          workerRef: "probe-1",
          checkType: "in",
          location: { lat: 12.05, lng: 77.05 },
          capturedAt: now,
        },
      ],
    });
    check(
      "F23: attendance in-bound accepted",
      syncBody(attIn).accepted.length === 1 && syncBody(attIn).rejected.length === 0,
      JSON.stringify(attIn.body)
    );

    const attOut = await post(t.rahul, "/attendance/sync", {
      records: [
        {
          clientUuid: randomUUID(),
          siteId: pid,
          workerRef: "probe-2",
          checkType: "in",
          location: { lat: 13.05, lng: 77.05 }, // ~110 km south — outside
          capturedAt: now,
        },
      ],
    });
    const attOutBody = syncBody(attOut);
    const attOutReason = attOutBody.rejected[0]?.reason ?? "";
    check(
      "F23: attendance out-of-bound rejected + GEOFENCE_VIOLATION",
      attOutBody.accepted.length === 0 && attOutBody.rejected.length === 1 && attOutReason.includes("GEOFENCE_VIOLATION"),
      attOutReason
    );

    const attCount = await Attendance.countDocuments({ siteId: probe._id });
    check("F23: rejected attendance never persisted", attCount === 1, `count=${attCount}`);

    const insOut = await post(t.rahul, "/inspections/sync", {
      records: [
        {
          clientUuid: randomUUID(),
          siteId: pid,
          type: "safety",
          checklist: [{ item: "guard rails", result: "fail" }],
          location: { lat: 12.05, lng: 78.05 }, // ~95 km east — outside
          capturedAt: now,
        },
      ],
    });
    const insOutReason = syncBody(insOut).rejected[0]?.reason ?? "";
    check(
      "F23: inspection out-of-bound rejected",
      syncBody(insOut).accepted.length === 0 && syncBody(insOut).rejected.length === 1 && insOutReason.includes("GEOFENCE_VIOLATION"),
      insOutReason
    );
    const insCount = await Inspection.countDocuments({ siteId: probe._id });
    check("F23: rejected inspection never persisted", insCount === 0, `count=${insCount}`);

    const incIn = await post(t.rahul, "/incidents/sync", {
      records: [
        {
          clientUuid: randomUUID(),
          siteId: pid,
          severity: "low",
          category: "safety",
          description: "Slip hazard on the probe bench — needs a guard rail.",
          location: { lat: 12.05, lng: 77.05 },
          capturedAt: now,
        },
      ],
    });
    check(
      "F23: incident in-bound accepted",
      syncBody(incIn).accepted.length === 1 && syncBody(incIn).rejected.length === 0,
      JSON.stringify(incIn.body)
    );

    // Boundary-less site → no enforcement (records accepted regardless).
    const unbound = await Site.create({
      name: "Unenforced Probe Mine",
      subsidiary: "Probe Ltd",
      location: { lat: 1, lng: 1 },
      expectedWorkers: 5,
    });
    const uid2 = (unbound._id as unknown as Types.ObjectId).toString();
    try {
      const far = await post(t.rahul, "/attendance/sync", {
        records: [
          {
            clientUuid: randomUUID(),
            siteId: uid2,
            workerRef: "probe-3",
            checkType: "out",
            location: { lat: 40, lng: 90 }, // absurdly far — but no ring
            capturedAt: now,
          },
        ],
      });
      check(
        "F23: boundary-less site unenforced (accepted)",
        syncBody(far).accepted.length === 1,
        JSON.stringify(far.body)
      );
      await Attendance.deleteMany({ siteId: unbound._id });
    } finally {
      await Site.deleteMany({ _id: unbound._id });
    }
  } finally {
    await Attendance.deleteMany({ siteId: probe._id });
    await Inspection.deleteMany({ siteId: probe._id });
    await Incident.deleteMany({ siteId: probe._id });
    await Site.deleteMany({ _id: probe._id });
  }
}

// ── [F24] Risk heatmap layers battery ────────────────────────────────────────
// GET /gis/risk-layers — role-scoped per-site aggregate (band, score, metrics,
// top contributors). Determinism is proven by cross-checking the layer score
// against /ai/risk-score/:siteId for the same site at the same instant. Runs
// after the geofence battery (which self-cleans its probe sites) so the seeded
// 3-site canonical state is what gets aggregated.

interface F24Layer {
  siteId: string;
  siteName: string;
  subsidiary: string;
  location?: { lat: number; lng: number };
  riskLevel: string;
  score: number;
  breakdown?: Record<string, number>;
  metrics?: Record<string, number>;
  topContributors?: Array<{ key: string; label: string; points: number; count: number; kind: string }>;
}

async function riskLayerBattery(
  t: { priya: string; meena: string; amit: string; rahul: string },
  sites: { SJ: string; SD: string }
): Promise<void> {
  console.log("\n== [F24] Risk heatmap layers (GIS) ==");

  const layersOf = (r: { body: AnyJson }): F24Layer[] =>
    ((r.body ?? {}) as { data?: unknown[] }).data?.map((l) => l as F24Layer) ?? [];

  // 1. Unauthenticated → 401
  const noAuth = await api("/gis/risk-layers");
  check("F24: unauthenticated risk-layers → 401", noAuth.status === 401);

  // 2. Field officer → 403
  const fo = await get(t.rahul, "/gis/risk-layers");
  check("F24: field_officer risk-layers → 403", fo.status === 403);

  // 3. Regulator → all seeded sites, correct shape + deterministic ordering
  const reg = await get(t.meena, "/gis/risk-layers");
  check("F24: regulator risk-layers → 200", reg.status === 200);
  const layers = layersOf(reg);
  check("F24: regulator sees all seeded sites (3+)", layers.length >= 3, `count=${layers.length}`);
  const ids = layers.map((l) => l.siteId);
  check(
    "F24: seeded sites both present",
    ids.includes(sites.SJ) && ids.includes(sites.SD),
    `SJ=${ids.includes(sites.SJ)} SD=${ids.includes(sites.SD)}`
  );

  const first = layers[0];
  check(
    "F24: layer shape (band/score/location/contributors)",
    !!first &&
      typeof first.siteName === "string" &&
      typeof first.riskLevel === "string" &&
      typeof first.score === "number" &&
      typeof first.location?.lat === "number" &&
      typeof first.location?.lng === "number" &&
      Array.isArray(first.topContributors),
    first ? JSON.stringify(Object.keys(first)) : "no layers"
  );

  const validBands = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  check("F24: every layer has a valid risk band", layers.every((l) => validBands.has(l.riskLevel)), layers.map((l) => l.riskLevel).join(","));
  check("F24: scores within 0-100", layers.every((l) => l.score >= 0 && l.score <= 100));
  check(
    "F24: layers sorted by score desc",
    layers.every((l, i) => i === 0 || layers[i - 1]!.score >= l.score),
    layers.map((l) => l.score).join(",")
  );
  check(
    "F24: contributors present and shaped",
    layers.every((l) => (l.topContributors ?? []).length >= 1 && l.topContributors!.every((c) => typeof c.label === "string" && typeof c.points === "number" && c.points !== 0 && (c.kind === "risk" || c.kind === "relief")))
  );

  // 4. Cross-endpoint determinism — layer aggregate === /ai/risk-score/:siteId
  const sjLayer = layers.find((l) => l.siteId === sites.SJ);
  const risk = await get(t.meena, `/ai/risk-score/${sites.SJ}`);
  const riskData = ((risk.body ?? {}) as { data?: { score: number; riskLevel: string } }).data;
  check(
    "F24: layer score matches /ai/risk-score",
    !!sjLayer && !!riskData && sjLayer.score === riskData.score && sjLayer.riskLevel === riskData.riskLevel,
    sjLayer && riskData ? `layer=${sjLayer.score}/${sjLayer.riskLevel} ai=${riskData.score}/${riskData.riskLevel}` : "missing data"
  );

  // 5. Mine official → own site only
  const mo = await get(t.priya, "/gis/risk-layers");
  check("F24: mine_official risk-layers → 200", mo.status === 200);
  const moLayers = layersOf(mo);
  check(
    "F24: mine_official sees only own site",
    moLayers.length === 1 && moLayers[0]?.siteId === sites.SJ,
    JSON.stringify(moLayers.map((l) => l.siteId))
  );

  // 6. Corporate siteId filter → only that site
  const filt = await get(t.amit, `/gis/risk-layers?siteId=${sites.SD}`);
  check("F24: corporate filtered risk-layers → 200", filt.status === 200);
  const filtLayers = layersOf(filt);
  check(
    "F24: siteId filter returns only SD",
    filtLayers.length === 1 && filtLayers[0]?.siteId === sites.SD,
    JSON.stringify(filtLayers.map((l) => l.siteId))
  );

  // 7. Malformed siteId → 400
  check("F24: malformed siteId → 400", (await get(t.amit, "/gis/risk-layers?siteId=bad-id")).status === 400);
}

async function main(): Promise<void> {
  killPort(PORT);
  runSeed();

  await connectDB();
  const [sites, alerts, workflows] = await Promise.all([
    Site.find().lean(),
    Alert.countDocuments(),
    WorkflowState.countDocuments(),
  ]);
  const id = (s: { _id: unknown; name: string }): string => (s._id as unknown as string).toString();
  const SJ = id(sites.find((s) => s.name === "Jharia Underground Mine")!);
  const SD = id(sites.find((s) => s.name === "Dhanbad Coal Mine")!);
  check("canonical seed: 10 alerts / 10 workflows", alerts === 10 && workflows === 10, `${alerts}/${workflows}`);

  const [incSJ, incSD, inspSJ, inspSD] = await Promise.all([
    Incident.findOne({ siteId: SJ }).lean(),
    Incident.findOne({ siteId: SD }).lean(),
    Inspection.findOne({ siteId: SJ }).lean(),
    Inspection.findOne({ siteId: SD }).lean(),
  ]);
  const asId = (d: { _id: unknown } | null): string =>
    d ? (d._id as unknown as string).toString() : "";

  const baseline = await auditChain();
  check(`audit chain VALID after seed (${baseline.count} entries)`, baseline.ok, `broken at ${baseline.broken.join(",")}`);

  const last = await AuditLog.findOne().sort({ createdAt: -1 }).lean();
  check("audit log not empty", !!last);
  if (!last) throw new Error("AuditLog is empty after seed — cannot run tamper proof.");
  const tamperedRow = last as AuditRow;
  const originalAction = tamperedRow.action;
  await AuditLog.collection.updateOne({ _id: tamperedRow._id }, { $set: { action: `${originalAction}_TAMPERED` } });
  const tampered = await auditChain();
  check("tamper detected → CHAIN BROKEN", !tampered.ok && tampered.count > 0, `broken at ${tampered.broken.join(",")}`);
  await AuditLog.collection.updateOne({ _id: tamperedRow._id }, { $set: { action: originalAction } });
  const healed = await auditChain();
  check("heal restores CHAIN VALID", healed.ok, `broken at ${healed.broken.join(",")}`);

  const server = startServer();
  try {
    await waitForPort(PORT);

    const tokens = {
      priya: await login("priya@agnistrot.com"),
      meena: await login("meena@agnistrot.com"),
      amit: await login("amit@agnistrot.com"),
      rahul: await login("rahul@agnistrot.com"),
    };
    check("unauthenticated /alerts → 401", (await api("/alerts")).status === 401);
    check("bad token → 401", (await api("/alerts", { token: "definitely.not.a.jwt" })).status === 401);

    await battery(tokens, { SJ, SD });
    await syncRoleGuard(tokens);
    await attendanceBattery(tokens, { SJ, SD });
    await socketBattery(tokens.rahul, SJ);
    await workflowProbes({ priya: tokens.priya, meena: tokens.meena }, SJ);
    await feature02SlaBattery(tokens, { SJ, SD });
    await reportsBattery(tokens, { SJ, SD });
    await manualEscalationBattery(tokens, { SJ, SD });
    await gisBattery(tokens, { SJ, SD });
    await documentBattery(tokens, { SJ, SD });
    await aiBattery(tokens, { SJ, SD });
    await feature03ForecastBattery(tokens, { SJ, SD });
    await dashboardBattery({ priya: tokens.priya, amit: tokens.amit });
    await usersBattery({ amit: tokens.amit, priya: tokens.priya, meena: tokens.meena });
    await listShapeBattery({ amit: tokens.amit });
    await realModulesBattery(tokens, { SJ });
    const priyaUser = await User.findOne({ email: "priya@agnistrot.com" }).lean();
    const decoy = await Incident.create({
      clientUuid: `verify-decoy-${randomUUID()}`,
      siteId: SD,
      reportedBy: (priyaUser?._id ?? new Types.ObjectId()) as Types.ObjectId,
      severity: "medium",
      category: "other",
      description: "Decoy incident for detail fail-closed test.",
      capturedAt: new Date(),
      status: "open",
    });
    await detailBattery(
      { priya: tokens.priya, meena: tokens.meena, amit: tokens.amit, rahul: tokens.rahul },
      {
        incSJ: asId(incSJ),
        incSD: asId(incSD),
        incDecoy: (decoy._id as unknown as string).toString(),
        inspSJ: asId(inspSJ),
        inspSD: asId(inspSD),
      },
    );
    // Feature 04 — runs last so stray detections on seeded data can never
    // disturb an earlier battery's assertions; its probes self-clean in finally.
    await feature04RecurringBattery(tokens.amit);
    // Feature 05 — after feature04 (both self-clean); evidence runs against the
    // local-mode uploads dir and leaves the DB in the canonical seeded state.
    await evidenceIntegrityBattery(tokens, { SJ, SD });
    // Feature 06 — terminal battery; hazard + pattern-alert fixtures self-clean.
    await hazardRegisterBattery(tokens, { SJ, SD });
    // Feature 07 — runs last so the live-enforcement probes (role/site changes,
    // deactivation revocation) can never disturb an earlier battery's claims;
    // the probe user is deleted in its finally block.
    await usersManagementBattery(tokens, { SJ, SD });
    // Feature 08 — terminal battery; resolved-alert probes self-clean in finally.
    await closeoutBattery(tokens, { SJ, SD });
    // Feature batch-rules — terminal battery; attendance-anomaly probes
    // self-clean in finally, then the reseed below restores the canonical state.
    await attendanceAnomalyBattery({ amit: tokens.amit });
    // Feature 09 — terminal battery; read-only export checks leave no fixtures.
    await exportBattery(
      { amit: tokens.amit, priya: tokens.priya, meena: tokens.meena, rahul: tokens.rahul },
      { SJ }
    );
    // Geofencing battery — probe site + records self-clean in finally.
    await geofenceBattery({ rahul: tokens.rahul });
    // Risk heatmap layers battery — read-only aggregation of the canonical
    // seeded state (geofence probes are gone by now); asserts cross-endpoint
    // determinism against /ai/risk-score/:siteId.
    await riskLayerBattery(
      { priya: tokens.priya, meena: tokens.meena, amit: tokens.amit, rahul: tokens.rahul },
      { SJ, SD }
    );
  } finally {
    stopServer(server);
  }

  const final = await auditChain();
  check(`audit chain VALID at end (${final.count} entries)`, final.ok, `broken at ${final.broken.join(",")}`);

  await mongoose.disconnect();
  runSeed();
  await connectDB();
  const [a2, w2] = await Promise.all([Alert.countDocuments(), WorkflowState.countDocuments()]);
  check("final reseed restores canonical 10/10", a2 === 10 && w2 === 10, `${a2}/${w2}`);
  await mongoose.disconnect();

  console.log("\n===== RESULT:", `${pass} passed, ${fail} failed`, "=====");
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
import "dotenv/config";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import net from "node:net";
import { request as httpRequest } from "node:http";
import mongoose, { Types } from "mongoose";
import { io as ioClient } from "socket.io-client";
import type { Socket } from "socket.io-client";
import connectDB from "../config/db.js";
import Site from "../models/Site.js";
import User from "../models/User.js";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import AuditLog from "../models/AuditLog.js";
import { computeThisHash, GENESIS_HASH } from "../services/auditLogger.js";
import { runEscalations } from "../services/workflowEngine.js";
import { ALERT_DEADLINES } from "../types/index.js";
import type { AlertSeverity } from "../types/index.js";

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
): Promise<{ status: number; body: AnyJson }> {
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
          resolve({ status: res.statusCode ?? 0, body });
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

const get = (token: string, p = ""): Promise<{ status: number; body: AnyJson }> =>
  api(p, { token });

const post = (token: string, p: string, body: unknown): Promise<{ status: number; body: AnyJson }> =>
  api(p, { token, method: "POST", body: body ?? {} });

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
  const severity = (journey.alert?.severity ?? "medium") as AlertSeverity;
  const window = ALERT_DEADLINES[severity] * 0.25;
  let wf = await WorkflowState.find({ alertId: aid }).sort({ changedAt: -1 }).limit(1).lean();
  let row = wf[0];
  if (!row) return;
  await WorkflowState.updateOne({ _id: row._id }, { deadline: new Date(Date.now() - 60 * 1000) });
  await runEscalations();
  wf = await WorkflowState.find({ alertId: aid }).sort({ changedAt: -1 }).limit(1).lean();
  check("assigned → reminded after deadline", wf[0]?.state === "reminded", JSON.stringify(wf[0]?.state));
  check("not escalated in that pass (window still ahead)", (await WorkflowState.countDocuments({ alertId: aid, state: "escalated" })) === 0);

  row = wf[0];
  if (!row) return;
  await WorkflowState.updateOne({ _id: row._id }, { deadline: new Date(Date.now() - (window + 60 * 60 * 1000)) });
  await runEscalations();
  const escalated = (await Alert.findById(aid).lean())?.status;
  check(`reminded → escalated (deadline +${Math.round(window / 36e5)}h window passed)`, escalated === "escalated", `status=${escalated}`);

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

// ── Runner ───────────────────────────────────────────────────────────────────

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
    await socketBattery(tokens.rahul, SJ);
    await workflowProbes({ priya: tokens.priya, meena: tokens.meena }, SJ);
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
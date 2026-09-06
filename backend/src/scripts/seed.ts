import "dotenv/config";
import mongoose from "mongoose";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Site from "../models/Site.js";
import User from "../models/User.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import Attendance from "../models/Attendance.js";
import Alert from "../models/Alert.js";
import WorkflowState from "../models/WorkflowState.js";
import { evaluateRules } from "../services/ruleEngine.js";
import { runBatchRules } from "../services/batchRules.js";
import { runEscalations } from "../services/workflowEngine.js";
import { ensureAlertIndexes } from "../config/db.js";
import type { InspectionType } from "../types/index.js";

// ── Seed Data ────────────────────────────────────────────────────────────────

const SITES = [
  {
    name: "Jharia Underground Mine",
    subsidiary: "Bharat Coking Coal Ltd",
    location: { lat: 23.7461, lng: 86.4123 },
    expectedWorkers: 50,
  },
  {
    name: "Rajpur Opencast Mine",
    subsidiary: "Northern Coalfields Ltd",
    location: { lat: 24.1845, lng: 82.6774 },
    expectedWorkers: 45,
  },
  {
    name: "Dhanbad Coal Mine",
    subsidiary: "Central Coalfields Ltd",
    location: { lat: 23.7957, lng: 86.4304 },
    expectedWorkers: 60,
  },
];

const USERS = [
  {
    name: "Rahul Kumar",
    email: "rahul@agnistrot.com",
    password: "password123",
    role: "field_officer" as const,
    siteIndex: 0, // Jharia
  },
  {
    name: "Priya Singh",
    email: "priya@agnistrot.com",
    password: "password123",
    role: "mine_official" as const,
    siteIndex: 0, // Jharia
  },
  {
    name: "Amit Sharma",
    email: "amit@agnistrot.com",
    password: "password123",
    role: "corporate_manager" as const,
    siteIndex: null, // cross-site
  },
  {
    name: "Dr. Meena Reddy",
    email: "meena@agnistrot.com",
    password: "password123",
    role: "regulator" as const,
    siteIndex: null, // read-only
  },
  {
    name: "Kavita Verma",
    email: "kavita@agnistrot.com",
    password: "password123",
    role: "mine_official" as const,
    siteIndex: 1, // Rajpur — needed so batch alerts get a site-level assignee
  },
  {
    name: "Ramesh Nair",
    email: "ramesh@agnistrot.com",
    password: "password123",
    role: "mine_official" as const,
    siteIndex: 2, // Dhanbad
  },
];

// ── Helper: random date within last N days ──────────────────────────────────

const randomDate = (daysAgo: number): Date => {
  const now = Date.now();
  const offset = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
};

// ── Helper: exact date N days in the past (deterministic) ───────────────────

const daysAgo = (days: number): Date =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// ── Helper: pick random item from array ─────────────────────────────────────

const pick = <T>(arr: T[]): T => {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (!item) throw new Error("pick() called on empty array");
  return item;
};

// ── Seed Function ───────────────────────────────────────────────────────────

const seed = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB for seeding.");

  // The {sourceId, ruleCode} unique index was originally shipped WITHOUT sparse;
  // a previous seed's collisions were caused by that stale copy. Self-heal it.
  await ensureAlertIndexes();

  // ── Clear existing data ──────────────────────────────────────────────────
  await Site.deleteMany({});
  await User.deleteMany({});
  await Inspection.deleteMany({});
  await Incident.deleteMany({});
  await Attendance.deleteMany({});
  await Alert.deleteMany({});
  await WorkflowState.deleteMany({});
  console.log("Cleared existing data (including alerts & workflows).");

  // ── Create Sites ─────────────────────────────────────────────────────────
  const sites = await Site.insertMany(SITES);
  const [jharia, rajpur, dhanbad] = sites;
  if (!jharia || !rajpur || !dhanbad) throw new Error("Expected 3 sites");
  console.log(`Created ${sites.length} sites.`);

  // ── Create Users ─────────────────────────────────────────────────────────
  // Pass the plain password as `passwordHash` — the User pre-save hook
  // will hash it automatically. Do NOT pre-hash here or it will be double-hashed.
  const users = await Promise.all(
    USERS.map((u) =>
      User.create({
        name: u.name,
        email: u.email,
        passwordHash: "password123", // pre-save hook hashes this
        role: u.role,
        // ?._id returns ObjectId | undefined; ?? null converts undefined → null
        // satisfying exactOptionalPropertyTypes (undefined ≠ null in strict TS)
        siteId: u.siteIndex !== null ? (sites[u.siteIndex]?._id ?? null) : null,
      })
    )
  );
  console.log(`Created ${users.length} users.`);

  // ── Create Inspections ───────────────────────────────────────────────────
  // DETERMINISTIC: explicit site + capturedAt per inspection so the batch
  // rules fire exactly where the demo expects them (planned lapses → OVERDUE,
  // 3x Jharia safety failures → REPEAT_VIOLATION).
  const fieldOfficers = users.filter((u) => u.role === "field_officer");
  const rahul = fieldOfficers[0];
  if (!rahul) throw new Error("Expected at least 1 field officer");

  const safetyChecklists = [
    [
      { item: "Fire extinguisher present and charged", result: "pass" as const },
      { item: "Emergency exit signs visible", result: "pass" as const },
      { item: "Ventilation system operational", result: "fail" as const, notes: "Fan bearing noisy" },
      { item: "Gas detector calibrated", result: "pass" as const },
    ],
    [
      { item: "Safety barricades intact", result: "fail" as const, notes: "Barricade damaged near shaft" },
      { item: "PPE available for all workers", result: "pass" as const },
      { item: "First aid kit stocked", result: "pass" as const },
    ],
    [
      { item: "Roof bolting pattern correct", result: "pass" as const },
      { item: "Roof bolts inspected", result: "pass" as const },
      { item: "Crack monitoring up to date", result: "pass" as const },
      { item: "Water drainage functioning", result: "fail" as const, notes: "Blockage in main drain" },
      { item: "Electrical safety check", result: "na" as const },
    ],
    [
      { item: "Methane levels within limits", result: "pass" as const },
      { item: "Dust suppression active", result: "pass" as const },
      { item: "Explosive storage secure", result: "pass" as const },
    ],
    [
      { item: "Roof support conditions", result: "fail" as const, notes: "Several broken props" },
      { item: "Roadway clearance adequate", result: "pass" as const },
      { item: "Lighting conditions", result: "pass" as const },
    ],
  ];

  const otherChecklists = [
    [
      { item: "Water discharge within limits", result: "pass" as const },
      { item: "Dust levels acceptable", result: "pass" as const },
      { item: "Rehabilitation progress on track", result: "pass" as const },
    ],
    [
      { item: "Production targets met", result: "pass" as const },
      { item: "Equipment downtime logged", result: "pass" as const },
      { item: "Output per shift recorded", result: "pass" as const },
    ],
    [
      { item: "Worker attendance verified", result: "pass" as const },
      { item: "Shift handover documented", result: "pass" as const },
      { item: "Safety induction completed", result: "pass" as const },
    ],
  ];

  const inspection = (
    siteId: Types.ObjectId,
    type: InspectionType,
    checklist: Array<{ item: string; result: "pass" | "fail" | "na"; notes?: string }>,
    capturedAt: Date
  ) => ({
    clientUuid: uuidv4(),
    siteId,
    inspectorId: rahul._id,
    type,
    checklist,
    location: { lat: 23.7 + Math.random() * 0.5, lng: 86.4 + Math.random() * 0.5 },
    photoUrls: [],
    capturedAt,
  });

  // Interval note: production=1d, safety=7d, environmental=14d, labour=30d.
  const inspectionData = [
    // ── Jharia: 3 safety checks with failures → REPEAT_VIOLATION (3 alerts) ──
    inspection(jharia._id, "safety", safetyChecklists[4]!, daysAgo(5)),
    inspection(jharia._id, "safety", safetyChecklists[0]!, daysAgo(3)),
    inspection(jharia._id, "safety", safetyChecklists[1]!, daysAgo(1)),
    // Jharia non-safety all within interval → no OVERDUE
    inspection(jharia._id, "environmental", otherChecklists[0]!, daysAgo(6)),
    inspection(jharia._id, "production", otherChecklists[1]!, new Date(Date.now() - 12 * 60 * 60 * 1000)),
    inspection(jharia._id, "labour", otherChecklists[2]!, daysAgo(10)),
    // ── Rajpur: safety fail (1 alert) + environmental lapsed 20d → OVERDUE ──
    inspection(rajpur._id, "safety", safetyChecklists[1]!, daysAgo(2)),
    inspection(rajpur._id, "environmental", otherChecklists[0]!, daysAgo(20)),
    inspection(rajpur._id, "production", otherChecklists[1]!, new Date(Date.now() - 12 * 60 * 60 * 1000)),
    inspection(rajpur._id, "labour", otherChecklists[2]!, daysAgo(5)),
    // ── Dhanbad: production lapsed 2d + safety lapsed 10d → 2× OVERDUE ─────
    inspection(dhanbad._id, "safety", safetyChecklists[3]!, daysAgo(10)), // all-pass → no sync alert
    inspection(dhanbad._id, "production", otherChecklists[1]!, daysAgo(2)),
    inspection(dhanbad._id, "environmental", otherChecklists[0]!, daysAgo(7)),
    inspection(dhanbad._id, "labour", otherChecklists[2]!, daysAgo(25)),
  ];

  const inspections = await Inspection.insertMany(inspectionData);
  console.log(`Created ${inspections.length} inspections.`);

  // ── Create Incidents ─────────────────────────────────────────────────────
  // Mix of severities to trigger CRITICAL_INCIDENT rule for critical ones
  const incidentData = [
    {
      clientUuid: uuidv4(),
      siteId: jharia._id,
      reportedBy: rahul._id,
      severity: "critical" as const,
      category: "safety" as const,
      description: "Roof fall in active working area — two workers trapped temporarily, rescued with minor injuries.",
      location: { lat: 23.7461, lng: 86.4123 },
      photoUrls: [],
      capturedAt: randomDate(7),
      status: "open" as const,
    },
    {
      clientUuid: uuidv4(),
      siteId: jharia._id,
      reportedBy: rahul._id,
      severity: "high" as const,
      category: "equipment" as const,
      description: "Conveyor belt malfunction causing production stoppage in north panel.",
      location: { lat: 23.748, lng: 86.415 },
      photoUrls: [],
      capturedAt: randomDate(7),
      status: "investigating" as const,
    },
    {
      clientUuid: uuidv4(),
      siteId: rajpur._id,
      reportedBy: rahul._id,
      severity: "high" as const,
      category: "safety" as const,
      description: "Blasting zone perimeter breached — unauthorized personnel found within danger zone.",
      location: { lat: 24.1845, lng: 82.6774 },
      photoUrls: [],
      capturedAt: randomDate(5),
      status: "open" as const,
    },
    {
      clientUuid: uuidv4(),
      siteId: rajpur._id,
      reportedBy: rahul._id,
      severity: "medium" as const,
      category: "environmental" as const,
      description: "Dust levels exceeding permissible limits near crushing plant.",
      location: { lat: 24.186, lng: 82.679 },
      photoUrls: [],
      capturedAt: randomDate(5),
      status: "open" as const,
    },
    {
      clientUuid: uuidv4(),
      siteId: dhanbad._id,
      reportedBy: rahul._id,
      severity: "medium" as const,
      category: "equipment" as const,
      description: "Hydraulic sh-support showing pressure drop in panel 3.",
      location: { lat: 23.7957, lng: 86.4304 },
      photoUrls: [],
      capturedAt: randomDate(3),
      status: "open" as const,
    },
    {
      clientUuid: uuidv4(),
      siteId: jharia._id,
      reportedBy: rahul._id,
      severity: "medium" as const,
      category: "safety" as const,
      description: "Minor spillage of diesel near equipment bay — cleaned immediately.",
      location: { lat: 23.75, lng: 86.42 },
      photoUrls: [],
      capturedAt: randomDate(3),
      status: "resolved" as const,
    },
    {
      clientUuid: uuidv4(),
      siteId: dhanbad._id,
      reportedBy: rahul._id,
      severity: "low" as const,
      category: "other" as const,
      description: "Missing signage at secondary access road.",
      location: { lat: 23.797, lng: 86.432 },
      photoUrls: [],
      capturedAt: randomDate(2),
      status: "open" as const,
    },
    {
      clientUuid: uuidv4(),
      siteId: rajpur._id,
      reportedBy: rahul._id,
      severity: "low" as const,
      category: "environmental" as const,
      description: "Slight discoloration in nearby stream — sampling initiated.",
      location: { lat: 24.185, lng: 82.678 },
      photoUrls: [],
      capturedAt: randomDate(1),
      status: "open" as const,
    },
  ];

  const incidents = await Incident.insertMany(incidentData);
  console.log(`Created ${incidents.length} incidents.`);

  // ── Fire rule engine on seeded records ───────────────────────────────────
  // This populates Alert + WorkflowState so the dashboard shows real data.
  for (const doc of inspections) {
    try {
      await evaluateRules("inspection", doc._id, doc.siteId, doc);
    } catch (err) {
      console.error(`Rule engine error for inspection ${doc._id.toString()}:`, err);
    }
  }
  for (const doc of incidents) {
    try {
      await evaluateRules("incident", doc._id, doc.siteId, doc);
    } catch (err) {
      console.error(`Rule engine error for incident ${doc._id.toString()}:`, err);
    }
  }
  const syncAlertCount = await Alert.countDocuments();
  const workflowCount = await WorkflowState.countDocuments();
  console.log(`Sync rules produced ${syncAlertCount} alerts and ${workflowCount} workflow states.`);

  // ── Create Attendance Records ────────────────────────────────────────────
  // DETERMINISTIC: Rajpur's today's check-ins are ~49% below its 14-day
  // average (→ ATTENDANCE_ANOMALY). Jharia stays stable (±30%). Dhanbad has
  // only today's data — no 14-day baseline, so the rule skips it.
  const workerNames = [
    "Suresh Yadav", "Ramesh Verma", "Sanjay Gupta", "Manoj Kumar",
    "Deepak Singh", "Vikram Patel", "Rajesh Das", "Pankaj Mahto",
    "Sunil Oraon", "Ajay Lakra", "Nitin Jha", "Vishal Rana",
    "Arun Kisku", "Ravi Tudu", "Manish Soren",
  ];

  const attendanceData: Array<{
    clientUuid: string;
    siteId: Types.ObjectId;
    workerRef: string;
    checkType: "in" | "out";
    location: { lat: number; lng: number };
    capturedAt: Date;
  }> = [];

  // One shared timestamp per day → Attendance.distinct counts distinct DAYS
  // (the daily-average divisor), not individual records.
  const pushDay = (
    site: { _id: Types.ObjectId; location: { lat: number; lng: number } },
    dayOffset: number,
    hour: number,
    count: number,
    checkType: "in" | "out"
  ): void => {
    const base = new Date();
    base.setDate(base.getDate() - dayOffset);
    base.setHours(hour, 0, 0, 0);
    for (let j = 0; j < count; j++) {
      attendanceData.push({
        clientUuid: uuidv4(),
        siteId: site._id,
        workerRef: pick(workerNames),
        checkType,
        location: {
          lat: site.location.lat + Math.random() * 0.01,
          lng: site.location.lng + Math.random() * 0.01,
        },
        capturedAt: new Date(base),
      });
    }
  };

  // Rajpur: 11 working days × 35 in (~avg 35), today 18 in → 49% below
  for (let i = 1; i <= 11; i++) pushDay(rajpur, i, 7, 35, "in");
  pushDay(rajpur, 0, 7, 18, "in");
  pushDay(rajpur, 0, 9, 3, "out");
  // Jharia: 6 days × 40 + today 42 in → within ±30% (no alert)
  for (let i = 1; i <= 6; i++) pushDay(jharia, i, 7, 40, "in");
  pushDay(jharia, 0, 7, 42, "in");
  pushDay(jharia, 0, 9, 4, "out");
  // Dhanbad: today only (no baseline → rule skips)
  pushDay(dhanbad, 0, 7, 25, "in");
  pushDay(dhanbad, 0, 9, 2, "out");

  const attendance = await Attendance.insertMany(attendanceData);
  console.log(`Created ${attendance.length} attendance records.`);

  // ── Run batch rules + one escalation pass ────────────────────────────────
  // batchRules derives OVERDUE_INSPECTION, ATTENDANCE_ANOMALY and
  // REPEAT_VIOLATION alerts from the aggregate data (idempotent via ruleKey).
  // runEscalations is a no-op right after seed (all deadlines are in the
  // future) but proves the cron pipeline works end-to-end.
  await runBatchRules();
  await runEscalations();
  const finalAlerts = await Alert.countDocuments();
  const finalWorkflows = await WorkflowState.countDocuments();
  console.log(`After batch rules: ${finalAlerts} alerts, ${finalWorkflows} workflow states.`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n── Seed Complete ──────────────────────────────────────");
  console.log(`Sites:       ${sites.length}`);
  console.log(`Users:       ${users.length}`);
  console.log(`Inspections: ${inspections.length}`);
  console.log(`Incidents:   ${incidents.length}`);
  console.log(`Attendance:  ${attendance.length}`);
  console.log(`Alerts:      ${finalAlerts} (${finalAlerts - syncAlertCount} from batch rules)`);
  console.log("──────────────────────────────────────────────────────");
  console.log("\nDemo accounts:");
  console.log("  Field Officer:  rahul@agnistrot.com / password123");
  console.log("  Mine Official:  priya@agnistrot.com / password123");
  console.log("  Mine Official:  kavita@agnistrot.com / password123");
  console.log("  Mine Official:  ramesh@agnistrot.com / password123");
  console.log("  Corporate:      amit@agnistrot.com / password123");
  console.log("  Regulator:      meena@agnistrot.com / password123");
};

seed()
  .then(async () => {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  });
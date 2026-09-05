import "dotenv/config";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Site from "../models/Site.js";
import User from "../models/User.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import Attendance from "../models/Attendance.js";

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
];

// ── Helper: random date within last N days ──────────────────────────────────

const randomDate = (daysAgo: number): Date => {
  const now = Date.now();
  const offset = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
};

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

  // ── Clear existing data ──────────────────────────────────────────────────
  await Site.deleteMany({});
  await User.deleteMany({});
  await Inspection.deleteMany({});
  await Incident.deleteMany({});
  await Attendance.deleteMany({});
  console.log("Cleared existing data.");

  // ── Create Sites ─────────────────────────────────────────────────────────
  // Let TypeScript infer the return type — no explicit cast needed
  const sites = await Site.insertMany(SITES);
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
  const fieldOfficers = users.filter((u) => u.role === "field_officer");
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

  const inspectionData = [
    // 5 safety inspections (triggers SAFETY_CHECKLIST_FAIL for failed items)
    ...Array.from({ length: 5 }, (_, i) => ({
      clientUuid: uuidv4(),
      siteId: pick(sites)._id,
      inspectorId: pick(fieldOfficers)._id,
      type: "safety" as const,
      checklist: safetyChecklists[i % safetyChecklists.length],
      location: { lat: 23.7 + Math.random() * 0.5, lng: 86.4 + Math.random() * 0.5 },
      photoUrls: [],
      capturedAt: randomDate(14),
    })),
    // 3 environmental inspections
    ...Array.from({ length: 3 }, () => ({
      clientUuid: uuidv4(),
      siteId: pick(sites)._id,
      inspectorId: pick(fieldOfficers)._id,
      type: "environmental" as const,
      checklist: otherChecklists[0],
      location: { lat: 23.7 + Math.random() * 0.5, lng: 86.4 + Math.random() * 0.5 },
      photoUrls: [],
      capturedAt: randomDate(14),
    })),
    // 2 production inspections
    ...Array.from({ length: 2 }, () => ({
      clientUuid: uuidv4(),
      siteId: pick(sites)._id,
      inspectorId: pick(fieldOfficers)._id,
      type: "production" as const,
      checklist: otherChecklists[1],
      location: { lat: 23.7 + Math.random() * 0.5, lng: 86.4 + Math.random() * 0.5 },
      photoUrls: [],
      capturedAt: randomDate(14),
    })),
    // 2 labour inspections (1 with missing result → triggers MISSING_MANDATORY_FIELD)
    {
      clientUuid: uuidv4(),
      siteId: pick(sites)._id,
      inspectorId: pick(fieldOfficers)._id,
      type: "labour" as const,
      checklist: otherChecklists[2],
      location: { lat: 23.7 + Math.random() * 0.5, lng: 86.4 + Math.random() * 0.5 },
      photoUrls: [],
      capturedAt: randomDate(14),
    },
    {
      clientUuid: uuidv4(),
      siteId: pick(sites)._id,
      inspectorId: pick(fieldOfficers)._id,
      type: "labour" as const,
      checklist: [
        { item: "Worker safety training records", result: "pass" as const },
        { item: "Working hours compliance", result: "pass" as const },
        { item: "Wage disbursement records", result: "pass" as const },
      ],
      location: { lat: 23.7 + Math.random() * 0.5, lng: 86.4 + Math.random() * 0.5 },
      photoUrls: [],
      capturedAt: randomDate(14),
    },
  ];

  const inspections = await Inspection.insertMany(inspectionData);
  console.log(`Created ${inspections.length} inspections.`);

  // ── Create Incidents ─────────────────────────────────────────────────────
  // Mix of severities to trigger CRITICAL_INCIDENT rule for critical ones
  const [jharia, rajpur, dhanbad] = sites;
  const [rahul] = fieldOfficers;
  if (!jharia || !rajpur || !dhanbad) throw new Error("Expected 3 sites");
  if (!rahul) throw new Error("Expected at least 1 field officer");

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

  // ── Create Attendance Records ────────────────────────────────────────────
  const workerNames = [
    "Suresh Yadav", "Ramesh Verma", "Sanjay Gupta", "Manoj Kumar",
    "Deepak Singh", "Vikram Patel", "Rajesh Das", "Pankaj Mahto",
    "Sunil Oraon", "Ajay Lakra", "Nitin Jha", "Vishal Rana",
    "Arun Kisku", "Ravi Tudu", "Manish Soren",
  ];

  const attendanceData = Array.from({ length: 25 }, (_, i) => {
    const worker = workerNames[i % workerNames.length];
    const site = pick(sites);
    const isCheckOut = i % 3 === 0;
    const capturedAt = randomDate(3);
    // check-out should be after check-in on same day
    if (isCheckOut) {
      capturedAt.setHours(capturedAt.getHours() + 8);
    }

    return {
      clientUuid: uuidv4(),
      siteId: site._id,
      workerRef: worker,
      checkType: (isCheckOut ? "out" : "in") as "in" | "out",
      location: { lat: site.location.lat + Math.random() * 0.01, lng: site.location.lng + Math.random() * 0.01 },
      capturedAt,
    };
  });

  const attendance = await Attendance.insertMany(attendanceData);
  console.log(`Created ${attendance.length} attendance records.`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n── Seed Complete ──────────────────────────────────────");
  console.log(`Sites:       ${sites.length}`);
  console.log(`Users:       ${users.length}`);
  console.log(`Inspections: ${inspections.length}`);
  console.log(`Incidents:   ${incidents.length}`);
  console.log(`Attendance:  ${attendance.length}`);
  console.log("──────────────────────────────────────────────────────");
  console.log("\nDemo accounts:");
  console.log("  Field Officer:  rahul@agnistrot.com / password123");
  console.log("  Mine Official:  priya@agnistrot.com / password123");
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

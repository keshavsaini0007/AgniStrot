// ── Feature 04: Recurring Problem Detection ─────────────────────────────────
// Pattern-based hazard detection layered on top of the count-based
// REPEAT_VIOLATION batch rule. Instead of "the same rule fired N times", this
// detects the same CANONICAL hazard at the same ZONE, reported by DIFFERENT
// people across MULTIPLE days, and classifies the pattern scope.
//
// Edge cases handled (per the requirements doc):
//   A  REPEAT vs UNRESOLVED       → handled by the caller (batchRules): a still-
//      open pattern absorbs new reports in place; only a closed pattern spawns
//      a new generation. This module only reports the records that form it.
//   B  Near-duplicate category names ("Safety Barrier" | "Barricade Damage")
//      → canonical key via the alias table + normalization below.
//   C  GPS inaccuracies           → greedy radius clustering (~100 m), never
//      exact-coordinate matching.
//   D  uniqueReporters and totalReports tracked separately — 3/3 is stronger
//      evidence than 3/1, and 3/1 never qualifies as a pattern.
//   E  Scope classification       → localized / site-wide / category-wide.
//   F  Configurable lookback      → RECURRING_WINDOW_DAYS (default 30).
//   G  Dedup before detection     → runs after dedup by construction: the sync
//      layer upserts on clientUuid, so the collections read here are already
//      deduplicated (the F14 battery proves this with a duplicate probe).
//
// This module is pure DETECTION (reads only). Alert create/reinforce/write
// lives in batchRules.checkRecurringHazards — keeping this file free of
// batchRules imports avoids a circular dependency.

import { Types } from "mongoose";
import Site from "../models/Site.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import { departmentForSource } from "./ruleEngine.js";
import type { Department, RecurringHazardScope } from "../types/index.js";

// ── Config (env-overridable, edge case F) ────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function envNum(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const RECURRING_WINDOW_DAYS = envNum("RECURRING_WINDOW_DAYS", 30);
export const RECURRING_MIN_REPORTS = envNum("RECURRING_MIN_REPORTS", 3);
export const RECURRING_MIN_REPORTERS = envNum("RECURRING_MIN_REPORTERS", 2);
export const RECURRING_MIN_DATES = envNum("RECURRING_MIN_DATES", 2);
export const RECURRING_ZONE_RADIUS_M = envNum("RECURRING_ZONE_RADIUS_M", 100);

// ── Canonical category normalization (edge case B) ───────────────────────────
// Phrasing noise is stripped first (stop words + outcome adjectives such as
// "damaged" / "missing"), then the remaining core is matched against the alias
// table — the LONGEST matching alias wins. Unknown phrasing falls back to the
// normalized core itself, so identical wording still groups together.
//
// Extend this table as the hazard vocabulary grows; it is deliberately curated
// and deterministic — no ML, per project constraints.

export const HAZARD_CATEGORY_ALIASES: Record<string, string[]> = {
  SAFETY_BARRICADE: ["safety barricade", "safety barrier", "barricade", "barrier"],
  ROOF_SUPPORT: ["roof support", "roof bolt", "bolting", "crack monitoring", "broken prop", "roof"],
  VENTILATION: ["ventilation", "air flow", "airflow", "blower", "exhaust", "fan"],
  FIRE_SAFETY: ["fire extinguisher", "smoke detector", "hydrant", "flammable", "fire"],
  HOUSEKEEPING: ["housekeeping", "clutter", "debris", "spill", "obstruction", "blockage", "tripping hazard", "waste", "roadway clearance"],
  PERSONAL_PROTECTIVE_EQUIPMENT: ["ppe", "helmet", "hard hat", "goggles", "safety glasses", "gloves", "respirator", "ear protection", "ear plug", "safety shoe", "reflective vest", "harness"],
  ELECTRICAL: ["electrical", "wiring", "cable", "socket", "switch", "exposed wire", "short circuit"],
  DRAINAGE: ["drainage", "drain", "flood", "ground water", "water"],
  GAS_MONITORING: ["methane", "gas detector", "gas"],
  EXPLOSIVES: ["explosive", "blasting", "magazine"],
  LIGHTING: ["lighting", "illumination", "lamp", "street light"],
};

const STOP_WORDS = new Set([
  // articles / conjunctions / prepositions
  "a", "an", "and", "are", "as", "at", "be", "been", "by", "for", "from",
  "has", "have", "in", "is", "it", "of", "on", "or", "that", "the", "to",
  "was", "were", "with",
  // outcome adjectives — the FAIL result carries the signal; the phrasing is noise
  "adequate", "available", "correct", "functioning", "intact", "operational",
  "present", "secured", "secure", "stocked", "visible", "within", "date",
  // symptom framing
  "damaged", "damage", "broken", "missing", "failed", "failure", "fault",
  "faulty", "defective", "unsafe", "issue", "problem", "conditions",
  "condition", "system", "systems", "check", "checked", "verification",
  "verified",
]);

/** Lowercase → strip punctuation → drop stop words → collapse whitespace. */
function cleanPhrase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .join(" ");
}

/**
 * Map free-text (a checklist item or incident description) to a canonical
 * hazard category key. "Safety Barrier", "Barricade Damage" and "Damaged
 * Safety Barrier" all land on SAFETY_BARRICADE.
 */
export function normalizeHazardCategory(raw: string): string {
  const core = cleanPhrase(raw);
  if (!core) return "UNCATEGORIZED";

  // Longest matching alias across all categories wins (specificity beats order).
  let best: { category: string; alias: string } | null = null;
  for (const [category, aliases] of Object.entries(HAZARD_CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      if (core.includes(alias) && (!best || alias.length > best.alias.length)) {
        best = { category, alias };
      }
    }
  }
  if (best) return best.category;

  return core.toUpperCase().replace(/\s+/g, "_");
}

// ── Radius clustering (edge case C) ──────────────────────────────────────────
// Greedy centroid clustering within RECURRING_ZONE_RADIUS_M. Deterministic:
// records are processed oldest-first (capturedAt, then source id), so the same
// input always yields the same clusters — the alert ruleKey stays stable across
// batch passes. Two report points ~8 m apart merge; ~500 m apart split.

const EARTH_RADIUS_M = 6_371_000;
const deg2rad = (d: number): number => (d * Math.PI) / 180;

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function clusterRecords<T extends { lat: number; lng: number; capturedAt: Date; sourceId: Types.ObjectId }>(
  records: T[],
  radiusM: number
): T[][] {
  const sorted = [...records].sort(
    (a, b) =>
      new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime() ||
      a.sourceId.toString().localeCompare(b.sourceId.toString())
  );

  const clusters: Array<{ members: T[]; lat: number; lng: number }> = [];
  for (const rec of sorted) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      const d = haversineM(rec.lat, rec.lng, clusters[i]!.lat, clusters[i]!.lng);
      if (d <= radiusM && d < bestDist) {
        bestIdx = i;
        bestDist = d;
      }
    }
    if (bestIdx === -1) {
      clusters.push({ members: [rec], lat: rec.lat, lng: rec.lng });
    } else {
      const c = clusters[bestIdx]!;
      c.members.push(rec);
      const n = c.members.length;
      c.lat += (rec.lat - c.lat) / n;
      c.lng += (rec.lng - c.lng) / n;
    }
  }
  return clusters.map((c) => c.members);
}

// ── Detection types ──────────────────────────────────────────────────────────

export interface RecurrenceRecord {
  sourceType: "inspection" | "incident";
  sourceId: Types.ObjectId;
  reporterId: Types.ObjectId; // inspectorId (inspection) or reportedBy (incident)
  capturedAt: Date;
  lat: number;
  lng: number;
  category: string; // canonical hazard category key
  department: Department;
}

export interface RecurringPattern {
  siteId: Types.ObjectId;
  siteName: string;
  category: string;
  scope: RecurringHazardScope;
  records: RecurrenceRecord[]; // one per source record (first failed item), newest evidence separate
  reportCount: number;
  uniqueReporters: number;
  distinctDates: number;
  zoneCount: number;
  sitesAffected: number;
  firstReportedAt: Date;
  lastReportedAt: Date;
}

// ── Detection helpers ────────────────────────────────────────────────────────

/** One reporting EVENT per source record — a single inspection with two failed
 *  items is one report, not two (keeps "3 reports" honest; the items differ
 *  only in phrasing, which normalization already collapsed). */
function collapseBySource(records: RecurrenceRecord[]): RecurrenceRecord[] {
  const seen = new Set<string>();
  const out: RecurrenceRecord[] = [];
  for (const r of records) {
    const k = `${r.sourceType}:${r.sourceId.toString()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function qualifies(records: RecurrenceRecord[]): boolean {
  const reporters = new Set(records.map((r) => r.reporterId.toString()));
  const dates = new Set(records.map((r) => new Date(r.capturedAt).toISOString().slice(0, 10)));
  return (
    records.length >= RECURRING_MIN_REPORTS &&
    reporters.size >= RECURRING_MIN_REPORTERS &&
    dates.size >= RECURRING_MIN_DATES
  );
}

// ── Main detection pass ──────────────────────────────────────────────────────

/**
 * Scan every site's last RECURRING_WINDOW_DAYS for hazard patterns:
 * same canonical category → radius-clustered → qualifying report/reporter/date
 * thresholds → scope classification. Pure read — no alerts are written here.
 */
export async function detectRecurringPatterns(): Promise<RecurringPattern[]> {
  const windowStart = new Date(Date.now() - RECURRING_WINDOW_DAYS * DAY_MS);
  const sites = await Site.find({}).select("_id name").lean();

  // siteId → (category → collapsed records that qualify)
  const qualifiedBySite = new Map<string, Map<string, RecurrenceRecord[]>>();
  const siteNames = new Map<string, string>();

  for (const site of sites) {
    const siteId = site._id.toString();
    siteNames.set(siteId, site.name);

    const [inspections, incidents] = await Promise.all([
      Inspection.find({
        siteId: site._id,
        capturedAt: { $gte: windowStart },
        location: { $exists: true, $ne: null },
      })
        .select("_id inspectorId type checklist location capturedAt")
        .lean(),
      Incident.find({
        siteId: site._id,
        capturedAt: { $gte: windowStart },
        location: { $exists: true, $ne: null },
      })
        .select("_id reportedBy category description location capturedAt")
        .lean(),
    ]);

    const byCategory = new Map<string, RecurrenceRecord[]>();
    const push = (rec: RecurrenceRecord): void => {
      const list = byCategory.get(rec.category) ?? [];
      list.push(rec);
      byCategory.set(rec.category, list);
    };

    for (const insp of inspections) {
      const loc = insp.location as { lat: number; lng: number } | undefined;
      if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
      for (const item of (insp.checklist ?? []).filter((c) => c.result === "fail")) {
        push({
          sourceType: "inspection",
          sourceId: insp._id as Types.ObjectId,
          reporterId: insp.inspectorId,
          capturedAt: new Date(insp.capturedAt),
          lat: loc.lat,
          lng: loc.lng,
          category: normalizeHazardCategory(item.item),
          department: departmentForSource("inspection", { type: insp.type }),
        });
      }
    }

    for (const inc of incidents) {
      const loc = inc.location as { lat: number; lng: number } | undefined;
      if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
      push({
        sourceType: "incident",
        sourceId: inc._id as Types.ObjectId,
        reporterId: inc.reportedBy,
        capturedAt: new Date(inc.capturedAt),
        lat: loc.lat,
        lng: loc.lng,
        category: normalizeHazardCategory(inc.description),
        department: departmentForSource("incident", { category: inc.category }),
      });
    }

    for (const [category, rawRecords] of byCategory) {
      const records = collapseBySource(rawRecords);
      if (!qualifies(records)) continue;
      const siteMap = qualifiedBySite.get(siteId) ?? new Map<string, RecurrenceRecord[]>();
      siteMap.set(category, records);
      qualifiedBySite.set(siteId, siteMap);
    }
  }

  // sitesAffected per category across qualifying groups (edge case E)
  const sitesPerCategory = new Map<string, Set<string>>();
  for (const [siteId, catMap] of qualifiedBySite) {
    for (const category of catMap.keys()) {
      const set = sitesPerCategory.get(category) ?? new Set<string>();
      set.add(siteId);
      sitesPerCategory.set(category, set);
    }
  }

  // Assemble patterns with freshly-computed scope
  const patterns: RecurringPattern[] = [];
  for (const [siteId, catMap] of qualifiedBySite) {
    for (const [category, records] of catMap) {
      const zoneCount = clusterRecords(records, RECURRING_ZONE_RADIUS_M).length;
      const sitesAffected = sitesPerCategory.get(category)?.size ?? 1;
      const scope: RecurringHazardScope =
        sitesAffected >= 2 ? "category-wide" : zoneCount >= 2 ? "site-wide" : "localized";

      const times = records.map((r) => new Date(r.capturedAt).getTime());
      const reporters = new Set(records.map((r) => r.reporterId.toString()));
      const dates = new Set(records.map((r) => new Date(r.capturedAt).toISOString().slice(0, 10)));

      patterns.push({
        siteId: new Types.ObjectId(siteId),
        siteName: siteNames.get(siteId) ?? "Unknown",
        category,
        scope,
        records,
        reportCount: records.length,
        uniqueReporters: reporters.size,
        distinctDates: dates.size,
        zoneCount,
        sitesAffected,
        firstReportedAt: new Date(Math.min(...times)),
        lastReportedAt: new Date(Math.max(...times)),
      });
    }
  }

  return patterns;
}
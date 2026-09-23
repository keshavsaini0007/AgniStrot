// ── AI Risk Scoring Service ─────────────────────────────────────────────────
// Calculates intelligent risk scores for mines based on historical patterns.
// Uses weighted scoring algorithm considering:
//   - Alert severity + frequency
//   - Failed inspection items
//   - Resolution rates
//   - Repeat violation patterns
//
// Score range: 0-100 (higher = more risk)
// Risk levels: 0-30=LOW, 31-50=MEDIUM, 51-70=HIGH, 71+=CRITICAL
//
// ── Feature 03: Risk Trend Forecasting ───────────────────────────────────────
// Rule-based + statistical trend intelligence layered on top of the raw deltas:
//   - Trend classification (increasing / decreasing / stable / volatile /
//     new-activity / insufficient-data) from multi-period weekly buckets — a
//     single spike never counts as a trend (edge case B).
//   - Contributor ranking (repeat violations, overdue corrective actions,
//     incident frequency, failed-inspection rate, resolution time).
//   - Statistical forward projection (linear regression / moving average),
//     always labelled as a projection — never claimed as ML prediction.
//   - Normalized measures (violations-per-inspection, incidents-per-100-
//     inspections) so period volume skew does not mislead (edge case F).
//   - Zero-baseline handling: previous = 0 && current > 0 → "new-activity",
//     never an undefined/Infinity percentage (edge case C).

import type { Types } from "mongoose";
import Alert from "../models/Alert.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import type { IAlert, IInspection, IIncident } from "../types/index.js";

type AlertLean = IAlert & { _id: Types.ObjectId };
type InspectionLean = IInspection & { _id: Types.ObjectId };
type IncidentLean = IIncident & { _id: Types.ObjectId };

export interface MineRiskScore {
  siteId: Types.ObjectId;
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown: {
    alertScore: number;
    inspectionScore: number;
    incidentScore: number;
    resolutionBonus: number;
  };
  metrics: {
    totalAlerts: number;
    unresolvedAlerts: number;
    failedInspections: number;
    criticalIncidents: number;
    resolutionRate: number;
  };
  dataSufficiency: {
    hasSufficientData: boolean;
    inspectionCount: number;
    alertCount: number;
  };
}

export interface TrendData {
  siteId: Types.ObjectId;
  period: "30days";
  inspections: {
    total: number;
    passed: number;
    failed: number;
    percentChange: number;
  };
  incidents: {
    total: number;
    critical: number;
    resolved: number;
    percentChange: number;
  };
  alerts: {
    total: number;
    open: number;
    avgResolutionTimeHours: number;
    percentChange: number;
  };
}

// ── Feature 03 types ─────────────────────────────────────────────────────────

export type TrendDirection =
  | "increasing"
  | "decreasing"
  | "stable"
  | "volatile"
  | "new-activity"
  | "insufficient-data";

export interface CategoryTrend {
  direction: TrendDirection;
  /** `null` when the previous period had zero activity (zero baseline → new activity). */
  percentChange: number | null;
  newActivity: boolean;
}

export interface TrendClassification {
  method: "rule-based";
  label: string;
  overall: TrendDirection;
  confidence: "low" | "medium" | "high";
  perCategory: {
    inspections: CategoryTrend;
    incidents: CategoryTrend;
    alerts: CategoryTrend;
  };
}

export interface TrendContributor {
  key: string;
  label: string;
  direction: "increasing" | "decreasing" | "stable";
  magnitude: "high" | "medium" | "low";
  count: number;
  detail: string;
}

export interface ForecastProjection {
  method: "linear-regression" | "moving-average" | "insufficient-data";
  baselineScore: number;
  projectedScore: number | null;
  projectedBand: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  bandTrend: TrendDirection;
  next30d: {
    inspections: number | null;
    incidents: number | null;
    alerts: number | null;
  };
  confidence: "low" | "medium" | "high";
  label: string;
}

export interface TrendSeries {
  labels: string[];
  inspections: number[];
  incidents: number[];
  alerts: number[];
  score: (number | null)[];
}

export type TrendResponse = TrendData & {
  classification: TrendClassification;
  contributors: TrendContributor[];
  forecast: ForecastProjection;
  series: TrendSeries;
};

// ── Feature 03 constants ─────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const TREND_WEEKS = 13;
const FORECAST_WEEKS = 4; // ~30 days ahead
const MIN_SERIES_POINTS = 3; // weeks of activity required before calling a trend

const TREND_METHOD_LABEL =
  "Trend based on historical rule-based analysis — not a prediction from a machine-learning model.";
const FORECAST_METHOD_LABEL =
  "Statistical projection (linear trend / moving average) of the rule-based risk score — not ML prediction.";

const ALERT_SEVERITY_POINTS: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 6,
  critical: 10,
};
const INCIDENT_SEVERITY_POINTS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 5,
  critical: 10,
};

// ── Scoring helpers (mirror calculateMineRiskScore per window) ──────────────

function compositeScore(
  alerts: Array<{ severity: string; status: string }>,
  inspections: Array<{ checklist: Array<{ result: string }> }>,
  incidents: Array<{ severity: string }>
): number {
  let alertScore = 0;
  for (const a of alerts) alertScore += ALERT_SEVERITY_POINTS[a.severity] ?? 0;
  alertScore = Math.min(alertScore, 40);

  let inspectionScore = 0;
  for (const i of inspections) {
    const failed = i.checklist.filter((c) => c.result === "fail").length;
    inspectionScore += failed * 2;
  }
  inspectionScore = Math.min(inspectionScore, 30);

  let incidentScore = 0;
  for (const inc of incidents) incidentScore += INCIDENT_SEVERITY_POINTS[inc.severity] ?? 0;
  incidentScore = Math.min(incidentScore, 30);

  const closed = alerts.filter((a) => a.status === "closed").length;
  const rate = alerts.length > 0 ? closed / alerts.length : 1;
  const resolutionBonus = Math.floor(rate * 20);

  let score = alertScore + inspectionScore + incidentScore - resolutionBonus;

  // Data-sufficiency safeguard (same rule as calculateMineRiskScore):
  // with no inspections and no alerts, floor at MEDIUM (31) — never "safe".
  const hasSufficientData = inspections.length >= 1 || alerts.length >= 1;
  if (!hasSufficientData && score < 31) score = 31;

  return Math.max(0, Math.min(100, score));
}

function weekRiskScore(
  alerts: Array<{ severity: string; status: string }>,
  inspections: Array<{ checklist: Array<{ result: string }> }>,
  incidents: Array<{ severity: string }>
): number | null {
  if (alerts.length === 0 && inspections.length === 0 && incidents.length === 0) {
    return null; // no data that week — do not pretend there was a score
  }
  return compositeScore(alerts, inspections, incidents);
}

function avgResolutionHours(alerts: Array<{ createdAt: Date; status: string; resolvedAt?: Date | null }>): number {
  const resolved = alerts.filter((a) => a.status === "closed" && a.resolvedAt);
  if (resolved.length === 0) return 0;
  const totalHours = resolved.reduce((sum, alert) => {
    const created = new Date(alert.createdAt).getTime();
    const resolvedAt = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : created;
    return sum + (resolvedAt - created) / (1000 * 60 * 60);
  }, 0);
  return Math.round(totalHours / resolved.length);
}

// ── Trend classification (edge cases A–E, G) ────────────────────────────────

/**
 * Classify a weekly series.
 * - Zero activity everywhere → insufficient-data
 * - Fewer than MIN_SERIES_POINTS weeks of activity → new-activity (edge cases A/B)
 * - Direction flips ≥ 2 with high coefficient of variation → volatile (edge case E)
 * - Later-half average vs earlier-half average decides increasing/decreasing/stable
 *   — a single outlier week cannot flip the label (edge case B)
 */
function classifySeries(
  values: (number | null)[],
  percentChange: number | null,
  newActivity: boolean
): TrendDirection {
  if (newActivity) return "new-activity";

  const series = values.map((v) => (typeof v === "number" && v > 0 ? v : 0));
  const nonZero = series.filter((v) => v > 0);
  if (nonZero.length === 0) return "insufficient-data";
  if (nonZero.length < MIN_SERIES_POINTS) return "new-activity";

  const avg = (arr: number[]): number => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const mean = avg(series);

  // Direction flips between consecutive weeks (peaks/troughs)
  let flips = 0;
  for (let i = 2; i < series.length; i++) {
    const v0 = series[i] ?? 0;
    const v1 = series[i - 1] ?? 0;
    const v2 = series[i - 2] ?? 0;
    const d1 = v0 - v1;
    const d2 = v1 - v2;
    if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) flips++;
  }

  const variance = mean > 0 ? series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length : 0;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  if (flips >= 2 && cv > 0.5) return "volatile";

  const half = Math.floor(series.length / 2);
  const earlier = series.slice(0, half);
  const later = series.slice(half);
  const eAvg = avg(earlier);
  const lAvg = avg(later);
  const relativeDelta = mean > 0 ? (lAvg - eAvg) / mean : 0;

  if (lAvg > eAvg && relativeDelta > 0.15 && flips <= 1) return "increasing";
  if (lAvg < eAvg && relativeDelta < -0.15 && flips <= 1) return "decreasing";

  // Fall back to the two-period percentage change when the series is noisy
  if (percentChange !== null) {
    if (percentChange >= 15) return "increasing";
    if (percentChange <= -15) return "decreasing";
  }
  return "stable";
}

function classifyOverall(
  inspections: TrendDirection,
  incidents: TrendDirection,
  alerts: TrendDirection
): { overall: TrendDirection; confidence: "low" | "medium" | "high" } {
  const dirs = [inspections, incidents, alerts];
  const count = (d: TrendDirection): number => dirs.filter((x) => x === d).length;
  const increasing = count("increasing");
  const decreasing = count("decreasing");
  const volatileCount = count("volatile");
  const insufficient = count("insufficient-data");
  const newActivity = count("new-activity");

  if (insufficient === 3) return { overall: "insufficient-data", confidence: "low" };
  if (increasing >= 1 && decreasing === 0 && volatileCount === 0)
    return { overall: "increasing", confidence: increasing >= 2 ? "high" : "medium" };
  if (decreasing >= 1 && increasing === 0 && volatileCount === 0)
    return { overall: "decreasing", confidence: decreasing >= 2 ? "high" : "medium" };
  if (increasing >= 1 && decreasing >= 1) return { overall: "volatile", confidence: "medium" };
  if (volatileCount >= 1) return { overall: "volatile", confidence: "medium" };
  if (newActivity >= 2 && insufficient === 0) return { overall: "new-activity", confidence: "medium" };
  if (insufficient >= 2) return { overall: "insufficient-data", confidence: "low" };
  return { overall: "stable", confidence: "medium" };
}

// ── Forward projection (statistical, labelled) ──────────────────────────────

function linearRegression(values: number[]): { slope: number; intercept: number } | null {
  const n = values.length;
  if (n < 2) return null;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i] ?? 0;
    num += (i - meanX) * (v - meanY);
    den += (i - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: meanY - slope * meanX };
}

/** Project a count series ~30 days forward. Returns null when history is too shallow. */
function projectCounts(counts: number[]): number | null {
  const first = counts.findIndex((v) => v > 0);
  if (first === -1) return null;
  const slice = counts.slice(first);
  const n = slice.length;
  if (n >= 4) {
    const reg = linearRegression(slice);
    if (reg) return Math.max(0, Math.round(reg.intercept + reg.slope * (n + FORECAST_WEEKS)));
    return null;
  }
  if (n >= 2) {
    const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
    return Math.round(avg);
  }
  return null; // single week of activity — no projection (edge case B)
}

function projectScore(
  values: (number | null)[]
): { method: ForecastProjection["method"]; projectedScore: number | null; sampleSize: number } {
  const vs = values.filter((v): v is number => typeof v === "number");
  if (vs.length >= 4) {
    const reg = linearRegression(vs);
    if (reg) {
      const projected = Math.max(0, Math.min(100, reg.intercept + reg.slope * (vs.length + FORECAST_WEEKS)));
      return { method: "linear-regression", projectedScore: Math.round(projected), sampleSize: vs.length };
    }
  }
  if (vs.length >= 2) {
    const avg = vs.reduce((s, v) => s + v, 0) / vs.length;
    return {
      method: "moving-average",
      projectedScore: Math.round(Math.max(0, Math.min(100, avg))),
      sampleSize: vs.length,
    };
  }
  return { method: "insufficient-data", projectedScore: null, sampleSize: vs.length };
}

function bandForScore(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score > 70) return "CRITICAL";
  if (score > 50) return "HIGH";
  if (score > 30) return "MEDIUM";
  return "LOW";
}

function directionForDelta(delta: number): TrendDirection {
  if (delta >= 3) return "increasing";
  if (delta <= -3) return "decreasing";
  return "stable";
}

// ── Contributor ranking (edge case F: normalized measures) ──────────────────

const MAGNITUDE_WEIGHT: Record<TrendContributor["magnitude"], number> = { high: 3, medium: 2, low: 1 };

/** Normalized percentage change (rate-based) so volume skew does not mislead. */
function ratePercentChange(
  current: number,
  previous: number,
  denomCurrent: number,
  denomPrevious: number
): number | null {
  const rateCur = denomCurrent > 0 ? current / denomCurrent : 0;
  const ratePrev = denomPrevious > 0 ? previous / denomPrevious : 0;
  if (ratePrev > 0) return ((rateCur - ratePrev) / ratePrev) * 100;
  return rateCur > 0 ? null : 0; // zero baseline → new activity
}

function directionFromPctChange(pct: number | null): "increasing" | "decreasing" | "stable" {
  if (pct === null) return "increasing"; // new activity surfaces as a rising signal
  if (pct >= 10) return "increasing";
  if (pct <= -10) return "decreasing";
  return "stable";
}

function bumpMagnitude(
  m: "low" | "medium" | "high",
  dir: "increasing" | "decreasing" | "stable"
): "high" | "medium" | "low" {
  if (dir !== "increasing") return m;
  if (m === "low") return "medium";
  if (m === "medium") return "high";
  return "high";
}

function failedInspectionCount(list: Array<{ checklist: Array<{ result: string }> }>): number {
  return list.filter((i) => i.checklist.some((c) => c.result === "fail")).length;
}

function deriveContributors(input: {
  alerts: AlertLean[];
  prevAlerts: AlertLean[];
  inspections: InspectionLean[];
  prevInspections: InspectionLean[];
  incidents: IncidentLean[];
  prevIncidents: IncidentLean[];
}): TrendContributor[] {
  const { alerts, prevAlerts, inspections, prevInspections, incidents, prevIncidents } = input;
  const out: TrendContributor[] = [];
  const now = Date.now();

  // 1. Repeat safety violations (batch rule output)
  const repeat = alerts.filter((a) => a.ruleCode === "REPEAT_VIOLATION").length;
  const prevRepeat = prevAlerts.filter((a) => a.ruleCode === "REPEAT_VIOLATION").length;
  if (repeat > 0) {
    const dir = repeat > prevRepeat ? "increasing" : repeat < prevRepeat ? "decreasing" : "stable";
    out.push({
      key: "repeat_violations",
      label: "Repeat safety violations",
      direction: dir,
      magnitude: bumpMagnitude(repeat >= 3 ? "high" : repeat === 2 ? "medium" : "low", dir),
      count: repeat,
      detail: `${repeat} repeat-violation alert${repeat === 1 ? "" : "s"} in the last 30 days${prevRepeat > 0 ? ` (was ${prevRepeat})` : " — new activity"}.`,
    });
  }

  // 2. Overdue corrective actions — open alerts past the SLA resolution deadline
  const overdue = alerts.filter(
    (a) => a.status !== "closed" && a.resolutionDeadline && new Date(a.resolutionDeadline).getTime() < now
  );
  if (overdue.length > 0) {
    out.push({
      key: "overdue_corrective_actions",
      label: "Overdue corrective actions",
      direction: "increasing",
      magnitude: overdue.length >= 3 ? "high" : "medium",
      count: overdue.length,
      detail: `${overdue.length} open corrective action${overdue.length === 1 ? "" : "s"} past the SLA resolution deadline.`,
    });
  }

  // 3. Incident frequency — normalized per 100 inspections (edge case F)
  const incidentPct = ratePercentChange(incidents.length, prevIncidents.length, inspections.length, prevInspections.length);
  if (incidents.length > 0) {
    const dir = directionFromPctChange(incidentPct);
    out.push({
      key: "incident_frequency",
      label: "Incident frequency",
      direction: dir,
      magnitude: bumpMagnitude(incidents.length >= 5 ? "high" : incidents.length >= 2 ? "medium" : "low", dir),
      count: incidents.length,
      detail: `${incidents.length} incident${incidents.length === 1 ? "" : "s"} in 30 days${
        incidentPct === null ? " (new activity)" : ` (${incidentPct >= 0 ? "+" : ""}${Math.round(incidentPct)}% rate change vs previous window)`
      }.`,
    });
  }

  // 4. Failed inspection rate — violations per inspection (edge case F)
  const failed = failedInspectionCount(inspections);
  const failedPrev = failedInspectionCount(prevInspections);
  if (inspections.length > 0 && failed > 0) {
    const failurePct = ratePercentChange(failed, failedPrev, inspections.length, prevInspections.length);
    const dir = directionFromPctChange(failurePct);
    out.push({
      key: "failed_inspection_rate",
      label: "Failed inspection rate",
      direction: dir,
      magnitude: bumpMagnitude(failed >= 4 ? "high" : failed >= 2 ? "medium" : "low", dir),
      count: failed,
      detail: `${failed} of ${inspections.length} inspections had failing items${
        failurePct === null ? " (new activity)" : ` (${failurePct >= 0 ? "+" : ""}${Math.round(failurePct)}% normalized rate change)`
      }.`,
    });
  }

  // 5. Alert resolution time
  const hours = avgResolutionHours(alerts);
  const prevHours = avgResolutionHours(prevAlerts);
  if (hours > 0 && prevHours > 0 && hours !== prevHours) {
    const pct = ((hours - prevHours) / prevHours) * 100;
    const dir = directionFromPctChange(pct);
    out.push({
      key: "resolution_time",
      label: "Alert resolution time",
      direction: dir,
      magnitude: bumpMagnitude(Math.abs(pct) >= 50 ? "high" : "medium", dir),
      count: alerts.length,
      detail: `Average resolution ${hours}h (was ${prevHours}h in the previous window).`,
    });
  }

  // Rank: magnitude dominates, rising signals rank above falling ones
  return out.sort((a, b) => {
    const wA = MAGNITUDE_WEIGHT[a.magnitude] + (a.direction === "increasing" ? 1 : 0);
    const wB = MAGNITUDE_WEIGHT[b.magnitude] + (b.direction === "increasing" ? 1 : 0);
    if (wB !== wA) return wB - wA;
    return a.key.localeCompare(b.key);
  });
}

// ── Main entry points ────────────────────────────────────────────────────────

/**
 * Calculate comprehensive AI risk score for a mine.
 * Analyzes last 30 days of data.
 */
export async function calculateMineRiskScore(
  siteId: Types.ObjectId
): Promise<MineRiskScore> {
  // ── BUG FIX #3: Check if site exists ──────────────────────────────────────
  const Site = (await import("../models/Site.js")).default;
  const site = await Site.findById(siteId).lean();
  if (!site) {
    throw new Error("Site not found");
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch data in parallel
  const [alerts, inspections, incidents] = await Promise.all([
    Alert.find({ siteId, createdAt: { $gte: thirtyDaysAgo } }).lean(),
    Inspection.find({ siteId, capturedAt: { $gte: thirtyDaysAgo } }).lean(),
    // BUG FIX #1: Changed reportedAt → capturedAt (Incident model uses capturedAt)
    Incident.find({ siteId, capturedAt: { $gte: thirtyDaysAgo } }).lean(),
  ]);

  // ── Alert Score (0-40 points) ──────────────────────────────────────────────
  let alertScore = 0;
  alerts.forEach((alert) => {
    if (alert.severity === "critical") alertScore += 10;
    else if (alert.severity === "high") alertScore += 6;
    else if (alert.severity === "medium") alertScore += 3;
    else alertScore += 1;
  });
  alertScore = Math.min(alertScore, 40); // cap at 40

  // ── Inspection Score (0-30 points) ─────────────────────────────────────────
  let inspectionScore = 0;
  let failedInspectionCount_ = 0;

  inspections.forEach((inspection) => {
    const failedItems = inspection.checklist.filter((item) => item.result === "fail");
    if (failedItems.length > 0) {
      failedInspectionCount_++;
      inspectionScore += failedItems.length * 2;
    }
  });
  inspectionScore = Math.min(inspectionScore, 30); // cap at 30

  // ── Incident Score (0-30 points) ───────────────────────────────────────────
  let incidentScore = 0;
  let criticalIncidentCount = 0;

  incidents.forEach((incident) => {
    if (incident.severity === "critical") {
      incidentScore += 10;
      criticalIncidentCount++;
    } else if (incident.severity === "high") incidentScore += 5;
    else if (incident.severity === "medium") incidentScore += 2;
    else incidentScore += 1;
  });
  incidentScore = Math.min(incidentScore, 30); // cap at 30

  // ── Resolution Bonus (subtract up to 20 points) ────────────────────────────
  const closedAlerts = alerts.filter((a) => a.status === "closed").length;
  const resolutionRate = alerts.length > 0 ? closedAlerts / alerts.length : 1;
  const resolutionBonus = Math.floor(resolutionRate * 20);

  // ── BUG FIX #4: Data Sufficiency Check ─────────────────────────────────────
  const hasSufficientData = inspections.length >= 1 || alerts.length >= 1;

  // ── Final Score Calculation ────────────────────────────────────────────────
  let finalScore = alertScore + inspectionScore + incidentScore - resolutionBonus;

  // If insufficient data, floor risk at MEDIUM (31) to avoid false "safe" signal
  if (!hasSufficientData && finalScore < 31) {
    finalScore = 31;
  }

  finalScore = Math.max(0, Math.min(100, finalScore)); // clamp 0-100

  // ── Risk Level Classification ──────────────────────────────────────────────
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (finalScore > 70) riskLevel = "CRITICAL";
  else if (finalScore > 50) riskLevel = "HIGH";
  else if (finalScore > 30) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  // ── Metrics ────────────────────────────────────────────────────────────────
  const unresolvedAlerts = alerts.filter((a) => a.status !== "closed").length;

  return {
    siteId,
    score: finalScore,
    riskLevel,
    breakdown: {
      alertScore,
      inspectionScore,
      incidentScore,
      resolutionBonus,
    },
    metrics: {
      totalAlerts: alerts.length,
      unresolvedAlerts,
      failedInspections: failedInspectionCount_,
      criticalIncidents: criticalIncidentCount,
      resolutionRate: Math.round(resolutionRate * 100),
    },
    dataSufficiency: {
      hasSufficientData,
      inspectionCount: inspections.length,
      alertCount: alerts.length,
    },
  };
}

/**
 * Calculate trend analysis for a mine over 30-day period.
 * Compares current 30 days vs previous 30 days — plus feature 03 enrichment:
 * classification, contributors, statistical projection and weekly series.
 */
export async function calculateTrendData(siteId: Types.ObjectId): Promise<TrendResponse> {
  // ── BUG FIX #3: Check if site exists ──────────────────────────────────────
  const Site = (await import("../models/Site.js")).default;
  const site = await Site.findById(siteId).lean();
  if (!site) {
    throw new Error("Site not found");
  }

  const now = Date.now();
  const currentStart = new Date(now - 30 * DAY_MS);
  const previousStart = new Date(now - 60 * DAY_MS);
  const windowStart = new Date(now - TREND_WEEKS * WEEK_MS);

  // Single windowed fetch per collection — covers current + previous periods
  // AND the 13-week bucket series in one pass.
  const [inspections, incidents, alerts] = await Promise.all([
    Inspection.find({ siteId, capturedAt: { $gte: windowStart } }).lean(),
    Incident.find({ siteId, capturedAt: { $gte: windowStart } }).lean(),
    Alert.find({ siteId, createdAt: { $gte: windowStart } }).lean(),
  ]);

  const inCurrent = (d: Date): boolean => d.getTime() >= currentStart.getTime();
  const inPrevious = (d: Date): boolean =>
    d.getTime() >= previousStart.getTime() && d.getTime() < currentStart.getTime();

  // ── 13-week buckets (oldest → newest; index 0 = most recent week) ─────────
  const labels: string[] = [];
  for (let i = TREND_WEEKS - 1; i >= 0; i--) {
    const d = new Date(now - i * WEEK_MS);
    labels.push(d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
  }

  const bucketOf = (when: Date): number => {
    const diff = Math.max(0, now - new Date(when).getTime());
    const idx = Math.min(TREND_WEEKS - 1, Math.floor(diff / WEEK_MS));
    return TREND_WEEKS - 1 - idx; // 0 = oldest week
  };

  const inspBuckets = Array<number>(TREND_WEEKS).fill(0);
  const incBuckets = Array<number>(TREND_WEEKS).fill(0);
  const alertBuckets = Array<number>(TREND_WEEKS).fill(0);
  const weekAlerts: AlertLean[][] = Array.from({ length: TREND_WEEKS }, () => []);
  const weekInspections: InspectionLean[][] = Array.from({ length: TREND_WEEKS }, () => []);
  const weekIncidents: IncidentLean[][] = Array.from({ length: TREND_WEEKS }, () => []);

  for (const insp of inspections) {
    const b = bucketOf(insp.capturedAt);
    inspBuckets[b] = (inspBuckets[b] ?? 0) + 1;
    weekInspections[b]!.push(insp);
  }
  for (const inc of incidents) {
    const b = bucketOf(inc.capturedAt);
    incBuckets[b] = (incBuckets[b] ?? 0) + 1;
    weekIncidents[b]!.push(inc);
  }
  for (const alert of alerts) {
    const b = bucketOf(alert.createdAt);
    alertBuckets[b] = (alertBuckets[b] ?? 0) + 1;
    weekAlerts[b]!.push(alert);
  }

  // Weekly risk score mirror + weekly normalized failure/incident rates
  const scoreBuckets = weekAlerts.map((wa, i) =>
    weekRiskScore(wa, weekInspections[i]!, weekIncidents[i]!)
  );
  const failureRateBuckets = weekInspections.map(
    (wi) => (wi.length > 0 ? (failedInspectionCount(wi) / wi.length) * 100 : 0)
  );
  const incidentRateBuckets = weekInspections.map(
    (wi, i) => (wi.length > 0 ? (weekIncidents[i]!.length / wi.length) * 100 : 0)
  );

  // ── Current vs previous periods (backward-compatible fields) ──────────────
  const currentInspections = inspections.filter((i) => inCurrent(i.capturedAt));
  const previousInspections = inspections.filter((i) => inPrevious(i.capturedAt));
  const currentPassed = currentInspections.filter(
    (i) => !i.checklist.some((c) => c.result === "fail")
  ).length;
  const currentFailed = currentInspections.length - currentPassed;
  const inspectionChange =
    previousInspections.length > 0
      ? Math.round(((currentInspections.length - previousInspections.length) / previousInspections.length) * 100)
      : 0;

  const currentIncidents = incidents.filter((i) => inCurrent(i.capturedAt));
  const previousIncidents = incidents.filter((i) => inPrevious(i.capturedAt));
  const currentCritical = currentIncidents.filter((i) => i.severity === "critical").length;
  const currentResolved = currentIncidents.filter((i) => i.status === "resolved").length;
  const incidentChange =
    previousIncidents.length > 0
      ? Math.round(((currentIncidents.length - previousIncidents.length) / previousIncidents.length) * 100)
      : 0;

  const currentAlerts = alerts.filter((a) => inCurrent(a.createdAt));
  const previousAlerts = alerts.filter((a) => inPrevious(a.createdAt));
  const currentOpen = currentAlerts.filter((a) => a.status !== "closed").length;
  const avgResolutionTimeHours = avgResolutionHours(currentAlerts);
  const alertChange =
    previousAlerts.length > 0
      ? Math.round(((currentAlerts.length - previousAlerts.length) / previousAlerts.length) * 100)
      : 0;

  // ── Zero-baseline-aware percentage change (edge case C) ───────────────────
  const nullAwarePct = (cur: number, prev: number): number | null => {
    if (prev > 0) return Math.round(((cur - prev) / prev) * 100);
    return cur > 0 ? null : 0;
  };
  const inspPct = nullAwarePct(currentInspections.length, previousInspections.length);
  const incPct = nullAwarePct(currentIncidents.length, previousIncidents.length);
  const alertPct = nullAwarePct(currentAlerts.length, previousAlerts.length);
  const inspNewActivity = previousInspections.length === 0 && currentInspections.length > 0;
  const incNewActivity = previousIncidents.length === 0 && currentIncidents.length > 0;
  const alertNewActivity = previousAlerts.length === 0 && currentAlerts.length > 0;

  // ── Classification ────────────────────────────────────────────────────────
  const inspectionsTrend: CategoryTrend = {
    direction: classifySeries(failureRateBuckets, inspPct, inspNewActivity),
    percentChange: inspPct,
    newActivity: inspNewActivity,
  };
  const incidentsTrend: CategoryTrend = {
    direction: classifySeries(incidentRateBuckets, incPct, incNewActivity),
    percentChange: incPct,
    newActivity: incNewActivity,
  };
  const alertsTrend: CategoryTrend = {
    direction: classifySeries(alertBuckets, alertPct, alertNewActivity),
    percentChange: alertPct,
    newActivity: alertNewActivity,
  };
  const { overall, confidence } = classifyOverall(
    inspectionsTrend.direction,
    incidentsTrend.direction,
    alertsTrend.direction
  );
  const classification: TrendClassification = {
    method: "rule-based",
    label: TREND_METHOD_LABEL,
    overall,
    confidence,
    perCategory: { inspections: inspectionsTrend, incidents: incidentsTrend, alerts: alertsTrend },
  };

  // ── Contributors ──────────────────────────────────────────────────────────
  const contributors = deriveContributors({
    alerts: currentAlerts,
    prevAlerts: previousAlerts,
    inspections: currentInspections,
    prevInspections: previousInspections,
    incidents: currentIncidents,
    prevIncidents: previousIncidents,
  });

  // ── Statistical projection ────────────────────────────────────────────────
  const baselineScore = compositeScore(currentAlerts, currentInspections, currentIncidents);
  const projected = projectScore(scoreBuckets);
  const forecast: ForecastProjection = {
    method: projected.method,
    baselineScore,
    projectedScore: projected.projectedScore,
    projectedBand: projected.projectedScore !== null ? bandForScore(projected.projectedScore) : null,
    bandTrend: projected.projectedScore !== null ? directionForDelta(projected.projectedScore - baselineScore) : "stable",
    next30d: {
      inspections: projectCounts(inspBuckets),
      incidents: projectCounts(incBuckets),
      alerts: projectCounts(alertBuckets),
    },
    confidence:
      projected.method === "linear-regression"
        ? projected.sampleSize >= 8
          ? "high"
          : "medium"
        : "low",
    label: FORECAST_METHOD_LABEL,
  };

  const series: TrendSeries = {
    labels,
    inspections: inspBuckets,
    incidents: incBuckets,
    alerts: alertBuckets,
    score: scoreBuckets,
  };

  return {
    siteId,
    period: "30days",
    inspections: {
      total: currentInspections.length,
      passed: currentPassed,
      failed: currentFailed,
      percentChange: inspectionChange,
    },
    incidents: {
      total: currentIncidents.length,
      critical: currentCritical,
      resolved: currentResolved,
      percentChange: incidentChange,
    },
    alerts: {
      total: currentAlerts.length,
      open: currentOpen,
      avgResolutionTimeHours,
      percentChange: alertChange,
    },
    classification,
    contributors,
    forecast,
    series,
  };
}

/**
 * Get risk scores for all sites (for corporate/regulator dashboard).
 * Returns sorted by risk score descending.
 */
export async function getAllSitesRiskScores(): Promise<MineRiskScore[]> {
  const Site = (await import("../models/Site.js")).default;
  const sites = await Site.find({}).select("_id").lean();

  const scores = await Promise.all(
    sites.map((site) => calculateMineRiskScore(site._id))
  );

  // Sort by score descending (highest risk first)
  return scores.sort((a, b) => b.score - a.score);
}
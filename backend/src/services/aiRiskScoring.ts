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

import type { Types } from "mongoose";
import Alert from "../models/Alert.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";

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
  let failedInspectionCount = 0;

  inspections.forEach((inspection) => {
    const failedItems = inspection.checklist.filter((item) => item.result === "fail");
    if (failedItems.length > 0) {
      failedInspectionCount++;
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
      failedInspections: failedInspectionCount,
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
 * Compares current 30 days vs previous 30 days.
 */
export async function calculateTrendData(siteId: Types.ObjectId): Promise<TrendData> {
  // ── BUG FIX #3: Check if site exists ──────────────────────────────────────
  const Site = (await import("../models/Site.js")).default;
  const site = await Site.findById(siteId).lean();
  if (!site) {
    throw new Error("Site not found");
  }

  const now = new Date();

  // Current period: last 30 days
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);

  // Previous period: 31-60 days ago
  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 60);
  const previousEnd = new Date(currentStart);

  // ── Inspections ────────────────────────────────────────────────────────────
  const [currentInspections, previousInspections] = await Promise.all([
    Inspection.find({ siteId, capturedAt: { $gte: currentStart } }).lean(),
    Inspection.find({
      siteId,
      capturedAt: { $gte: previousStart, $lt: previousEnd },
    }).lean(),
  ]);

  const currentPassed = currentInspections.filter(
    (i) => !i.checklist.some((c) => c.result === "fail")
  ).length;
  const currentFailed = currentInspections.length - currentPassed;

  const previousTotal = previousInspections.length;
  const inspectionChange =
    previousTotal > 0
      ? Math.round(((currentInspections.length - previousTotal) / previousTotal) * 100)
      : 0;

  // ── Incidents ──────────────────────────────────────────────────────────────
  const [currentIncidents, previousIncidents] = await Promise.all([
    // BUG FIX #1: Changed reportedAt → capturedAt
    Incident.find({ siteId, capturedAt: { $gte: currentStart } }).lean(),
    Incident.find({
      siteId,
      capturedAt: { $gte: previousStart, $lt: previousEnd },
    }).lean(),
  ]);

  const currentCritical = currentIncidents.filter((i) => i.severity === "critical").length;
  const currentResolved = currentIncidents.filter((i) => i.status === "resolved").length;

  const previousIncidentTotal = previousIncidents.length;
  const incidentChange =
    previousIncidentTotal > 0
      ? Math.round(((currentIncidents.length - previousIncidentTotal) / previousIncidentTotal) * 100)
      : 0;

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const [currentAlerts, previousAlerts] = await Promise.all([
    Alert.find({ siteId, createdAt: { $gte: currentStart } }).lean(),
    Alert.find({
      siteId,
      createdAt: { $gte: previousStart, $lt: previousEnd },
    }).lean(),
  ]);

  const currentOpen = currentAlerts.filter((a) => a.status !== "closed").length;

  // Calculate average resolution time (hours)
  const resolvedAlerts = currentAlerts.filter((a) => a.status === "closed" && a.resolvedAt);
  let avgResolutionTimeHours = 0;
  if (resolvedAlerts.length > 0) {
    const totalHours = resolvedAlerts.reduce((sum, alert) => {
      const created = new Date(alert.createdAt).getTime();
      const resolved = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : created;
      return sum + (resolved - created) / (1000 * 60 * 60);
    }, 0);
    avgResolutionTimeHours = Math.round(totalHours / resolvedAlerts.length);
  }

  const previousAlertTotal = previousAlerts.length;
  const alertChange =
    previousAlertTotal > 0
      ? Math.round(((currentAlerts.length - previousAlertTotal) / previousAlertTotal) * 100)
      : 0;

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

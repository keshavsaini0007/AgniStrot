import type { Request, Response } from "express";
import { Types } from "mongoose";
import Site from "../models/Site.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import Alert from "../models/Alert.js";
import Document from "../models/Document.js";
import { calculateMineRiskScore } from "../services/aiRiskScoring.js";
import type { ComplianceState, ListComplianceQuery } from "../validators/compliance.validator.js";

// ── Compliance feed ─────────────────────────────────────────────────────────
// Derived, read-only view: compliance "requirements" are computed per site from
// the live data already in the DB (inspections, incidents, alerts, AI risk).
// Status is a projection of current posture, not a stored mutable field:
//   compliant / non_compliant / pending / overdue
// This mirrors PRD FR7 (dashboards/exports) without inventing new write paths.

export type ComplianceDto = {
  id: string;
  siteId: string;
  siteName: string;
  requirement: string;
  category: "inspection" | "incident" | "alert" | "overall";
  description: string;
  status: ComplianceState;
  dueDate: Date;
  responsibleDepartment: string;
  documents: string[];
  lastReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const LOOKBACK_DAYS = 90; // broader than the 30-day risk window so sparse sites still surface rows
const TYPE_TO_DEPARTMENT: Record<string, string> = {
  safety: "Safety",
  environmental: "Environment & Ecology",
  production: "Operations",
  labour: "Labour & Welfare",
};

function plusDays(days: number): Date {
  return new Date(Date.now() + days * 86400000);
}

function row(
  siteId: string,
  siteName: string,
  ordinal: number,
  category: ComplianceDto["category"],
  requirement: string,
  description: string,
  status: ComplianceState,
  dueDate: Date,
  responsibleDepartment: string,
  documents: string[],
  lastReviewedAt?: Date
): ComplianceDto {
  return {
    id: `${siteId}:${category}:${ordinal}`,
    siteId,
    siteName,
    requirement,
    category,
    description,
    status,
    dueDate,
    responsibleDepartment,
    documents,
    ...(lastReviewedAt ? { lastReviewedAt } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function computeSiteRows(
  site: { _id: Types.ObjectId; name: string },
  docsBySite: Map<string, string[]>
): Promise<ComplianceDto[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
  const siteIdStr = site._id.toString();

  const [inspections, incidents, alerts, risk] = await Promise.all([
    Inspection.find({ siteId: site._id, capturedAt: { $gte: since } })
      .select("type checklist capturedAt")
      .lean(),
    Incident.find({ siteId: site._id, capturedAt: { $gte: since } })
      .select("severity status capturedAt")
      .lean(),
    Alert.find({ siteId: site._id, createdAt: { $gte: since } })
      .select("severity status resolvedAt createdAt")
      .lean(),
    calculateMineRiskScore(site._id).catch(() => null),
  ]);

  const siteName = site.name;
  const docs = docsBySite.get(siteIdStr) ?? [];
  const rows: ComplianceDto[] = [];
  let ordinal = 1;

  // ── Inspection rows: one per distinct inspection type present ─────────────
  const byType = new Map<string, { total: number; failed: number; lastCaptured?: Date }>();
  for (const insp of inspections) {
    const failed = insp.checklist.filter((c) => c.result === "fail").length;
    const agg = byType.get(insp.type) ?? { total: 0, failed: 0 };
    agg.total += 1;
    agg.failed += failed > 0 ? 1 : 0;
    if (insp.capturedAt && (!agg.lastCaptured || insp.capturedAt > agg.lastCaptured)) {
      agg.lastCaptured = insp.capturedAt;
    }
    byType.set(insp.type, agg);
  }
  for (const [type, agg] of byType) {
    const compliant = agg.failed === 0;
    rows.push(
      row(
        siteIdStr,
        siteName,
        ordinal++,
        "inspection",
        `Periodic ${type} inspections`,
        `${agg.total} ${type} inspection(s) in the last ${LOOKBACK_DAYS} days${
          agg.failed > 0 ? `, ${agg.failed} with failed checklist items` : ""
        }.`,
        compliant ? "compliant" : "non_compliant",
        plusDays(7),
        TYPE_TO_DEPARTMENT[type] ?? "Mine Operations",
        docs.slice(0, 2),
        agg.lastCaptured
      )
    );
  }

  // ── Incident escalation protocol ───────────────────────────────────────────
  const openHighIncidents = incidents.filter(
    (i) => (i.severity === "critical" || i.severity === "high") && i.status !== "resolved"
  ).length;
  rows.push(
    row(
      siteIdStr,
      siteName,
      ordinal++,
      "incident",
      "Incident reporting & escalation protocol",
      openHighIncidents > 0
        ? `${openHighIncidents} critical/high incident(s) currently unresolved — escalation required.`
        : `No unresolved critical/high incidents in the last ${LOOKBACK_DAYS} days.`,
      openHighIncidents > 0 ? "non_compliant" : "compliant",
      plusDays(7),
      "Safety",
      docs.slice(0, 2)
    )
  );

  // ── Alert resolution discipline ────────────────────────────────────────────
  const openAlerts = alerts.filter((a) => a.status !== "closed");
  const openHighAlerts = openAlerts.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  ).length;
  rows.push(
    row(
      siteIdStr,
      siteName,
      ordinal++,
      "alert",
      "Alert resolution within deadlines",
      openAlerts.length > 0
        ? `${openAlerts.length} open alert(s) — ${openHighAlerts} critical/high still requiring action.`
        : `All ${alerts.length} alert(s) resolved.`,
      openHighAlerts > 0 ? "non_compliant" : openAlerts.length > 0 ? "pending" : "compliant",
      plusDays(2),
      "Operations",
      docs.slice(0, 2)
    )
  );

  // ── Aggregate AI risk posture ─────────────────────────────────────────────
  if (risk) {
    const status: ComplianceState =
      risk.riskLevel === "LOW" || risk.riskLevel === "MEDIUM"
        ? "compliant"
        : risk.riskLevel === "HIGH"
          ? "overdue"
          : "non_compliant";
    rows.push(
      row(
        siteIdStr,
        siteName,
        ordinal++,
        "overall",
        "Aggregate site risk within acceptable band",
        `AI risk score ${risk.score}/100 (${risk.riskLevel}) across alerts, inspections and incidents.`,
        status,
        plusDays(30),
        "Management",
        docs.slice(0, 2)
      )
    );
  }

  return rows;
}

// ── GET /api/v1/compliance ───────────────────────────────────────────────────

export const listCompliance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const q = req.query as unknown as ListComplianceQuery;
    // Explicit defaults (not relying on zod default-merging through Express 5)
    const limit = q.limit ?? 50;
    const page = q.page ?? 1;

    let siteIds: Types.ObjectId[];
    if (user?.role === "mine_official") {
      // Own-site only; unknown/no binding → no rows (deny-by-default).
      siteIds = user.siteId ? [new Types.ObjectId(user.siteId)] : [];
    } else if (q.siteId) {
      siteIds = [new Types.ObjectId(q.siteId)];
    } else {
      const allSites = await Site.find({}).select("_id name").lean();
      siteIds = allSites.map((s) => s._id);
    }

    if (siteIds.length === 0) {
      res.json({ data: [], total: 0, page, limit });
      return;
    }

    const sites = await Site.find({ _id: { $in: siteIds } }).select("_id name").lean();
    const docRows = await Document.find({ siteId: { $in: siteIds } })
      .select("siteId sourceImageUrl reviewStatus")
      .lean();
    const docsBySite = new Map<string, string[]>();
    for (const d of docRows) {
      const key = String(d.siteId);
      const list = docsBySite.get(key) ?? [];
      if (d.reviewStatus !== "rejected") list.push(d.sourceImageUrl);
      docsBySite.set(key, list);
    }

    const rowsBySite = await Promise.all(
      sites.map((s) => computeSiteRows(s, docsBySite))
    );
    const allRows = rowsBySite.flat();

    const filtered = q.status ? allRows.filter((r) => r.status === q.status) : allRows;
    const total = filtered.length;
    const start = (page - 1) * limit;
    res.json({ data: filtered.slice(start, start + limit), total, page, limit });
  } catch (err) {
    console.error("List compliance error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
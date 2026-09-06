import type { Request, Response } from "express";
import Alert from "../models/Alert.js";
import { buildScope } from "../utils/roleScope.js";
import type { ListAlertsQuery } from "../validators/query.validator.js";

// ── GET /api/v1/alerts ─────────────────────────────────────────────────────
// Filterable list of alerts. Mine official scoped to own site;
// corporate/regulator see all. Field officer blocked at route level.

export const listAlerts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListAlertsQuery;
    const scope = buildScope(req, "inspection"); // scope.siteId for mine_official

    const filter: Record<string, unknown> = { ...scope };

    // Site-scoped users (mine_official) must never override their scope with
    // a client-supplied ?siteId= — that would leak another site's alerts.
    if (!filter.siteId && q.siteId) filter.siteId = q.siteId;
    if (q.severity) filter.severity = q.severity;
    if (q.ruleCode) filter.ruleCode = q.ruleCode;
    if (q.status)   filter.status = q.status;

    const limit = q.limit;

    const rows = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("siteId", "name")
      .populate("assignedTo", "name")
      .lean();

    const data = rows.map((r) => {
      // siteId is populated (lean), so it's a { _id, name } ref, not a bare ObjectId
      const siteRef = (r.siteId as unknown as { _id?: string; name?: string }) ?? {};
      return {
        id: (r._id as unknown as string).toString(),
        siteId: (siteRef._id ?? (r.siteId as unknown as string)).toString(),
        siteName: siteRef.name ?? "Unknown",
        sourceType: r.sourceType,
        ruleCode: r.ruleCode,
        severity: r.severity,
        status: r.status,
        assignedToName: (r.assignedTo as unknown as { name: string })?.name ?? "Unassigned",
        createdAt: r.createdAt,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("List alerts error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

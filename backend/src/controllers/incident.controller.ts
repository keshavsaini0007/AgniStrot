import type { Request, Response } from "express";
import Incident from "../models/Incident.js";
import { buildScope } from "../utils/roleScope.js";
import type { ListIncidentsQuery } from "../validators/query.validator.js";

// ── GET /api/v1/incidents ──────────────────────────────────────────────────
// Role-scoped, filterable, paginated list of incidents.

export const listIncidents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListIncidentsQuery;
    const scope = buildScope(req, "incident");

    // Build filter
    const filter: Record<string, unknown> = { ...scope };

    if (q.siteId)   filter.siteId = q.siteId;
    if (q.severity) filter.severity = q.severity;
    if (q.category) filter.category = q.category;
    if (q.status)   filter.status = q.status;
    if (q.from || q.to) {
      filter.capturedAt = {};
      if (q.from) (filter.capturedAt as Record<string, Date>).$gte = q.from;
      if (q.to)   (filter.capturedAt as Record<string, Date>).$lte = q.to;
    }

    const page = q.page;
    const limit = q.limit;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Incident.find(filter)
        .sort({ capturedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reportedBy", "name")
        .lean(),
      Incident.countDocuments(filter),
    ]);

    const data = rows.map((r) => ({
      id: (r._id as unknown as string).toString(),
      siteId: (r.siteId as unknown as string).toString(),
      severity: r.severity,
      category: r.category,
      status: r.status,
      reportedByName: (r.reportedBy as unknown as { name: string })?.name ?? "Unknown",
      capturedAt: r.capturedAt,
    }));

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List incidents error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

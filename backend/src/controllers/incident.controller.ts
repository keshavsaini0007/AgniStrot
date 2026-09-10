import type { Request, Response } from "express";
import { Types } from "mongoose";
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

    // Site-scoped users (mine_official) must never override their scope with
    // a client-supplied ?siteId= — that would leak another site's incidents.
    if (!filter.siteId && q.siteId) filter.siteId = q.siteId;
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
      description: r.description,
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

// ── GET /api/v1/incidents/:id ────────────────────────────────────────────────
// Role-scoped incident detail. Out-of-scope and unknown ids both return 404 so
// the endpoint never confirms whether a record exists.

export const getIncidentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid incident ID." });
      return;
    }

    const filter: Record<string, unknown> = { _id: id, ...buildScope(req, "incident") };
    const doc = await Incident.findOne(filter)
      .populate("reportedBy", "name")
      .lean();

    if (!doc) {
      res.status(404).json({ error: "Incident not found." });
      return;
    }

    const reportedByName =
      (doc.reportedBy as unknown as { name: string })?.name ?? "Unknown";

    res.json({
      data: {
        id: (doc._id as unknown as string).toString(),
        clientUuid: doc.clientUuid,
        siteId: (doc.siteId as unknown as string).toString(),
        reportedBy: reportedByName,
        reportedByName,
        severity: doc.severity,
        category: doc.category,
        description: doc.description,
        location: doc.location,
        photoUrls: doc.photoUrls,
        capturedAt: doc.capturedAt,
        syncedAt: doc.syncedAt,
        status: doc.status,
      },
    });
  } catch (err) {
    console.error("Get incident error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

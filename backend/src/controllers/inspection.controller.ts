import type { Request, Response } from "express";
import { Types } from "mongoose";
import Inspection from "../models/Inspection.js";
import { buildScope } from "../utils/roleScope.js";
import type { ListInspectionsQuery } from "../validators/query.validator.js";

// ── GET /api/v1/inspections ────────────────────────────────────────────────
// Role-scoped, filterable, paginated list of inspections.

export const listInspections = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListInspectionsQuery;
    const scope = buildScope(req, "inspection");

    // Build filter
    const filter: Record<string, unknown> = { ...scope };

    // Site-scoped users (mine_official) must never override their scope with
    // a client-supplied ?siteId= — that would leak another site's inspections.
    if (!filter.siteId && q.siteId) filter.siteId = q.siteId;
    if (q.type)    filter.type = q.type;
    if (q.from || q.to) {
      filter.capturedAt = {};
      if (q.from) (filter.capturedAt as Record<string, Date>).$gte = q.from;
      if (q.to)   (filter.capturedAt as Record<string, Date>).$lte = q.to;
    }

    const page = q.page;
    const limit = q.limit;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Inspection.find(filter)
        .sort({ capturedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("inspectorId", "name")
        .lean(),
      Inspection.countDocuments(filter),
    ]);

    const data = rows.map((r) => ({
      id: (r._id as unknown as string).toString(),
      siteId: (r.siteId as unknown as string).toString(),
      type: r.type,
      inspectorName: (r.inspectorId as unknown as { name: string })?.name ?? "Unknown",
      failedCount: r.checklist.filter((c) => c.result === "fail").length,
      capturedAt: r.capturedAt,
    }));

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List inspections error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── GET /api/v1/inspections/:id ──────────────────────────────────────────────
// Role-scoped inspection detail. Out-of-scope and unknown ids both return 404
// so the endpoint never confirms whether a record exists.

export const getInspectionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid inspection ID." });
      return;
    }

    const filter: Record<string, unknown> = { _id: id, ...buildScope(req, "inspection") };
    const doc = await Inspection.findOne(filter)
      .populate("inspectorId", "name")
      .lean();

    if (!doc) {
      res.status(404).json({ error: "Inspection not found." });
      return;
    }

    const inspectorName =
      (doc.inspectorId as unknown as { name: string })?.name ?? "Unknown";

    res.json({
      data: {
        id: (doc._id as unknown as string).toString(),
        clientUuid: doc.clientUuid,
        siteId: (doc.siteId as unknown as string).toString(),
        inspectorId: inspectorName,
        inspectorName,
        type: doc.type,
        checklist: doc.checklist,
        location: doc.location,
        photoUrls: doc.photoUrls,
        capturedAt: doc.capturedAt,
        syncedAt: doc.syncedAt,
        failedCount: doc.checklist.filter((c) => c.result === "fail").length,
      },
    });
  } catch (err) {
    console.error("Get inspection error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

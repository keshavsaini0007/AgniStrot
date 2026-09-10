import type { Request, Response } from "express";
import Attendance from "../models/Attendance.js";
import { buildScope } from "../utils/roleScope.js";
import type { ListAttendanceQuery } from "../validators/query.validator.js";

// ── GET /api/v1/attendance ──────────────────────────────────────────────────
// Role-scoped, filterable, paginated list of attendance records.
// field_officer is blocked at the route (403) and fail-closed in buildScope.

export const listAttendance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListAttendanceQuery;
    const scope = buildScope(req, "attendance");

    // Build filter
    const filter: Record<string, unknown> = { ...scope };

    // Site-scoped users (mine_official) must never override their scope with
    // a client-supplied ?siteId= — that would leak another site's records.
    if (!filter.siteId && q.siteId) filter.siteId = q.siteId;
    if (q.checkType) filter.checkType = q.checkType;
    const workerRef = q.workerRef?.trim();
    if (workerRef) filter.workerRef = workerRef;
    if (q.from || q.to) {
      filter.capturedAt = {};
      if (q.from) (filter.capturedAt as Record<string, Date>).$gte = q.from;
      if (q.to)   (filter.capturedAt as Record<string, Date>).$lte = q.to;
    }

    // Defensive pagination — validateQuery merges defaults via Object.assign on
    // Express 5's read-only req.query getter, so zod never injects its coerced
    // numbers; the raw querystring values land here as strings. Coerce + clamp.
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20) || 20));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ capturedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    const data = rows.map((r) => ({
      id: (r._id as unknown as string).toString(),
      siteId: (r.siteId as unknown as string).toString(),
      workerRef: r.workerRef,
      checkType: r.checkType,
      capturedAt: r.capturedAt,
      syncedAt: r.syncedAt,
    }));

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List attendance error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
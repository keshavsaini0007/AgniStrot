import type { Request, Response } from "express";
import { Types } from "mongoose";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { buildCsv } from "../services/exportService.js";
import { logAction } from "../services/auditLogger.js";
import { buildScope } from "../utils/roleScope.js";
import type { ListAttendanceQuery } from "../validators/query.validator.js";

// ── GET /api/v1/exports/users.csv ────────────────────────────────────────────
// Corporate-only export of the user register (f07 dataset). field_officer,
// mine_official and regulator are blocked at the route (authorize). The bound
// site is carried as a name when present; status mirrors the users list DTO.
// Columns: Name, Email, Role, Site, Status, Created.

export const exportUsersCsv = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;

    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("name email role siteId isActive createdAt")
      .populate("siteId", "name")
      .lean();

    const rows: Array<Array<unknown>> = [
      ["Name", "Email", "Role", "Site", "Status", "Created"],
    ];
    for (const u of users) {
      const siteRef = (u.siteId as unknown as { name?: string } | null) ?? null;
      rows.push([
        u.name,
        u.email,
        u.role,
        siteRef?.name ?? "",
        u.isActive ? "active" : "inactive",
        u.createdAt ? new Date(u.createdAt).toISOString() : "",
      ]);
    }

    await logAction({
      entityType: "export",
      entityId: new Types.ObjectId(user.id),
      action: "exported",
      actorId: new Types.ObjectId(user.id),
      payload: { kind: "users" },
    });

    const csv = buildCsv(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="users-register.csv"');
    res.setHeader("Content-Length", csv.length);
    res.send(csv);
  } catch (err) {
    console.error("Export users CSV error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── GET /api/v1/exports/attendance.csv ───────────────────────────────────────
// Role-scoped attendance register export. mine_official / field_officer are
// pinned by buildScope to their own site — a client-supplied ?siteId= is
// ignored for them (anti-tamper, same guard as GET /attendance). corporate and
// regulator may filter any site + date window. Columns: Site ID, Site, Worker,
// Check Type, Captured At, Synced At.

export const exportAttendanceCsv = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const q = req.query as unknown as ListAttendanceQuery;
    const scope = buildScope(req, "attendance");

    const filter: Record<string, unknown> = { ...scope };
    // Site-scoped users must never override their scope with ?siteId=.
    if (!filter.siteId && q.siteId) filter.siteId = q.siteId;
    if (q.from || q.to) {
      filter.capturedAt = {};
      if (q.from) (filter.capturedAt as Record<string, Date>).$gte = q.from;
      if (q.to) (filter.capturedAt as Record<string, Date>).$lte = q.to;
    }

    const rows = await Attendance.find(filter)
      .sort({ capturedAt: -1 })
      .populate("siteId", "name")
      .lean();

    const out: Array<Array<unknown>> = [
      ["Site ID", "Site", "Worker", "Check Type", "Captured At", "Synced At"],
    ];
    for (const r of rows) {
      const siteRef = (r.siteId as unknown as { _id: Types.ObjectId; name?: string } | null) ?? null;
      out.push([
        siteRef ? siteRef._id.toString() : (r.siteId as unknown as string).toString(),
        siteRef?.name ?? "",
        r.workerRef,
        r.checkType,
        r.capturedAt ? new Date(r.capturedAt).toISOString() : "",
        r.syncedAt ? new Date(r.syncedAt).toISOString() : "",
      ]);
    }

    await logAction({
      entityType: "export",
      entityId: new Types.ObjectId(user.id),
      action: "exported",
      actorId: new Types.ObjectId(user.id),
      payload: {
        kind: "attendance",
        siteId: filter.siteId ? (filter.siteId as Types.ObjectId).toString() : null,
        from: q.from ?? null,
        to: q.to ?? null,
      },
    });

    const csv = buildCsv(out);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="attendance-register.csv"');
    res.setHeader("Content-Length", csv.length);
    res.send(csv);
  } catch (err) {
    console.error("Export attendance CSV error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
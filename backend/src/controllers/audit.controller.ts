import type { Request, Response } from "express";
import AuditLog from "../models/AuditLog.js";
import type { ListAuditQuery } from "../validators/query.validator.js";

// ── GET /api/v1/audit ────────────────────────────────────────────────────────
// Read the hash-chained audit trail (insertion order). Regulator/corporate only
// (route-enforced). The chain is verifiable end-to-end with scripts/verifyAuditTrail.ts.

export const listAudit = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListAuditQuery;
    const filter: Record<string, unknown> = {};

    if (q.entityType) filter.entityType = q.entityType;
    if (q.entityId)   filter.entityId = q.entityId;

    const rows = await AuditLog.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .limit(q.limit)
      .lean();

    res.json({
      data: rows.map((r) => ({
        id: (r._id as unknown as string).toString(),
        entityType: r.entityType,
        entityId: (r.entityId as unknown as string).toString(),
        action: r.action,
        actorId: r.actorId ? (r.actorId as unknown as string).toString() : null,
        prevHash: r.prevHash,
        thisHash: r.thisHash,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("List audit error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
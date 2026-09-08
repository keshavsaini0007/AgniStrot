import type { Request, Response } from "express";
import { Types } from "mongoose";
import { buildStatutoryPdf } from "../services/reportService.js";
import { logAction } from "../services/auditLogger.js";
import type { StatutoryReportQuery } from "../validators/query.validator.js";

// ── GET /api/v1/reports/statutory ────────────────────────────────────────────
// PRD FR7 — statutory compliance PDF for a single site over a date window.
// mine_official is pinned to their own site (anti-tamper); corporate_manager
// and regulator may generate for any site. field_officer is blocked at route.

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const generateStatutoryReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as StatutoryReportQuery;
    const user = req.user!;

    // Anti-tamper site scoping
    if (user.role === "mine_official") {
      if (!user.siteId || user.siteId !== q.siteId) {
        res
          .status(403)
          .json({ error: "Forbidden: You may only generate reports for your assigned site." });
        return;
      }
    }

    // Express 5's read-only req.query getter drops the zod coerce result, so
    // from/to arrive as date strings (validated upstream) — coerce defensively.
    const from = q.from ? new Date(q.from) : new Date(Date.now() - THIRTY_DAYS_MS);
    const to = q.to ? new Date(q.to) : new Date();
    const type = q.type ?? "comprehensive";

    const pdfBuffer = await buildStatutoryPdf({
      siteId: q.siteId,
      type,
      from,
      to,
      generatedBy: user.id,
    });

    await logAction({
      entityType: "report",
      entityId: new Types.ObjectId(q.siteId),
      action: "generated",
      actorId: new Types.ObjectId(user.id),
      payload: { type, from, to },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="statutory-report-${q.siteId}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Generate report error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
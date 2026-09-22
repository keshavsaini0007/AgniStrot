import type { Request, Response } from "express";
import FailedJob from "../models/FailedJob.js";
import { getOutboxStats } from "../services/outboxService.js";

// ── GET /api/v1/system/outbox-health ─────────────────────────────────────────
// Operational health of the event-driven architecture: per-status event counts
// plus the most recent Dead Letter Queue entries. For oversight roles
// (corporate_manager / regulator) so they can see pending backlogs, dead
// events, and anything the worker failed permanently.

export const getOutboxHealth = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await getOutboxStats();
    const dlq = await FailedJob.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      data: {
        outbox: {
          pending: stats.pending,
          processing: stats.processing,
          completed: stats.completed,
          dead: stats.dead,
          checkedAt: stats.checkedAt,
        },
        deadLetterQueue: {
          total: stats.deadLetterQueue,
          recent: dlq.map((j) => ({
            id: j._id.toString(),
            jobType: j.jobType,
            error: j.error,
            attempts: j.attempts,
            status: j.status,
            lastFailedAt: j.lastFailedAt,
          })),
        },
      },
    });
  } catch (err) {
    console.error("Outbox health error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
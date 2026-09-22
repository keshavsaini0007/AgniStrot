import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";
import connectDB from "./config/db.js";
import { connectCloudinary } from "./config/cloudinary.js";
import authRoutes from "./routes/auth.js";
import inspectionRoutes from "./routes/inspections.js";
import incidentRoutes from "./routes/incidents.js";
import attendanceRoutes from "./routes/attendance.js";
import mediaRoutes from "./routes/media.js";
import alertRoutes from "./routes/alerts.js";
import dashboardRoutes from "./routes/dashboard.js";
import auditRoutes from "./routes/audit.js";
import reportRoutes from "./routes/reports.js";
import documentRoutes from "./routes/documents.js";
import gisRoutes from "./routes/gis.js";
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/users.js";
import sitesRoutes from "./routes/sites.js";
import correctiveActionsRoutes from "./routes/correctiveActions.js";
import complianceRoutes from "./routes/compliance.js";
import systemRoutes from "./routes/system.js";
import slaPolicyRoutes from "./routes/slaPolicies.js";
import { authenticate } from "./middleware/auth.js";
import { runBatchRules } from "./services/batchRules.js";
import { runEscalations } from "./services/workflowEngine.js";
import {
  getOutboxStats,
  processOutboxEvents,
  recoverStaleProcessing,
} from "./services/outboxService.js";
import { initSocket } from "./sockets/index.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 5000;

// ── Security middleware ────────────────────────────────────
app.use(helmet());

// ── CORS configuration ─────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL ?? "*";
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// ── Basic middleware ───────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Health check routes (no auth needed) ───────────────────
app.get(["/health", "/api/v1/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth routes (no auth needed — login gives you the token) ──
app.use(["/api/v1/auth", "/auth"], authRoutes);

// ── Protected routes (require valid JWT) ──────────────────
app.use(["/api/v1/inspections", "/inspections"], authenticate, inspectionRoutes);
app.use(["/api/v1/incidents", "/incidents"], authenticate, incidentRoutes);
app.use(["/api/v1/attendance", "/attendance"], authenticate, attendanceRoutes);
app.use(["/api/v1/media", "/media"], authenticate, mediaRoutes);
app.use(["/api/v1/alerts", "/alerts"], authenticate, alertRoutes);
app.use(["/api/v1/dashboard", "/dashboard"], authenticate, dashboardRoutes);
app.use(["/api/v1/audit", "/audit"], authenticate, auditRoutes);
app.use(["/api/v1/reports", "/reports"], authenticate, reportRoutes);
app.use(["/api/v1/documents", "/documents"], authenticate, documentRoutes);
app.use(["/api/v1/gis", "/gis"], authenticate, gisRoutes);
app.use(["/api/v1/ai", "/ai"], authenticate, aiRoutes);
app.use(["/api/v1/users", "/users"], authenticate, userRoutes);
app.use(["/api/v1/sites", "/sites"], authenticate, sitesRoutes);
app.use(["/api/v1/corrective-actions", "/corrective-actions"], authenticate, correctiveActionsRoutes);
app.use(["/api/v1/compliance", "/compliance"], authenticate, complianceRoutes);
app.use(["/api/v1/system", "/system"], authenticate, systemRoutes);
app.use(["/api/v1/sla-policies", "/sla-policies"], authenticate, slaPolicyRoutes);

// ── Start server ───────────────────────────────────────────
const start = async (): Promise<void> => {
  await connectDB();
  connectCloudinary();

  // ── Scheduler: batch rules + workflow escalation every 15 minutes ───────
  // Idempotent by design (ruleKey upserts + state-transition guards).
  cron.schedule("*/15 * * * *", async () => {
    try {
      await runBatchRules();
      await runEscalations();
      // Dispatch the events the engines just emitted (batch alerts + escalation
      // transitions) immediately instead of waiting for the next poll cycle.
      const stats = await processOutboxEvents();
      if (stats.claimed > 0) {
        console.log(
          `[outbox] post-cron cycle: claimed=${stats.claimed} completed=${stats.completed} ` +
            `held=${stats.heldForOrdering} retried=${stats.retried} dead=${stats.deadLettered}`
        );
      }
    } catch (err) {
      console.error("Scheduled task error:", err);
    }
  });
  console.log("Scheduler started: batch rules + escalations every 15 minutes.");

  // ── Outbox worker ────────────────────────────────────────────────────────
  // Polls the durable event store and dispatches to consumers (alerts / audit /
  // sockets). Near-real-time: sync/ingest endpoints also kick it immediately
  // after commit. Stale "processing" events (worker crash — edge B) are pushed
  // back to pending on a slower cadence.
  const outboxPollMs = Number(process.env.OUTBOX_POLL_MS ?? 30_000);
  const outboxBatchSize = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
  const outboxLeaseMs = Number(process.env.OUTBOX_LEASE_MS ?? 5 * 60 * 1000);

  setInterval(async () => {
    try {
      const stats = await processOutboxEvents({ batchSize: outboxBatchSize });
      if (stats.claimed > 0) {
        console.log(
          `[outbox] cycle: claimed=${stats.claimed} completed=${stats.completed} ` +
            `held=${stats.heldForOrdering} retried=${stats.retried} dead=${stats.deadLettered}`
        );
      }
    } catch (err) {
      console.error("Outbox worker error:", err);
    }
  }, outboxPollMs);

  // Crash recovery (edge B): reset events stuck in "processing" beyond the lease.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const recovered = await recoverStaleProcessing({ leaseMs: outboxLeaseMs });
      if (recovered > 0) {
        console.log(`[outbox] Recovered ${recovered} stale processing event(s).`);
      }
    } catch (err) {
      console.error("Outbox recovery error:", err);
    }
  });

  // Startup health snapshot — surface pending/DLQ counts in logs.
  void getOutboxStats()
    .then((stats) =>
      console.log(
        `[outbox] initial state: pending=${stats.pending} processing=${stats.processing} ` +
          `completed=${stats.completed} dead=${stats.dead} DLQ=${stats.deadLetterQueue}`
      )
    )
    .catch(() => undefined);

  console.log(
    `Outbox worker started (poll=${outboxPollMs}ms, batch=${outboxBatchSize}, lease=${outboxLeaseMs}ms).`
  );

  initSocket(httpServer);
  console.log("Socket.io initialized.");

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
// Server entrypoint

import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
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
import { authenticate } from "./middleware/auth.js";
import { runBatchRules } from "./services/batchRules.js";
import { runEscalations } from "./services/workflowEngine.js";
import { initSocket } from "./sockets/index.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 5000;

// ── Basic middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ── Health check route (no auth needed) ───────────────────
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth routes (no auth needed — login gives you the token) ──
app.use("/api/v1/auth", authRoutes);

// ── Protected routes (require valid JWT) ──────────────────
app.use("/api/v1/inspections", authenticate, inspectionRoutes);
app.use("/api/v1/incidents", authenticate, incidentRoutes);
app.use("/api/v1/attendance", authenticate, attendanceRoutes);
app.use("/api/v1/media", authenticate, mediaRoutes);
app.use("/api/v1/alerts", authenticate, alertRoutes);
app.use("/api/v1/dashboard", authenticate, dashboardRoutes);
app.use("/api/v1/audit", authenticate, auditRoutes);

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
    } catch (err) {
      console.error("Scheduled task error:", err);
    }
  });
  console.log("Scheduler started: batch rules + escalations every 15 minutes.");
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

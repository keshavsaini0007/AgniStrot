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
import { authenticate } from "./middleware/auth.js";
import { runBatchRules } from "./services/batchRules.js";
import { runEscalations } from "./services/workflowEngine.js";
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

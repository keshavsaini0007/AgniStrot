import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { connectCloudinary } from "./config/cloudinary.js";
import authRoutes from "./routes/auth.js";
import inspectionRoutes from "./routes/inspections.js";
import incidentRoutes from "./routes/incidents.js";
import attendanceRoutes from "./routes/attendance.js";
import mediaRoutes from "./routes/media.js";
import alertRoutes from "./routes/alerts.js";
import { authenticate } from "./middleware/auth.js";

const app = express();
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

// ── Start server ───────────────────────────────────────────
const start = async (): Promise<void> => {
  await connectDB();
  connectCloudinary();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

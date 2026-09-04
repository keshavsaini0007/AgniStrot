import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { connectCloudinary } from "./config/cloudinary.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT ?? 5000;

// ── Basic middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check route (no auth needed) ───────────────────
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth routes (no auth needed — login gives you the token) ──
app.use("/api/v1/auth", authRoutes);

// ── Start server ───────────────────────────────────────────
const start = async (): Promise<void> => {
  await connectDB();
  connectCloudinary();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start();

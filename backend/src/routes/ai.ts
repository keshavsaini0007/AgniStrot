// ── AI Intelligence Routes ──────────────────────────────────────────────────
// AI-powered analytics endpoints for risk scoring and trend analysis.
// All endpoints require authentication.

import { Router, type RequestHandler } from "express";
import { authorize } from "../middleware/auth.js";
import { getRiskScore, getTrends, getSummary } from "../controllers/ai.controller.js";

const router = Router();

// GET /api/v1/ai/risk-score/:siteId
// Calculate AI risk score for a mine (0-100 scale with breakdown)
router.get(
  "/risk-score/:siteId",
  authorize("mine_official", "corporate_manager", "regulator"),
  getRiskScore as RequestHandler
);

// GET /api/v1/ai/trends/:siteId
// Calculate 30-day trend analysis (inspections, incidents, alerts)
router.get(
  "/trends/:siteId",
  authorize("mine_official", "corporate_manager", "regulator"),
  getTrends as RequestHandler
);

// GET /api/v1/ai/summary
// Get risk scores for all sites (sorted by risk, RBAC-filtered)
router.get(
  "/summary",
  authorize("mine_official", "corporate_manager", "regulator"),
  getSummary as RequestHandler
);

export default router;

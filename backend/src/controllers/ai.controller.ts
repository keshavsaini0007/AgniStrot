// ── AI Intelligence Controller ──────────────────────────────────────────────
// Exposes AI-powered analytics endpoints:
//   - Risk scoring
//   - Trend analysis
//   - Multi-site summaries

import type { Response } from "express";
import type { AuthRequest } from "../types/index.js";
import { Types } from "mongoose";
import {
  calculateMineRiskScore,
  calculateTrendData,
  getAllSitesRiskScores,
} from "../services/aiRiskScoring.js";

/**
 * GET /api/v1/ai/risk-score/:siteId
 * Calculate AI risk score for a specific mine.
 * 
 * Authorization:
 *   - mine_official: own site only
 *   - corporate_manager, regulator: any site
 */
export async function getRiskScore(req: AuthRequest, res: Response): Promise<void> {
  const siteIdParam = req.params.siteId;
  
  if (!siteIdParam || typeof siteIdParam !== "string") {
    res.status(400).json({ error: "siteId parameter required" });
    return;
  }

  if (!Types.ObjectId.isValid(siteIdParam)) {
    res.status(400).json({ error: "Invalid siteId format" });
    return;
  }

  const siteObjectId = new Types.ObjectId(siteIdParam);

  // RBAC: mine_official can only view own site
  if (req.user?.role === "mine_official") {
    const userSiteId = req.user.siteId;
    if (!userSiteId || !new Types.ObjectId(userSiteId).equals(siteObjectId)) {
      res.status(403).json({ error: "Access denied: not your site" });
      return;
    }
  }

  try {
    const riskScore = await calculateMineRiskScore(siteObjectId);
    res.json({ data: riskScore });
  } catch (error: any) {
    console.error("Error calculating risk score:", error);
    // BUG FIX #3: Return 404 for non-existent sites
    if (error.message === "Site not found") {
      res.status(404).json({ error: "Site not found" });
      return;
    }
    res.status(500).json({ error: "Failed to calculate risk score" });
  }
}

/**
 * GET /api/v1/ai/trends/:siteId
 * Calculate trend analysis for a specific mine (30-day window).
 * 
 * Authorization:
 *   - mine_official: own site only
 *   - corporate_manager, regulator: any site
 */
export async function getTrends(req: AuthRequest, res: Response): Promise<void> {
  const siteIdParam = req.params.siteId;

  if (!siteIdParam || typeof siteIdParam !== "string") {
    res.status(400).json({ error: "siteId parameter required" });
    return;
  }

  if (!Types.ObjectId.isValid(siteIdParam)) {
    res.status(400).json({ error: "Invalid siteId format" });
    return;
  }

  const siteObjectId = new Types.ObjectId(siteIdParam);

  // RBAC: mine_official can only view own site
  if (req.user?.role === "mine_official") {
    const userSiteId = req.user.siteId;
    if (!userSiteId || !new Types.ObjectId(userSiteId).equals(siteObjectId)) {
      res.status(403).json({ error: "Access denied: not your site" });
      return;
    }
  }

  try {
    const trends = await calculateTrendData(siteObjectId);
    res.json({ data: trends });
  } catch (error: any) {
    console.error("Error calculating trends:", error);
    // BUG FIX #3: Return 404 for non-existent sites
    if (error.message === "Site not found") {
      res.status(404).json({ error: "Site not found" });
      return;
    }
    res.status(500).json({ error: "Failed to calculate trends" });
  }
}

/**
 * GET /api/v1/ai/summary
 * Get risk scores for all sites (sorted by risk).
 * 
 * Authorization:
 *   - mine_official: only their site (filtered)
 *   - corporate_manager, regulator: all sites
 */
export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    let scores = await getAllSitesRiskScores();

    // RBAC: mine_official sees only their own site
    if (req.user?.role === "mine_official") {
      const userSiteId = req.user.siteId;
      if (userSiteId) {
        const userSiteObjId = new Types.ObjectId(userSiteId);
        scores = scores.filter((s) => s.siteId.equals(userSiteObjId));
      } else {
        scores = [];
      }
    }

    res.json({ data: scores });
  } catch (error) {
    console.error("Error calculating summary:", error);
    res.status(500).json({ error: "Failed to calculate summary" });
  }
}

import { Router, type RequestHandler } from "express";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { gisMarkersSchema } from "../validators/query.validator.js";
import { getMapMarkers, getRiskLayers } from "../controllers/gis.controller.js";

const router = Router();

// ── GET /markers ─────────────────────────────────────────────────────────────
// Unified geospatial endpoint aggregating sites, inspections, and incidents.
// Auth: mine_official (own site only), corporate_manager, regulator (all sites)

router.get(
  "/markers",
  authorize("mine_official", "corporate_manager", "regulator"),
  validateQuery(gisMarkersSchema),
  getMapMarkers as RequestHandler
);

// ── GET /risk-layers ─────────────────────────────────────────────────────────
// Risk heatmap layers — per-site risk band / score / top contributors, scoped
// exactly like /markers and consistent with /ai/risk-score/:siteId.

router.get(
  "/risk-layers",
  authorize("mine_official", "corporate_manager", "regulator"),
  validateQuery(gisMarkersSchema),
  getRiskLayers as RequestHandler
);

export default router;

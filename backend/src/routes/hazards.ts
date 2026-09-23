import { Router, type RequestHandler } from "express";
import { authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { listHazardsSchema, registerHazardSchema, updateHazardSchema, addControlSchema, closeHazardSchema } from "../validators/hazard.validator.js";
import {
  listHazards,
  hazardDashboard,
  getHazard,
  createHazard,
  updateHazard,
  addControl,
  implementControl,
  assessHazardEffectiveness,
  closeHazard,
} from "../controllers/hazard.controller.js";

// ── Feature 06: Hazard Register ──────────────────────────────────────────────
// Read: mine_official (own site), corporate_manager + regulator (all sites).
// Write: mine_official + corporate_manager (register / controls / assess /
// close). field_officer is blocked entirely; regulator is read-only.

const router = Router();

const READ_ROLES = ["mine_official", "corporate_manager", "regulator"] as const;
const WRITE_ROLES = ["mine_official", "corporate_manager"] as const;

router.get(
  "/dashboard",
  authorize(...READ_ROLES),
  validateQuery(listHazardsSchema),
  hazardDashboard as RequestHandler
);

router.get(
  "/",
  authorize(...READ_ROLES),
  validateQuery(listHazardsSchema),
  listHazards as RequestHandler
);

router.get("/:id", authorize(...READ_ROLES), getHazard as RequestHandler);

router.post(
  "/",
  authorize(...WRITE_ROLES),
  validate(registerHazardSchema),
  createHazard as RequestHandler
);

router.put(
  "/:id",
  authorize(...WRITE_ROLES),
  validate(updateHazardSchema),
  updateHazard as RequestHandler
);

router.post(
  "/:id/controls",
  authorize(...WRITE_ROLES),
  validate(addControlSchema),
  addControl as RequestHandler
);

router.post(
  "/:id/controls/:controlId/implement",
  authorize(...WRITE_ROLES),
  implementControl as RequestHandler
);

router.post(
  "/:id/effectiveness",
  authorize(...WRITE_ROLES),
  assessHazardEffectiveness as RequestHandler
);

router.post(
  "/:id/close",
  authorize(...WRITE_ROLES),
  validate(closeHazardSchema),
  closeHazard as RequestHandler
);

export default router;
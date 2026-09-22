import { Router, type RequestHandler } from "express";
import {
  listSlaPolicies,
  getSlaPolicy,
  upsertPolicy,
  removePolicy,
  resetPolicies,
} from "../controllers/slaPolicy.controller.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { slaPolicyUpsertSchema } from "../validators/slaPolicy.validator.js";

const router = Router();

// ── SLA Policy admin API (feature 02 Escalation Matrix) ───────────────────────
// Configurable per-severity deadlines + escalation ladder. Oversight roles only
// (corporate_manager manages, regulator can view/audit). field_officer and
// mine_official are intentionally blocked — policies are corporate-level config.

router.get("/", authorize("corporate_manager", "regulator"), listSlaPolicies);
router.get("/:severity", authorize("corporate_manager", "regulator"), getSlaPolicy);
router.put(
  "/:severity",
  authorize("corporate_manager", "regulator"),
  validate(slaPolicyUpsertSchema),
  upsertPolicy as RequestHandler
);
router.delete("/:severity", authorize("corporate_manager", "regulator"), removePolicy);
router.post("/reset", authorize("corporate_manager", "regulator"), resetPolicies);

export default router;
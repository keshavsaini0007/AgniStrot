import { Router } from "express";
import { listAudit } from "../controllers/audit.controller.js";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { listAuditSchema } from "../validators/query.validator.js";

const router = Router();

// Audit trail is a regulatory/compliance artifact — regulators + corporate only.
router.get(
  "/",
  authorize("corporate_manager", "regulator"),
  validateQuery(listAuditSchema),
  listAudit
);

export default router;
import { Router, type RequestHandler } from "express";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { listEvidenceSchema } from "../validators/query.validator.js";
import {
  evidenceDashboard,
  listEvidence,
  runVerifyAll,
  verifyEvidenceRow,
} from "../controllers/evidence.controller.js";

const router = Router();

// Evidence integrity is an oversight artifact — same roles as documents:
// mine_official (own site only), corporate_manager + regulator (all sites).
// field_officer is capture-only and blocked from the read/verify surface.

router.get(
  "/dashboard",
  authorize("mine_official", "corporate_manager", "regulator"),
  validateQuery(listEvidenceSchema),
  evidenceDashboard as RequestHandler
);

router.get(
  "/",
  authorize("mine_official", "corporate_manager", "regulator"),
  validateQuery(listEvidenceSchema),
  listEvidence as RequestHandler
);

// Batch recon pass — oversight work, corporate + regulator only.
router.post(
  "/verify-all",
  authorize("corporate_manager", "regulator"),
  validateQuery(listEvidenceSchema),
  runVerifyAll as RequestHandler
);

router.post(
  "/:id/verify",
  authorize("mine_official", "corporate_manager", "regulator"),
  verifyEvidenceRow as RequestHandler
);

export default router;
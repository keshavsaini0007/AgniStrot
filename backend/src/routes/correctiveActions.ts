import { Router } from "express";
import {
  listCorrectiveActions,
  getCorrectiveActionById,
  submitCloseout,
  approveCloseout,
  rejectCloseout,
} from "../controllers/correctiveAction.controller.js";
import { authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  listCorrectiveActionsSchema,
  submitCloseoutSchema,
  reviewCloseoutSchema,
} from "../validators/correctiveAction.validator.js";
import { ALERT_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/", authorize(...ALERT_ROLES), validateQuery(listCorrectiveActionsSchema), listCorrectiveActions);
router.get("/:id", authorize(...ALERT_ROLES), getCorrectiveActionById);

// ── Feature 08: corrective action close-out loop ────────────────────────────
// Submit (mine_official own-site / corporate) acquires the close-out record;
// approve/reject are corporate-only. regulator is read/oversight — blocked at
// the route even though ALERT_ROLES lets them read the feed.
router.post(
  "/:id/close-out",
  authorize("mine_official", "corporate_manager"),
  validate(submitCloseoutSchema),
  submitCloseout
);
router.post(
  "/:id/approve",
  authorize("corporate_manager"),
  validate(reviewCloseoutSchema),
  approveCloseout
);
router.post(
  "/:id/reject",
  authorize("corporate_manager"),
  validate(reviewCloseoutSchema),
  rejectCloseout
);

export default router;
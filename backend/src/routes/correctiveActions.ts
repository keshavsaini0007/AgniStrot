import { Router } from "express";
import {
  listCorrectiveActions,
  getCorrectiveActionById,
} from "../controllers/correctiveAction.controller.js";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { listCorrectiveActionsSchema } from "../validators/correctiveAction.validator.js";
import { ALERT_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/", authorize(...ALERT_ROLES), validateQuery(listCorrectiveActionsSchema), listCorrectiveActions);
router.get("/:id", authorize(...ALERT_ROLES), getCorrectiveActionById);

export default router;
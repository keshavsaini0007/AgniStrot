import { Router } from "express";
import {
  listAlerts,
  acknowledgeAlert,
  resolveAlert,
  escalateAlert,
} from "../controllers/alert.controller.js";
import { authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { listAlertsSchema } from "../validators/query.validator.js";
import {
  acknowledgeAlertSchema,
  resolveAlertSchema,
  escalateAlertSchema,
} from "../validators/alert.validator.js";
import { ALERT_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/", authorize(...ALERT_ROLES), validateQuery(listAlertsSchema), listAlerts);
router.post("/:id/acknowledge", authorize(...ALERT_ROLES), validate(acknowledgeAlertSchema), acknowledgeAlert);
router.post("/:id/resolve", authorize(...ALERT_ROLES), validate(resolveAlertSchema), resolveAlert);
router.post("/:id/escalate", authorize(...ALERT_ROLES), validate(escalateAlertSchema), escalateAlert);

export default router;

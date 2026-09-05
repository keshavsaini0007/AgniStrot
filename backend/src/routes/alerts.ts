import { Router } from "express";
import { listAlerts } from "../controllers/alert.controller.js";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { listAlertsSchema } from "../validators/query.validator.js";
import { ALERT_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/", authorize(...ALERT_ROLES), validateQuery(listAlertsSchema), listAlerts);

export default router;

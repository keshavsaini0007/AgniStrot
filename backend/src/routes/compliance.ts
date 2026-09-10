import { Router } from "express";
import { listCompliance } from "../controllers/compliance.controller.js";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { listComplianceSchema } from "../validators/compliance.validator.js";
import { ALERT_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/", authorize(...ALERT_ROLES), validateQuery(listComplianceSchema), listCompliance);

export default router;
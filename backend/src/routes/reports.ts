import { Router } from "express";
import { generateStatutoryReport } from "../controllers/report.controller.js";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { statutoryReportSchema } from "../validators/query.validator.js";
import { REPORT_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/statutory", authorize(...REPORT_ROLES), validateQuery(statutoryReportSchema), generateStatutoryReport);

export default router;
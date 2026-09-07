import { Router } from "express";
import { syncInspections } from "../controllers/sync.controller.js";
import { listInspections } from "../controllers/inspection.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";
import { listInspectionsSchema } from "../validators/query.validator.js";
import { SYNC_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/", validateQuery(listInspectionsSchema), listInspections);
router.post("/sync", authenticate, authorize(...SYNC_ROLES), validate(syncBatchSchema), syncInspections);

export default router;

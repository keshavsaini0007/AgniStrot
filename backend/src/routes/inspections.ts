import { Router } from "express";
import { syncInspections } from "../controllers/sync.controller.js";
import { listInspections } from "../controllers/inspection.controller.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";
import { listInspectionsSchema } from "../validators/query.validator.js";

const router = Router();

router.get("/", validateQuery(listInspectionsSchema), listInspections);
router.post("/sync", validate(syncBatchSchema), syncInspections);

export default router;

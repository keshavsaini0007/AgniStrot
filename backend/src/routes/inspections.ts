import { Router } from "express";
import { syncInspections } from "../controllers/sync.controller.js";
import { validate } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";

const router = Router();

router.post("/sync", validate(syncBatchSchema), syncInspections);

export default router;

import { Router } from "express";
import { syncIncidents } from "../controllers/sync.controller.js";
import { validate } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";

const router = Router();

router.post("/sync", validate(syncBatchSchema), syncIncidents);

export default router;

import { Router } from "express";
import { syncIncidents } from "../controllers/sync.controller.js";
import { listIncidents } from "../controllers/incident.controller.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";
import { listIncidentsSchema } from "../validators/query.validator.js";

const router = Router();

router.get("/", validateQuery(listIncidentsSchema), listIncidents);
router.post("/sync", validate(syncBatchSchema), syncIncidents);

export default router;

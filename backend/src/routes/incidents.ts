import { Router } from "express";
import { syncIncidents } from "../controllers/sync.controller.js";
import { listIncidents, getIncidentById } from "../controllers/incident.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";
import { listIncidentsSchema } from "../validators/query.validator.js";
import { SYNC_ROLES } from "../utils/roleScope.js";

const router = Router();

router.get("/", validateQuery(listIncidentsSchema), listIncidents);
router.get("/:id", authenticate, getIncidentById);
router.post("/sync", authenticate, authorize(...SYNC_ROLES), validate(syncBatchSchema), syncIncidents);

export default router;

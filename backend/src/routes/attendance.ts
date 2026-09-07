import { Router } from "express";
import { syncAttendance } from "../controllers/sync.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";
import { SYNC_ROLES } from "../utils/roleScope.js";

const router = Router();

router.post("/sync", authenticate, authorize(...SYNC_ROLES), validate(syncBatchSchema), syncAttendance);

export default router;

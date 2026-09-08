import { Router } from "express";
import { syncAttendance } from "../controllers/sync.controller.js";
import { listAttendance } from "../controllers/attendance.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { syncBatchSchema } from "../validators/sync.validator.js";
import { listAttendanceSchema } from "../validators/query.validator.js";
import { SYNC_ROLES, ATTENDANCE_READ_ROLES } from "../utils/roleScope.js";

const router = Router();

router.post("/sync", authenticate, authorize(...SYNC_ROLES), validate(syncBatchSchema), syncAttendance);

router.get("/", authenticate, authorize(...ATTENDANCE_READ_ROLES), validateQuery(listAttendanceSchema), listAttendance);

export default router;

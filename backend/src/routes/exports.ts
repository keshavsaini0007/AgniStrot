import { Router } from "express";
import { exportUsersCsv, exportAttendanceCsv } from "../controllers/export.controller.js";
import { authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { listAttendanceSchema } from "../validators/query.validator.js";
import { ATTENDANCE_READ_ROLES } from "../utils/roleScope.js";

const router = Router();

// ── GET /exports/users.csv ───────────────────────────────────────────────────
// Corporate-only register export. field_officer / mine_official / regulator → 403.
router.get("/users.csv", authorize("corporate_manager"), exportUsersCsv);

// ── GET /exports/attendance.csv ──────────────────────────────────────────────
// Role-scoped attendance export; buildScope pins site-linked roles to their own
// site and corporate/regulator may pass optional ?siteId&from&to (= /attendance).
router.get(
  "/attendance.csv",
  authorize(...ATTENDANCE_READ_ROLES),
  validateQuery(listAttendanceSchema),
  exportAttendanceCsv
);

export default router;
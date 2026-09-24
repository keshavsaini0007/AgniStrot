import { Router } from "express";
import {
  exportAttendanceCsv,
  exportAttendanceJson,
  exportUsersCsv,
  exportUsersJson,
} from "../controllers/export.controller.js";
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

// ── GET /exports/users.json ──────────────────────────────────────────────────
// JSON twin of users.csv — same corporate-only gate for the same fields.
router.get("/users.json", authorize("corporate_manager"), exportUsersJson);

// ── GET /exports/attendance.json ─────────────────────────────────────────────
// JSON twin of attendance.csv — same role scoping and windowing.
router.get(
  "/attendance.json",
  authorize(...ATTENDANCE_READ_ROLES),
  validateQuery(listAttendanceSchema),
  exportAttendanceJson
);

export default router;
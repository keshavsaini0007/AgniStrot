import { Types } from "mongoose";
import type { Request } from "express";
import type { UserRole } from "../types/index.js";

// ── Roles allowed to view the alerts list ──────────────────────────────────
export const ALERT_ROLES: readonly UserRole[] = [
  "mine_official",
  "corporate_manager",
  "regulator",
];

// ── Scope filter built from the authenticated user ─────────────────────────
// Returns a MongoDB filter scoped to what the user is allowed to see.
//
// mine_official  → only data at their site
// field_officer  → only their own submissions
// corporate/regulator → no filter (all data)

type ScopeFilter = {
  siteId?: Types.ObjectId;
  inspectorId?: Types.ObjectId;
  reportedBy?: Types.ObjectId;
};

export function buildScope(
  req: Request,
  resource: "inspection" | "incident"
): ScopeFilter {
  const user = req.user;

  if (!user) return {};

  switch (user.role) {
    case "mine_official":
      return user.siteId
        ? { siteId: new Types.ObjectId(user.siteId) }
        : {};

    case "field_officer":
      return resource === "inspection"
        ? { inspectorId: new Types.ObjectId(user.id) }
        : { reportedBy: new Types.ObjectId(user.id) };

    case "corporate_manager":
    case "regulator":
      return {};

    default:
      return {};
  }
}

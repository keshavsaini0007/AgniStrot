import { Types } from "mongoose";
import type { Request } from "express";
import type { UserRole } from "../types/index.js";

// ── Roles allowed to view the alerts list ──────────────────────────────────
export const ALERT_ROLES: readonly UserRole[] = [
  "mine_official",
  "corporate_manager",
  "regulator",
];

// ── Deny-by-default sentinel ─────────────────────────────────────────────────
// A 24-hex ObjectId that never matches any real document. Site-scoped roles with
// no site binding get this instead of an empty filter — an empty filter would
// match EVERYTHING, leaking all sites' data to an unbound official.

const IMPOSSIBLE_ID = new Types.ObjectId("000000000000000000000000");

// ── Scope filter built from the authenticated user ─────────────────────────
// Returns a MongoDB filter scoped to what the user is allowed to see.
//
// mine_official  → only data at their site (none if the site is unbound)
// field_officer  → only their own submissions
// corporate/regulator → no filter (all data)

export type ScopeResource = "inspection" | "incident" | "alert";

type ScopeFilter = {
  siteId?: Types.ObjectId;
  inspectorId?: Types.ObjectId;
  reportedBy?: Types.ObjectId;
};

export function buildScope(
  req: Request,
  resource: ScopeResource
): ScopeFilter {
  const user = req.user;

  if (!user) return {};

  switch (user.role) {
    case "mine_official":
      // Deny-by-default: an official with no site binding sees no site data.
      return user.siteId
        ? { siteId: new Types.ObjectId(user.siteId) }
        : { siteId: IMPOSSIBLE_ID };

    case "field_officer":
      if (resource === "inspection") return { inspectorId: new Types.ObjectId(user.id) };
      if (resource === "incident") return { reportedBy: new Types.ObjectId(user.id) };
      // alerts have no inspector concept — fail closed if ever granted
      return { inspectorId: IMPOSSIBLE_ID };

    case "corporate_manager":
    case "regulator":
      return {};

    default:
      return {};
  }
}
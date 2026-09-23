import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import type { JwtPayload, UserRole } from "../types/index.js";

// ── Extend Express Request to carry decoded user ───────────────────────────
// After `authenticate` runs, req.user is guaranteed to exist on the request.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── verifyToken ─────────────────────────────────────────────────────────────
// Shared token verification — used by Express `authenticate` and by the
// Socket.io handshake middleware. Returns the decoded payload or null.

export const verifyToken = (token: string): JwtPayload | null => {
  const secret = process.env.JWT_SECRET;

  if (!secret) return null;

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
};

// ── authenticate ───────────────────────────────────────────────────────────
// Verifies the JWT from the Authorization header, then RE-READS the user from
// the database. This is the live-enforcement gate for account management
// (feature 07):
//   - a deactivated user (isActive: false) is rejected on EVERY request — the
//     token is revoked the moment an admin flips the account off;
//   - role + siteId claims come from the DB, so a role/site change applies to
//     already-issued tokens immediately (no waiting for expiry).
// Cost: one lightweight read per authenticated request — acceptable at this
// scale; a short-TTL cache is the documented escape hatch if it ever matters.
// Must run before any route handler that needs to know who the user is.

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Malformed authorization header." });
    return;
  }

  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  try {
    const dbUser = await User.findById(user.id).select("_id isActive role siteId").lean();

    // Non-leaky: missing and deactivated accounts look identical to the caller.
    if (!dbUser || dbUser.isActive === false) {
      res.status(401).json({ error: "Account is not active." });
      return;
    }

    // Authoritative claims from the DB, not the (possibly stale) token.
    req.user = {
      id: (dbUser._id as unknown as string).toString(),
      role: dbUser.role,
      siteId: dbUser.siteId ? (dbUser.siteId as unknown as string).toString() : null,
    };

    next();
  } catch (err) {
    console.error("[auth] authenticate failed:", err);
    res.status(500).json({ error: "Internal server error." });
    return;
  }
};

// ── authorize ──────────────────────────────────────────────────────────────
// Role guard — pass the roles allowed to access a route.
// Returns a middleware function that blocks anyone not in the allowed list.
//
// Usage:
//   router.get("/dashboard", authenticate, authorize("mine_official", "corporate_manager"), handler)

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res
        .status(403)
        .json({ error: `Access denied. Required role: ${allowedRoles.join(" or ")}.` });
      return;
    }

    next();
  };
};

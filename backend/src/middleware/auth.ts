import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
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

// ── authenticate ───────────────────────────────────────────────────────────
// Verifies the JWT from the Authorization header.
// Attaches decoded payload to req.user.
// Must run before any route handler that needs to know who the user is.

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET missing." });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
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

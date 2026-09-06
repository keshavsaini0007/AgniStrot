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

  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  req.user = user;
  next();
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

import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import type { JwtPayload, UserRole } from "../types/index.js";

// ── POST /api/v1/auth/login ─────────────────────────────────────────────────
// Returns a JWT token and user info for valid credentials.

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET missing." });
    return;
  }

  const payload: JwtPayload = {
    id: user._id.toString(),
    role: user.role,
    siteId: user.siteId ? user.siteId.toString() : null,
  };

  const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      siteId: user.siteId,
    },
  });
};

// ── POST /api/v1/auth/register ──────────────────────────────────────────────
// Creates a new user. In production this would be admin-only;
// for the hackathon demo it's open so the seed script and judges can create users.

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, siteId } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    siteId?: string | null;
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Name, email, password, and role are required." });
    return;
  }

  // Check for duplicate email
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists." });
    return;
  }

  // Create user — pre-save hook hashes the password automatically
  const user = await User.create({
    name,
    email,
    passwordHash: password, // pre-save hook will hash this
    role,
    siteId: siteId ?? null,
  } as Parameters<typeof User.create>[0]);

  res.status(201).json({
    id: user._id,
    name: user.name,
    role: user.role,
  });
};

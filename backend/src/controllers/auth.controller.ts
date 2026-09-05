import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import type { JwtPayload } from "../types/index.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validator.js";

// ── POST /api/v1/auth/login ─────────────────────────────────────────────────
// req.body is pre-validated by loginSchema via validate() middleware.

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await User.findOne({ email });
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
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/auth/register ──────────────────────────────────────────────
// Protected: only corporate_manager can create new users (enforced in routes).
// req.body is pre-validated by registerSchema via validate() middleware.

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, siteId } = req.body as RegisterInput;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists." });
      return;
    }

    // passwordHash receives the plain password — pre-save hook hashes it
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role,
      siteId: siteId ?? null,
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

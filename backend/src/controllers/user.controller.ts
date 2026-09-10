import type { Request, Response } from "express";
import User from "../models/User.js";

// ── GET /api/v1/users ─────────────────────────────────────────────────────────
// User directory for corporate managers (route-enforced). Powers the real
// "Users / Add Field Officer" screen. Passwords are never exposed.

export const listUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("name email role siteId createdAt")
      .lean();

    res.json({
      data: users.map((u) => ({
        id: (u._id as unknown as string).toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        siteId: u.siteId ? (u.siteId as unknown as string).toString() : null,
        status: "active",
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
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


// ── PUT /api/v1/users/me ─────────────────────────────────────────────────────────
// Update own profile (name only - email/role changes require admin intervention).
// Notification preferences can be added here in the future.

export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required." });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      siteId: user.siteId?.toString() || null,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

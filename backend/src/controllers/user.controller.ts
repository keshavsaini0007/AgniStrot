import type { Request, Response } from "express";
import { Types } from "mongoose";
import User from "../models/User.js";
import { logAction } from "../services/auditLogger.js";
import type { UpdateUserInput } from "../validators/users.validator.js";

// ── GET /api/v1/users ─────────────────────────────────────────────────────────
// User directory for corporate managers (route-enforced). Powers the real
// "Users" screen: role/status/q filters plus the true account status
// (isActive → active/inactive — never hardcoded). Passwords are never exposed.

export const listUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role, status, q } = req.query as {
      role?: string;
      status?: string;
      q?: string;
    };

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (q && q.trim().length > 0) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("name email role siteId isActive createdAt")
      .lean();

    res.json({
      data: users.map((u) => ({
        id: (u._id as unknown as string).toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        siteId: u.siteId ? (u.siteId as unknown as string).toString() : null,
        status: u.isActive ? "active" : "inactive",
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


// ── PATCH /api/v1/users/:id ───────────────────────────────────────────────────
// Admin user management (feature 07): corporate managers change another user's
// name/role/site/status. Guards:
//   - self-edit is forbidden (use PUT /users/me for your own name) — prevents
//     self-lockout, self-demotion and self-privilege change;
//   - site-scoped roles (field_officer/mine_official) MUST have a siteId;
//   - switching to corporate_manager/regulator clears siteId to null;
//   - email is immutable (schema strips it);
//   - every mutation is audit-logged with before/after claims.
// Deactivation (status: inactive) revokes live sessions because `authenticate`
// re-reads isActive from the DB on every request.

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const actor = req.user!;
    const userId = req.params.id as string;

    if (!/^[a-f\d]{24}$/i.test(userId)) {
      res.status(400).json({ error: "Invalid user id." });
      return;
    }

    if (userId === actor.id) {
      res.status(400).json({
        error: "You cannot edit your own account here. Use the profile settings instead.",
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const { name, role, siteId, status } = req.body as UpdateUserInput;

    // ── role ↔ site consistency (mirrors /auth/register) ───────────────────
    const targetRole = role ?? user.role;
    const siteScoped = targetRole === "mine_official" || targetRole === "field_officer";
    const nextSiteId =
      siteId !== undefined
        ? siteId === null
          ? null
          : siteId
        : user.siteId
          ? (user.siteId as unknown as string).toString()
          : null;

    if (siteScoped && !nextSiteId) {
      res.status(400).json({ error: `siteId is required for role "${targetRole}".` });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.isActive = status === "active";
    // Non-site-scoped roles are never bound to a site; clearing on transition.
    updates.siteId = siteScoped ? nextSiteId : null;

    const updated = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("name email role siteId isActive createdAt");

    if (!updated) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // ── tamper-evident audit: who changed what, before → after ─────────────
    const before = {
      name: user.name,
      role: user.role,
      siteId: user.siteId ? (user.siteId as unknown as string).toString() : null,
      isActive: user.isActive ?? true,
    };
    const after = {
      name: updated.name,
      role: updated.role,
      siteId: updated.siteId ? (updated.siteId as unknown as string).toString() : null,
      isActive: updated.isActive,
    };
    void logAction({
      entityType: "user",
      entityId: user._id,
      action: "updated",
      actorId: new Types.ObjectId(actor.id),
      payload: { before, after, changed: Object.keys(updates) },
    }).catch((err) => {
      console.error("[audit] user update entry failed:", err);
    });

    res.json({
      id: updated._id.toString(),
      name: updated.name,
      email: updated.email,
      role: updated.role,
      siteId: updated.siteId ? (updated.siteId as unknown as string).toString() : null,
      status: updated.isActive ? "active" : "inactive",
      createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
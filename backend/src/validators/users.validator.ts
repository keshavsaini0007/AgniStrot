import { z } from "zod";

// ── PATCH /api/v1/users/:id ─────────────────────────────────────────────────
// Admin user management (feature 07). Email is intentionally NOT in the schema
// — the `validate` middleware strips unknown fields, so an email in the body is
// silently ignored (identity is immutable; role/site/status are what admins
// govern). At least one mutable field must be supplied.

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80).optional(),
    role: z
      .enum(["field_officer", "mine_official", "corporate_manager", "regulator"])
      .optional(),
    siteId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "siteId must be a valid MongoDB ObjectId.")
      .nullable()
      .optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.name === undefined &&
      values.role === undefined &&
      values.siteId === undefined &&
      values.status === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["role"],
        message: "At least one field (name, role, siteId, status) must be provided.",
      });
    }
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ── GET /api/v1/users query filters ─────────────────────────────────────────
export const listUsersSchema = z.object({
  role: z
    .enum(["field_officer", "mine_official", "corporate_manager", "regulator"])
    .optional(),
  status: z.enum(["active", "inactive"]).optional(),
  q: z.string().trim().max(80).optional(),
});
import { z } from "zod";

// ── Login schema ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Must be a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Register schema ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must not exceed 100 characters.")
    .trim(),

  email: z.string().email("Must be a valid email address."),

  password: z.string().min(8, "Password must be at least 8 characters."),

  role: z.enum([
    "field_officer",
    "mine_official",
    "corporate_manager",
    "regulator",
  ]),

  siteId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "siteId must be a valid MongoDB ObjectId.")
    .nullable()
    .optional()
    .default(null),
});

export type RegisterInput = z.infer<typeof registerSchema>;

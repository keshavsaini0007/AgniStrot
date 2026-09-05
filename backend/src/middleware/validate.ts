import type { Request, Response, NextFunction } from "express";
import { type ZodSchema } from "zod";

// ── Generic Zod validation middleware factory ────────────────────────────────
// Usage:
//   router.post("/login", validate(loginSchema), loginHandler)
//
// On success: calls next() — req.body is now the Zod-parsed (safe, typed) value
// On failure: returns 400 with structured field-level errors

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      res.status(400).json({ error: "Validation failed.", details: errors });
      return;
    }

    // Replace req.body with the parsed (safe) value
    // Strips unknown fields — prevents field injection by default
    req.body = result.data;
    next();
  };

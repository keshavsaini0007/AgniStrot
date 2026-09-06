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

// ── Query validation middleware ──────────────────────────────────────────────
// Same pattern but validates req.query instead of req.body.

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      res.status(400).json({ error: "Query validation failed.", details: errors });
      return;
    }

    // Merge the parsed (safe) value into req.query. Express 5 defines req.query
    // as a getter-only property — reassigning it throws TypeError, so we mutate
    // the existing object in place (coerced values + defaults overwrite originals).
    Object.assign(
      req.query as Record<string, unknown>,
      result.data as Record<string, unknown>
    );
    next();
  };

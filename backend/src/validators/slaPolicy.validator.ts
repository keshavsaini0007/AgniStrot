import { z } from "zod";

// ── SlaPolicy mutation body ───────────────────────────────────────────────────
// PUT /api/v1/sla-policies/:severity — full upsert for one severity.
// The severity comes from the URL param; the body carries the SLA definition.
// Validation mirrors the model's pre-validate hook so bad configs are rejected
// with structured 400s at the API edge (and the DB hook stays as backstop).

const OBJECT_ID = /^[a-f\d]{24}$/i;

const escalationLevelSchema = z
  .object({
    level: z.number().int().min(1, "level must be >= 1."),
    role: z.enum(["mine_official", "corporate_manager", "regulator"], {
      message: "role must be mine_official, corporate_manager or regulator.",
    }),
    waitMinutes: z
      .number()
      .int()
      .min(1, "waitMinutes must be >= 1."),
  })
  .strict();

export const slaPolicyUpsertSchema = z
  .object({
    ackSla: z
      .number()
      .int()
      .min(1, "ackSla must be >= 1.")
      .max(525600, "ackSla cannot exceed 1 year (525600 minutes)."),
    resolutionSla: z
      .number()
      .int()
      .min(1, "resolutionSla must be >= 1.")
      .max(525600, "resolutionSla cannot exceed 1 year (525600 minutes)."),
    escalationChain: z
      .array(escalationLevelSchema)
      .min(1, "escalationChain must contain at least 1 level.")
      .max(5, "escalationChain cannot contain more than 5 levels."),
    systemFallbackUserId: z
      .string()
      .regex(OBJECT_ID, "systemFallbackUserId must be a valid 24-char ObjectId.")
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Resolution deadline must cover the acknowledge deadline.
    if (data.resolutionSla < data.ackSla) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionSla"],
        message: "resolutionSla must be >= ackSla.",
      });
    }

    // Circular-safe ladder: unique roles, contiguous levels, increasing waits.
    const chain = data.escalationChain;
    const seenRoles = new Set<string>();
    for (let i = 0; i < chain.length; i++) {
      const step = chain[i];
      if (!step) continue;

      if (step.level !== i + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["escalationChain", i, "level"],
          message: `Levels must be contiguous starting at 1 (expected ${i + 1}, got ${step.level}).`,
        });
      }

      if (seenRoles.has(step.role)) {
        ctx.addIssue({
          code: "custom",
          path: ["escalationChain", i, "role"],
          message: `Escalation chain repeats role "${step.role}" — circular escalation is not allowed.`,
        });
      }
      seenRoles.add(step.role);

      if (i > 0 && step.waitMinutes <= (chain[i - 1]?.waitMinutes ?? 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["escalationChain", i, "waitMinutes"],
          message: "waitMinutes must be strictly increasing across levels.",
        });
      }
    }

    // The ladder must complete before the resolution deadline.
    const last = chain[chain.length - 1];
    if (last && last.waitMinutes > data.resolutionSla) {
      ctx.addIssue({
        code: "custom",
        path: ["escalationChain"],
        message: "The last escalation level must not exceed the resolution SLA.",
      });
    }
  });

export type SlaPolicyUpsertInput = z.infer<typeof slaPolicyUpsertSchema>;

// ── Severity path param ───────────────────────────────────────────────────────

export const slaPolicySeveritySchema = z.enum(["low", "medium", "high", "critical"]);
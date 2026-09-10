import { z } from "zod";

export const COMPLIANCE_STATES = ["compliant", "non_compliant", "pending", "overdue"] as const;
export type ComplianceState = (typeof COMPLIANCE_STATES)[number];

export const listComplianceSchema = z.object({
  siteId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(COMPLIANCE_STATES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListComplianceQuery = z.infer<typeof listComplianceSchema>;
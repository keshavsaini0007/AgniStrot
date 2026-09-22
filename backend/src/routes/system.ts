import { Router } from "express";
import { authorize } from "../middleware/auth.js";
import { getOutboxHealth } from "../controllers/system.controller.js";

const router = Router();

// ── GET /outbox-health ───────────────────────────────────────────────────────
// Outbox + Dead Letter Queue health. Auth: corporate_manager, regulator.
// Mine_official and field_officer are intentionally blocked — this is an
// oversight/ops view of the automation pipeline, not site data.

router.get("/outbox-health", authorize("corporate_manager", "regulator"), getOutboxHealth);

export default router;
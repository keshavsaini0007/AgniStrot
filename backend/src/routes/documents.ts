import { Router, type RequestHandler } from "express";
import { authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  listDocumentsSchema,
  confirmDocumentSchema,
} from "../validators/document.validator.js";
import {
  ingestDocument,
  listDocuments,
  confirmDocument,
  uploadMiddleware,
} from "../controllers/document.controller.js";

const router = Router();

// ── POST /ingest ─────────────────────────────────────────────────────────────
// Upload paper form image, run OCR, create pending document record.
// Auth: field_officer, mine_official

router.post(
  "/ingest",
  authorize("field_officer", "mine_official"),
  uploadMiddleware,
  ingestDocument as RequestHandler
);

// ── GET / ────────────────────────────────────────────────────────────────────
// List documents with optional filtering by reviewStatus and siteId.
// Auth: mine_official (own site only), corporate_manager, regulator (all sites)

router.get(
  "/",
  authorize("mine_official", "corporate_manager", "regulator"),
  validateQuery(listDocumentsSchema),
  listDocuments as RequestHandler
);

// ── POST /:id/confirm ────────────────────────────────────────────────────────
// Confirm document after human review, merge corrected fields.
// Auth: mine_official (own site only), corporate_manager

router.post(
  "/:id/confirm",
  authorize("mine_official", "corporate_manager"),
  validate(confirmDocumentSchema),
  confirmDocument as RequestHandler
);

export default router;

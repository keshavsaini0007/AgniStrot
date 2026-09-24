import type { Response } from "express";
import { Types } from "mongoose";
import multer from "multer";
import { cloudinary } from "../config/cloudinary.js";
import Document from "../models/Document.js";
import Site from "../models/Site.js";
import { deriveHazardFromOcr, extractFormFields } from "../services/ocrService.js";
import { registerHazard } from "../services/hazardService.js";
import { logAction } from "../services/auditLogger.js";
import {
  buildCloudinaryOriginalUrl,
  createEvidence,
  persistLocalFile,
  sha256Hex,
} from "../services/evidenceService.js";
import {
  emitOutboxEvent,
  processOutboxEvents,
  runInTransaction,
  sessionOption,
} from "../services/outboxService.js";
import type { AuthenticatedRequest } from "../types/index.js";

// ── Document DTO ────────────────────────────────────────────────────────────
// Every other list endpoint maps raw Mongoose docs to a canonical
// `{ id, siteId: string }` shape. Documents list/confirm were returning raw
// docs (`_id`, `__v`, populated `siteId` object) which broke the frontend's
// `OcrDocument` contract — normalize here so the API stays consistent.
type DocumentRow = {
  _id: unknown;
  siteId: unknown;
  sourceImageUrl: string;
  extractedFields?: Record<string, unknown>;
  confidence?: number;
  reviewStatus: string;
  createdAt?: Date;
};

function documentDto(d: DocumentRow) {
  const siteId =
    (d.siteId as unknown as { _id?: unknown })?._id?.toString() ??
    (d.siteId as unknown as string | undefined)?.toString() ??
    "";
  return {
    id: (d._id as unknown as string).toString(),
    siteId,
    sourceImageUrl: d.sourceImageUrl,
    extractedFields: d.extractedFields,
    confidence: d.confidence,
    reviewStatus: d.reviewStatus,
    createdAt: d.createdAt,
  };
}

// ── Multer config ───────────────────────────────────────────────────────────
// Reuse pattern from media.controller.ts — memory storage, 5MB limit, images only.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

export const uploadMiddleware = upload.single("image");

// ── POST /api/v1/documents/ingest ───────────────────────────────────────────
// Uploads paper form image to Cloudinary, runs OCR extraction, creates pending
// document record. Field officers and mine officials can ingest documents for
// their site only.

export const ingestDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    // Snapshot the filename once — `req.file` can't be narrowed inside the
    // transaction closure below (feature 05 evidence uses it too).
    const originalFileName = req.file.originalname;

    // Extract and validate siteId from request body. The caller's assigned site
    // (from the JWT) is used as a default when the body omits it — the web client
    // always knows its own site, so field officers/mine officials can ingest
    // without repeating the id in the multipart payload.
    const { siteId: bodySiteId } = req.body;
    let siteId = bodySiteId && typeof bodySiteId === "string" ? bodySiteId : "";

    if (!siteId && req.user.siteId) {
      siteId = String(req.user.siteId);
    }

    if (!siteId || !/^[a-f\d]{24}$/i.test(siteId)) {
      res.status(400).json({ error: "Valid siteId is required." });
      return;
    }

    // Verify site exists
    const site = await Site.findById(siteId);
    if (!site) {
      res.status(404).json({ error: "Site not found." });
      return;
    }

    // Role-based access control: mine_official can only ingest for their site
    if (req.user.role === "mine_official") {
      if (!req.user.siteId || String(req.user.siteId) !== siteId) {
        res.status(403).json({ error: "Access denied. You can only ingest documents for your assigned site." });
        return;
      }
    }

    // Resolve the OCR source and the persisted image reference. Production uses
    // Cloudinary (upload the file, OCR from the hosted URL). Setting
    // CLOUDINARY_ENABLED=false makes the flow fully self-contained for demos and
    // tests: OCR runs straight from the upload buffer and a local:// reference is
    // stored instead of a hosted URL.
    //
    // Feature 05 (evidence integrity): the SHA-256 of the EXACT bytes received
    // (edge F/G3) is computed here, before storage, and the evidence row is
    // created inside the same transaction as the Document — a document can never
    // exist without its evidence attestation.
    const evidenceId = new Types.ObjectId();
    const contentHash = sha256Hex(req.file.buffer);
    let sourceImageUrl: string;
    let ocrTarget: string | Buffer;
    let verificationSource = "";
    let verificationSourceKind: "url" | "file" = "url";

    if (process.env.CLOUDINARY_ENABLED === "false") {
      // Sanitize + namespace the original filename so the placeholder is stable.
      const safeName = originalFileName.replace(/[^\w.-]/g, "_");
      sourceImageUrl = `local://${Date.now().toString(36)}-${safeName}`;
      ocrTarget = req.file.buffer;
      // Persist the exact buffer — verification re-reads the SAME bytes later.
      verificationSource = await persistLocalFile(
        evidenceId,
        req.file.buffer,
        originalFileName
      );
      verificationSourceKind = "file";
      console.log(`Running OCR on uploaded buffer (local mode): ${sourceImageUrl}`);
    } else {
      // Upload image to Cloudinary
      const cloudinaryResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "agnistrot/documents" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result as CloudinaryUploadResult);
          }
        );
        stream.end(req.file!.buffer);
      });

      sourceImageUrl = cloudinaryResult.secure_url;
      ocrTarget = sourceImageUrl;
      // Verify against the untransformed ORIGINAL, not the delivered URL (edge G1).
      verificationSource = buildCloudinaryOriginalUrl(cloudinaryResult.public_id);
      console.log(`Running OCR on image: ${sourceImageUrl}`);
    }

    // Run OCR extraction
    const ocrResult = await extractFormFields(ocrTarget);

    // Create document record + domain event transactionally (Transactional
    // Outbox — a document that exists must never lose its automation event).
    // The upload dedupes on the OCR confidence payload via DOCUMENT_UPLOADED.
    const { document, autoRegisteredHazardId } = await runInTransaction(async (session) => {
      const [doc] = await Document.create(
        [
          {
            siteId: new Types.ObjectId(siteId),
            sourceImageUrl,
            extractedFields: ocrResult.extractedFields,
            confidence: ocrResult.confidence,
            reviewStatus: "pending",
          },
        ],
        { ...sessionOption(session) }
      );
      if (!doc) throw new Error("Document creation returned no result.");

      await emitOutboxEvent(
        {
          type: "DOCUMENT_UPLOADED",
          aggregateType: "document",
          aggregateId: doc._id,
          siteId: new Types.ObjectId(siteId),
          actorId: new Types.ObjectId(req.user.id),
          payload: {
            sourceImageUrl,
            confidence: ocrResult.confidence,
            reviewStatus: "pending",
          },
        },
        session
      );

      // Feature 05: document + evidence attestation commit atomically — a
      // document can never exist without its integrity record (edge G).
      await createEvidence(
        {
          _id: evidenceId,
          sourceType: "document",
          sourceRecordId: doc._id,
          siteId: new Types.ObjectId(siteId),
          fileUrl: sourceImageUrl,
          verificationSource,
          verificationSourceKind,
          contentHash,
          fileName: originalFileName,
          uploadedBy: new Types.ObjectId(req.user.id),
          integrityStatus: "unverified",
        },
        session
      );

      // Feature 06 OCR: a hazard-form scan auto-captures a register row —
      // same transaction, so document + evidence + hazard + the outbox event
      // commit (or roll back) atomically. deriveHazardFromOcr is the
      // deterministic boundary: thin / low-confidence scans return null and
      // stay pending for manual review instead of minting a junk row.
      let autoRegisteredHazardId: Types.ObjectId | null = null;
      if (ocrResult.extractedFields?.formType === "hazard") {
        const hazardData = deriveHazardFromOcr(
          ocrResult.rawText,
          ocrResult.extractedFields,
          ocrResult.confidence
        );
        if (hazardData) {
          const hazard = await registerHazard({
            siteId: new Types.ObjectId(siteId),
            title: hazardData.title,
            description: hazardData.description,
            likelihood: hazardData.likelihood,
            consequence: hazardData.consequence,
            actor: new Types.ObjectId(req.user.id),
            sourceDocumentId: doc._id,
            session,
            deferAudit: true, // audit written after commit, below
          });
          autoRegisteredHazardId = hazard._id;
        }
      }

      return { document: doc, autoRegisteredHazardId };
    });

    // Kick the outbox worker so the DOCUMENT_UPLOADED consumer runs promptly.
    void processOutboxEvents().catch((err) => {
      console.error("[outbox] Worker kick failed:", err);
    });

    // Log audit trail entry
    await logAction({
      entityType: "document",
      entityId: document._id,
      action: "ingested",
      actorId: new Types.ObjectId(req.user.id),
      payload: { confidence: ocrResult.confidence },
    });

    // Feature 06 OCR audit — written AFTER commit so a rolled-back transaction
    // can never leave an orphaned "registered" row on the tamper-proof chain.
    // The skipped case is audited too: the document stayed pending for manual
    // review, which is itself a decision that must be traceable.
    if (autoRegisteredHazardId) {
      await logAction({
        entityType: "hazard",
        entityId: autoRegisteredHazardId,
        action: "registered_via_ocr",
        actorId: new Types.ObjectId(req.user.id),
        payload: {
          documentId: document._id,
          siteId,
          sourceType: "ocr",
        },
      });
    } else if (ocrResult.extractedFields?.formType === "hazard") {
      await logAction({
        entityType: "document",
        entityId: document._id,
        action: "hazard_auto_register_skipped",
        actorId: new Types.ObjectId(req.user.id),
        payload: { siteId, reason: "insufficient OCR evidence" },
      });
    }

    res.status(201).json({
      data: {
        id: document._id,
        documentId: document._id,
        sourceImageUrl: document.sourceImageUrl,
        extractedFields: document.extractedFields,
        confidence: document.confidence,
        reviewStatus: document.reviewStatus,
        ...(autoRegisteredHazardId ? { hazardId: autoRegisteredHazardId } : {}),
      },
      warning: ocrResult.confidence < 0.5
        ? "Low OCR confidence detected. Manual review recommended."
        : undefined,
    });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error("Document ingestion error:", errorDetails);
    res.status(500).json({ error: "Document ingestion failed.", details: errorDetails });
  }
};

// ── GET /api/v1/documents ───────────────────────────────────────────────────
// Lists documents with role-based scoping and optional filtering by reviewStatus.

export const listDocuments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const query = req.query as {
      siteId?: string;
      reviewStatus?: "pending" | "confirmed" | "rejected";
      page?: number;
      limit?: number;
    };

    const { siteId, reviewStatus, page = 1, limit = 20 } = query;

    // Coerce to numbers (validateQuery already coerced, but ensure type safety)
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Role-based access control
    if (req.user.role === "field_officer") {
      res.status(403).json({ error: "Access denied. Field officers cannot review documents." });
      return;
    }

    // Build filter based on role
    const filter: Record<string, unknown> = {};

    if (req.user.role === "mine_official") {
      // Mine officials can only see documents for their site
      if (!req.user.siteId) {
        res.status(403).json({ error: "Access denied. No site assigned." });
        return;
      }
      filter.siteId = new Types.ObjectId(req.user.siteId);
    } else if (siteId) {
      // Corporate managers and regulators can optionally filter by siteId
      filter.siteId = new Types.ObjectId(siteId);
    }

    // Apply reviewStatus filter if provided
    if (reviewStatus) {
      filter.reviewStatus = reviewStatus;
    }

    // Paginate results
    const skip = (pageNum - 1) * limitNum;
    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate("siteId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Document.countDocuments(filter),
    ]);

    res.json({
      data: documents.map(documentDto),
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("List documents error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/documents/:id/confirm ──────────────────────────────────────
// Confirms a document after human review, merging corrected fields and updating
// review status. Mine officials can only confirm documents for their site.

export const confirmDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;

    // Validate ObjectId format
    if (!id || typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
      res.status(400).json({ error: "Invalid document ID." });
      return;
    }

    // Fetch document
    const document = await Document.findById(id);
    if (!document) {
      res.status(404).json({ error: "Document not found." });
      return;
    }

    // Role-based access control: mine_official can only confirm their site's documents
    if (req.user.role === "mine_official") {
      if (!req.user.siteId || document.siteId.toString() !== req.user.siteId) {
        res.status(403).json({ error: "Access denied. You can only confirm documents for your assigned site." });
        return;
      }
    }

    // Merge corrected fields and update review status
    const { correctedFields, reviewStatus = "confirmed" } = req.body as {
      correctedFields: Record<string, unknown>;
      reviewStatus?: "confirmed" | "rejected";
    };

    document.extractedFields = {
      ...document.extractedFields,
      ...correctedFields,
    };
    document.reviewStatus = reviewStatus;

    await document.save();

    // Log audit trail entry
    await logAction({
      entityType: "document",
      entityId: document._id,
      action: "confirmed",
      actorId: new Types.ObjectId(req.user.id),
      payload: { reviewStatus: document.reviewStatus },
    });

    res.json({
      data: documentDto(document),
    });
  } catch (err) {
    console.error("Confirm document error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── Cloudinary response type (subset) ───────────────────────────────────────

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

import { Schema, model } from "mongoose";
import type { IDocument } from "../types/index.js";

// ── NOTE: Stretch Goal ─────────────────────────────────────────────────────
// This model is only used if the OCR ingestion feature (FR9) is built.
// It is defined now so the schema exists when needed — no routes or services
// reference it until Phase 5 of the build plan.

const documentSchema = new Schema<IDocument>(
  {
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "siteId is required."],
    },
    sourceImageUrl: {
      type: String,
      required: [true, "sourceImageUrl is required."],
      // Cloudinary URL of the uploaded paper form photo
    },
    extractedFields: {
      type: Schema.Types.Mixed,
      default: null,
      // structured fields extracted by Tesseract.js OCR
      // e.g. { inspectionType: "safety", date: "2026-09-04", violations: ["..." ] }
    },
    confidence: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
      // overall OCR confidence score between 0 and 1
      // fields with low confidence are flagged for manual review
    },
    reviewStatus: {
      type: String,
      default: "pending",
      enum: {
        values: ["pending", "confirmed", "rejected"],
        message: "{VALUE} is not a valid review status.",
      },
      // pending  = extracted, not yet reviewed by a user
      // confirmed = user verified the extracted fields are correct
      // rejected  = extraction failed, user dismissed it
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Index ──────────────────────────────────────────────────────────────────
// Query: "show me all pending OCR documents for this site"
documentSchema.index({ siteId: 1, reviewStatus: 1 });

const Document = model<IDocument>("Document", documentSchema);

export default Document;

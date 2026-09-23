import { Schema, model } from "mongoose";
import type { IEvidence } from "../types/index.js";

// ── Feature 05: Evidence Integrity ───────────────────────────────────────────
// One row per uploaded file (OCR document or media photo). contentHash is the
// SHA-256 of the exact bytes STORED (Cloudinary master or the local disk file) —
// the evidence fingerprint. fileUrl is display-only; verification re-reads
// verificationSource (untransformed original URL or local path) and compares
// against contentHash. Rows are truthful attestations of uploads: a failed
// upload is recorded as UPLOAD_FAILED (never a silent success — edge G), and a
// row with no contentHash stays "unverified" (never silently valid — edge H).

const evidenceSchema = new Schema<IEvidence>(
  {
    sourceType: {
      type: String,
      required: [true, "sourceType is required."],
      enum: {
        values: ["document", "media"],
        message: "{VALUE} is not a valid evidence source type.",
      },
    },
    sourceRecordId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "siteId is required."],
    },
    fileUrl: {
      type: String,
      required: [true, "fileUrl is required."],
      // display URL (Cloudinary secure_url or local-mode placeholder). The URL
      // is NOT the integrity identity — two rows can share contentHash (edge C).
    },
    verificationSource: {
      type: String,
      required: [true, "verificationSource is required."],
      // untransformed Cloudinary original URL (kind "url") OR absolute local
      // disk path of the persisted upload (kind "file"). Never the display URL —
      // Cloudinary auto-transform (quality/fetch_format) would false-positive
      // because transformed bytes != stored master bytes (edge G1).
    },
    verificationSourceKind: {
      type: String,
      required: [true, "verificationSourceKind is required."],
      enum: {
        values: ["url", "file"],
        message: "{VALUE} is not a valid verification source kind.",
      },
    },
    contentHash: {
      type: String,
      default: null,
      // SHA-256 hex of the stored bytes — the evidence fingerprint (edge C).
      // Absent on rows where hashing failed (edge H) → stays "unverified".
    },
    fileName: { type: String, default: null },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "uploadedBy is required."],
    },
    uploadedAt: { type: Date, required: [true, "uploadedAt is required."] },
    integrityStatus: {
      type: String,
      default: "unverified",
      enum: {
        values: [
          "UPLOAD_PENDING",
          "UPLOAD_FAILED",
          "unverified",
          "verified",
          "INTEGRITY_MISMATCH",
          "unavailable",
        ],
        message: "{VALUE} is not a valid integrity status.",
      },
    },
    verificationNote: { type: String, default: null },
    checkCount: { type: Number, default: 0 },
    lastVerifiedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Query: "evidence for a site by status" (dashboard) + "same content across
// rows" (duplicate/twin detection — edges A/E).
evidenceSchema.index({ siteId: 1, integrityStatus: 1 });
evidenceSchema.index({ contentHash: 1 });

const Evidence = model<IEvidence>("Evidence", evidenceSchema);

export default Evidence;
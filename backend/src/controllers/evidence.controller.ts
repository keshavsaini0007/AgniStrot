import type { Response } from "express";
import { Types } from "mongoose";
import Evidence from "../models/Evidence.js";
import Document from "../models/Document.js";
import { verifyAllEvidence, verifyEvidence } from "../services/evidenceService.js";
import type { ListEvidenceQuery } from "../validators/query.validator.js";
import type { AuthenticatedRequest } from "../types/index.js";

// ── Feature 05: Evidence Integrity controller ────────────────────────────────
// Read/verify surface for the evidence-attestation rows written at ingest.
// Identity is contentHash (never the URL — edge C); a row's status flips ONLY
// from a live hash comparison over the stored bytes (edge B) or an unreadable
// source (unavailable — edge G). Legacy sources with no hash stay unverified
// (edge H / G2) — they are counted as "no baseline", never as tampered.

const objectIdRegex = /^[a-f\d]{24}$/i;

// Deny-by-default sentinel (mirrors utils/roleScope.ts): a mine_official with no
// site binding sees no evidence at all.
const IMPOSSIBLE_ID = new Types.ObjectId("000000000000000000000000");

// Role scoping: mine_official → own site only; corporate/regulator → all sites.
function scopeFilter(req: AuthenticatedRequest, siteIdOverride?: string): Record<string, unknown> {
  if (req.user.role === "mine_official") {
    return req.user.siteId
      ? { siteId: new Types.ObjectId(req.user.siteId) }
      : { siteId: IMPOSSIBLE_ID };
  }
  if (siteIdOverride) {
    return { siteId: new Types.ObjectId(siteIdOverride) };
  }
  return {};
}

// ── Row DTO ─────────────────────────────────────────────────────────────────
// uploadedBy is populated to a display name (UI contract, detail-page pattern);
// siteId stays a plain id string. duplicateCount is the informational
// "same binary content detected" signal (edges A/E) — never a fraud label.

type EvidenceRow = {
  _id: Types.ObjectId;
  sourceRecordId?: unknown;
  siteId: unknown;
  uploadedBy?: unknown;
  fileUrl: string;
  fileName?: string | null;
  contentHash?: string | null;
  uploadedAt: Date;
  integrityStatus: string;
  verificationNote?: string | null;
  checkCount: number;
  lastVerifiedAt?: Date | null;
  createdAt: Date;
  duplicateCount: number;
};

function evidenceDto(r: EvidenceRow) {
  const siteId =
    (r.siteId as unknown as { _id?: unknown })?._id?.toString() ??
    (r.siteId as unknown as string | undefined)?.toString() ??
    "";
  const uploadedByName =
    (r.uploadedBy as unknown as { name?: string } | undefined)?.name ?? "";
  return {
    id: (r._id as unknown as string).toString(),
    sourceType: "sourceType" in r ? (r as unknown as { sourceType: string }).sourceType : "media",
    sourceRecordId: r.sourceRecordId
      ? (r.sourceRecordId as unknown as string).toString()
      : null,
    siteId,
    fileUrl: r.fileUrl,
    fileName: r.fileName ?? null,
    contentHash: r.contentHash ?? null,
    uploadedByName,
    uploadedAt: r.uploadedAt,
    integrityStatus: r.integrityStatus,
    verificationNote: r.verificationNote ?? null,
    checkCount: r.checkCount,
    lastVerifiedAt: r.lastVerifiedAt ?? null,
    createdAt: r.createdAt,
    duplicateCount: r.duplicateCount,
  };
}

// ── GET /api/v1/evidence ─────────────────────────────────────────────────────
// Paginated list with role scope + optional status/siteId filter + per-row
// duplicate (same contentHash) counts.

export const listEvidence = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListEvidenceQuery;
    const filter = scopeFilter(req, q.siteId);
    if (q.status) filter.integrityStatus = q.status;

    const skip = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      Evidence.find(filter)
        .populate("uploadedBy", "name")
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(q.limit)
        .lean() as Promise<unknown[]>,
      Evidence.countDocuments(filter),
    ]);

    const withTwins = await Promise.all(
      (rows as EvidenceRow[]).map(async (r) => ({
        ...r,
        duplicateCount: r.contentHash
          ? await Evidence.countDocuments({
              contentHash: r.contentHash,
              _id: { $ne: r._id },
            })
          : 0,
      }))
    );

    res.json({
      data: withTwins.map(evidenceDto),
      total,
      page: q.page,
      limit: q.limit,
    });
  } catch (err) {
    console.error("List evidence error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── GET /api/v1/evidence/dashboard ───────────────────────────────────────────
// Counts for the Evidence Integrity dashboard: total / checked (live checks
// attempted) / verified / INTEGRITY_MISMATCH / unverified / unavailable /
// UPLOAD_FAILED, plus noBaseline = source documents that predate feature 05 and
// carry no evidence row (❔ — never tampered).

export const evidenceDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListEvidenceQuery;
    const scope = scopeFilter(req, q.siteId);

    const [total, verified, mismatched, unverified, unavailable, uploadFailed, uploadPending] =
      await Promise.all([
        Evidence.countDocuments(scope),
        Evidence.countDocuments({ ...scope, integrityStatus: "verified" }),
        Evidence.countDocuments({ ...scope, integrityStatus: "INTEGRITY_MISMATCH" }),
        Evidence.countDocuments({ ...scope, integrityStatus: "unverified" }),
        Evidence.countDocuments({ ...scope, integrityStatus: "unavailable" }),
        Evidence.countDocuments({ ...scope, integrityStatus: "UPLOAD_FAILED" }),
        Evidence.countDocuments({ ...scope, integrityStatus: "UPLOAD_PENDING" }),
      ]);

    // noBaseline: documents that have no evidence attestation (legacy records
    // created before feature 05, or rows whose hash could not be recorded).
    const evDocIds = await Evidence.find(scope).distinct("sourceRecordId");
    const docScope: Record<string, unknown> = { _id: { $nin: evDocIds } };
    if (scope.siteId) docScope.siteId = scope.siteId;
    const noBaseline = await Document.countDocuments(docScope);

    res.json({
      data: {
        total,
        checked: verified + mismatched + unavailable,
        verified,
        mismatched,
        unverified,
        unavailable,
        uploadFailed,
        uploadPending,
        noBaseline,
      },
    });
  } catch (err) {
    console.error("Evidence dashboard error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/evidence/:id/verify ─────────────────────────────────────────
// Live re-verification of ONE evidence row. Fail-closed: out-of-scope ids 404
// (same as unknown ids), malformed ids 400.

export const verifyEvidenceRow = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id || typeof id !== "string" || !objectIdRegex.test(id)) {
      res.status(400).json({ error: "Invalid evidence ID." });
      return;
    }

    const ev = await Evidence.findById(id);
    if (!ev) {
      res.status(404).json({ error: "Evidence not found." });
      return;
    }

    // mine_official can verify own-site evidence only (404, not 403 — existence
    // of cross-site rows must not be observable).
    if (req.user.role === "mine_official") {
      if (!req.user.siteId || ev.siteId.toString() !== req.user.siteId) {
        res.status(404).json({ error: "Evidence not found." });
        return;
      }
    }

    const result = await verifyEvidence(ev._id, new Types.ObjectId(req.user.id));
    res.json({ data: result });
  } catch (err) {
    console.error("Verify evidence error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── POST /api/v1/evidence/verify-all ─────────────────────────────────────────
// Batch re-verification (dashboard "check all"). Corporate/regulator only —
// a site-wide recon pass is oversight work. Returns the count summary.

export const runVerifyAll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const q = req.query as unknown as ListEvidenceQuery;
    const result = await verifyAllEvidence({
      ...(q.siteId ? { siteId: new Types.ObjectId(q.siteId) } : {}),
      actorId: new Types.ObjectId(req.user.id),
    });
    res.json({ data: result });
  } catch (err) {
    console.error("Verify-all evidence error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
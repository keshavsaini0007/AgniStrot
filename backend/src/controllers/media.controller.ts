import type { Response } from "express";
import multer from "multer";
import { Types } from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import {
  buildCloudinaryOriginalUrl,
  createEvidence,
  persistLocalFile,
  sha256Hex,
  UPLOAD_FAILED_SENTINEL,
} from "../services/evidenceService.js";
import type { AuthenticatedRequest } from "../types/index.js";

// ── Multer config ───────────────────────────────────────────────────────────
// Memory storage — file stays in RAM as a Buffer, uploaded to Cloudinary.

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

export const uploadMiddleware = upload.single("file");

// ── POST /api/v1/media/upload ───────────────────────────────────────────────
// Uploads image buffer to Cloudinary (or local mode), records the server-side
// SHA-256 of the EXACT file bytes as Evidence (feature 05), returns url + hash.

export const uploadMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    // Feature 05: hash the exact bytes received — never a client-supplied hash
    // (edge G3), and it's the STORED file that gets hashed (edge F).
    const contentHash = sha256Hex(req.file.buffer);
    const evidenceId = new Types.ObjectId();
    const safeName = req.file.originalname.replace(/[^\w.-]/g, "_");

    // A file that can't be attributed to a site is not attestable evidence.
    if (!req.user.siteId) {
      res.status(403).json({ error: "Access denied. No site assigned to your account." });
      return;
    }
    const siteId = new Types.ObjectId(req.user.siteId);
    const uploadedBy = new Types.ObjectId(req.user.id);

    // Local mode (CLOUDINARY_ENABLED=false) — fully self-contained for demos and
    // tests, mirroring document.controller. The exact buffer is persisted to
    // disk so verification re-reads the SAME bytes (the placeholder URL exists
    // only for sync-validator compatibility). If persistence fails the upload
    // is recorded UPLOAD_FAILED — never a false success (edge G).
    if (process.env.CLOUDINARY_ENABLED === "false") {
      try {
        const verificationSource = await persistLocalFile(
          evidenceId,
          req.file.buffer,
          req.file.originalname
        );
        const url = `https://local.invalid/agnistrot/${evidenceId.toString()}-${safeName}`;
        await createEvidence({
          _id: evidenceId,
          sourceType: "media",
          siteId,
          fileUrl: url,
          verificationSource,
          verificationSourceKind: "file",
          contentHash,
          fileName: req.file.originalname,
          uploadedBy,
          integrityStatus: "unverified",
        });
        console.log(`Storing media evidence (local mode): ${url}`);
        res.json({ url, contentHash, evidenceId: evidenceId.toString() });
        return;
      } catch (err) {
        const errorDetails = err instanceof Error ? err.message : String(err);
        await createEvidence({
          _id: evidenceId,
          sourceType: "media",
          siteId,
          fileUrl: `https://local.invalid/agnistrot/${evidenceId.toString()}-${safeName}`,
          verificationSource: UPLOAD_FAILED_SENTINEL,
          verificationSourceKind: "file",
          contentHash,
          fileName: req.file.originalname,
          uploadedBy,
          integrityStatus: "UPLOAD_FAILED",
          verificationNote: "Local persistence failed — no stored file.",
        }).catch(() => undefined);
        console.error("Media local persistence error:", errorDetails);
        res.status(500).json({ error: "Media upload failed.", details: errorDetails });
        return;
      }
    }

    // Cloudinary mode
    try {
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "agnistrot/media",
            resource_type: "image",
            quality: "auto",
            fetch_format: "auto",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result as CloudinaryUploadResult);
          }
        );
        stream.end(req.file!.buffer);
      });

      // Verification fetches the untransformed ORIGINAL (edge G1) — the display
      // secure_url applies quality/fetch_format transforms and is NOT the
      // byte-identical master.
      const verificationSource = buildCloudinaryOriginalUrl(result.public_id);
      await createEvidence({
        _id: evidenceId,
        sourceType: "media",
        siteId,
        fileUrl: result.secure_url,
        verificationSource,
        verificationSourceKind: "url",
        contentHash,
        fileName: req.file.originalname,
        uploadedBy,
        integrityStatus: "unverified",
      });

      res.json({
        url: result.secure_url,
        contentHash,
        evidenceId: evidenceId.toString(),
      });
    } catch (err) {
      // Edge G: cloud unavailable → record UPLOAD_FAILED, never success.
      const errorDetails = err instanceof Error ? err.message : String(err);
      await createEvidence({
        _id: evidenceId,
        sourceType: "media",
        siteId,
        fileUrl: "https://local.invalid/agnistrot/upload-failed",
        verificationSource: UPLOAD_FAILED_SENTINEL,
        verificationSourceKind: "url",
        contentHash,
        fileName: req.file.originalname,
        uploadedBy,
        integrityStatus: "UPLOAD_FAILED",
        verificationNote: "Cloudinary upload failed — no stored file.",
      }).catch(() => undefined);
      console.error("Media upload error:", errorDetails);
      res.status(500).json({ error: "Media upload failed.", details: errorDetails });
    }
  } catch (err) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error("Media upload error:", errorDetails);
    res.status(500).json({ error: "Media upload failed.", details: errorDetails });
  }
};

// ── Cloudinary response type (subset) ───────────────────────────────────────

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}
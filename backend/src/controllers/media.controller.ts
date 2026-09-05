import type { Request, Response } from "express";
import multer from "multer";
import { cloudinary } from "../config/cloudinary.js";

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
// Uploads image buffer to Cloudinary, returns the secure URL.

export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "agnistrot" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as CloudinaryUploadResult);
        }
      );
      stream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Media upload error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── Cloudinary response type (subset) ───────────────────────────────────────

interface CloudinaryUploadResult {
  secure_url: string;
}

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

    // Local mode (CLOUDINARY_ENABLED=false) — fully self-contained for demos and
    // tests, mirroring document.controller. A schema-valid placeholder URL is
    // returned so uploaded photos still flow through the sync validator, which
    // requires HTTP(s) URLs (sync.validator photoUrls: z.string().url()).
    if (process.env.CLOUDINARY_ENABLED === "false") {
      const safeName = req.file.originalname.replace(/[^\w.-]/g, "_");
      const url = `https://local.invalid/agnistrot/${Date.now().toString(36)}-${safeName}`;
      console.log(`Storing media placeholder (local mode): ${url}`);
      res.json({ url });
      return;
    }

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

    res.json({ url: result.secure_url });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error("Media upload error:", errorDetails);
    res.status(500).json({ error: "Media upload failed.", details: errorDetails });
  }
};

// ── Cloudinary response type (subset) ───────────────────────────────────────

interface CloudinaryUploadResult {
  secure_url: string;
}

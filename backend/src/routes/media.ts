import { Router } from "express";
import { uploadMiddleware, uploadMedia } from "../controllers/media.controller.js";

const router = Router();

router.post("/upload", uploadMiddleware, uploadMedia);

export default router;

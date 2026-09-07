import { Router } from "express";
import { uploadMiddleware, uploadMedia } from "../controllers/media.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { SYNC_ROLES } from "../utils/roleScope.js";

const router = Router();

router.post("/upload", authenticate, authorize(...SYNC_ROLES), uploadMiddleware, uploadMedia);

export default router;

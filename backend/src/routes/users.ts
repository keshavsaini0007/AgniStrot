import { Router } from "express";
import { listUsers, updateProfile } from "../controllers/user.controller.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

// User directory — corporate managers only. Register is the same role guard
// (see ../routes/auth.ts); mine_official/regulator/field_officer are denied.
router.get("/", authorize("corporate_manager"), listUsers);

// Profile update — any authenticated user can update their own profile
router.put("/me", updateProfile);

export default router;
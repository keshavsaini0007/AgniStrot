import { Router } from "express";
import { listUsers, updateProfile, updateUser } from "../controllers/user.controller.js";
import { authorize } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { updateUserSchema, listUsersSchema } from "../validators/users.validator.js";

const router = Router();

// User directory — corporate managers only. Register is the same role guard
// (see ../routes/auth.ts); mine_official/regulator/field_officer are denied.
router.get("/", authorize("corporate_manager"), validateQuery(listUsersSchema), listUsers);

// Profile update — any authenticated user can update their own profile
router.put("/me", updateProfile);

// Admin user management (feature 07) — corporate managers only. Email is
// immutable by schema design; self-edit is guarded in the controller.
router.patch("/:id", authorize("corporate_manager"), validate(updateUserSchema), updateUser);

export default router;
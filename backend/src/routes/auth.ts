import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();

// Open — anyone can log in
router.post("/login", validate(loginSchema), login);

// Protected — only corporate_manager can create new users
// This prevents self-registration of regulator/corporate_manager accounts
router.post(
  "/register",
  authenticate,
  authorize("corporate_manager"),
  validate(registerSchema),
  register
);

export default router;

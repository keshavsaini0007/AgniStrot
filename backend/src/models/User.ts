import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser } from "../types/index.js";

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required."],
    },
    role: {
      type: String,
      required: [true, "Role is required."],
      enum: {
        values: ["field_officer", "mine_official", "corporate_manager", "regulator"],
        message: "{VALUE} is not a valid role.",
      },
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      default: null, // null for corporate_manager and regulator — they aren't tied to one site
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Instance method: compare a plain password against the stored hash ───────
// Usage: const isMatch = await user.comparePassword("plaintext")
userSchema.methods["comparePassword"] = async function (
  plainPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.passwordHash as string);
};

// ── Pre-save hook: hash password before saving ───────────────────────────────
// Runs automatically on user.save() — never store plaintext passwords.
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

const User = model<IUser>("User", userSchema);

export default User;

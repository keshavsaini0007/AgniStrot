import { Schema, model } from "mongoose";
import type { Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser } from "../types/index.js";

// ── Methods interface — tells TypeScript about instance methods ───────────────
interface IUserMethods {
  comparePassword(plainPassword: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
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
    isActive: {
      type: Boolean,
      default: true,
      // false = deactivated (resigned/offboarded) — assignee resolution and the
      // escalation engine never target inactive users (feature 02 edge B).
    },
    department: {
      type: String,
      default: "operations",
      enum: {
        values: ["safety", "production", "environmental", "labour", "operations"],
        message: "{VALUE} is not a valid department.",
      },
      // responsibility area — lets the engine pick the right manager when a
      // level has several candidates (feature 02 edge H).
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

const User = model<IUser, UserModel>("User", userSchema);

export default User;

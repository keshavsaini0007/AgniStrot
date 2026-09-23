import { Schema, model } from "mongoose";
import type { ICorrectiveCloseout, CorrectiveCloseoutStatus } from "../types/index.js";

// ── Feature 08: Corrective action close-out record ───────────────────────────
// Persistent proof of the close-out loop. One document per corrective action:
//   - `submitted`  — mine official (own site) / corporate manager lodged the
//                    close-out evidence (recommendation + effectiveness)
//   - `approved`   — corporate manager signed it off → the derived feed shows
//                    the corrective action as terminal "closed"
//   - `rejected`   — corporate manager sent it back → the submitter may
//                    resubmit (updated in place, back to `submitted`)
// The unique alertId index enforces 1:1 with the source alert.

const correctiveCloseoutSchema = new Schema<ICorrectiveCloseout>(
  {
    alertId: {
      type: Schema.Types.ObjectId,
      ref: "Alert",
      required: [true, "alertId is required."],
      unique: true,
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "siteId is required."],
    },
    recommendation: {
      type: String,
      required: [true, "recommendation is required."],
      minlength: [10, "recommendation must be at least 10 characters."],
      maxlength: [2000, "recommendation must not exceed 2000 characters."],
    },
    effectiveness: {
      type: String,
      required: [true, "effectiveness is required."],
      minlength: [10, "effectiveness must be at least 10 characters."],
      maxlength: [2000, "effectiveness must not exceed 2000 characters."],
    },
    evidenceNote: {
      type: String,
      maxlength: [2000, "evidenceNote must not exceed 2000 characters."],
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "submittedBy is required."],
    },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: {
        values: ["submitted", "approved", "rejected"] satisfies CorrectiveCloseoutStatus[],
        message: "{VALUE} is not a valid close-out status.",
      },
      default: "submitted",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: {
      type: String,
      maxlength: [2000, "reviewNote must not exceed 2000 characters."],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

const CorrectiveCloseout = model<ICorrectiveCloseout>("CorrectiveCloseout", correctiveCloseoutSchema);

export default CorrectiveCloseout;
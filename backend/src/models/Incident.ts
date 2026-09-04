import { Schema, model } from "mongoose";
import type { IIncident } from "../types/index.js";

const incidentSchema = new Schema<IIncident>(
  {
    clientUuid: {
      type: String,
      required: [true, "clientUuid is required."],
      unique: true,
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "siteId is required."],
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "reportedBy is required."],
    },
    severity: {
      type: String,
      required: [true, "Severity is required."],
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "{VALUE} is not a valid severity level.",
      },
    },
    category: {
      type: String,
      required: [true, "Category is required."],
      enum: {
        values: ["safety", "environmental", "equipment", "other"],
        message: "{VALUE} is not a valid category.",
      },
    },
    description: {
      type: String,
      required: [true, "Incident description is required."],
      trim: true,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    photoUrls: {
      type: [String],
      default: [],
    },
    capturedAt: {
      type: Date,
      required: [true, "capturedAt is required."],
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      default: "open",
      enum: {
        values: ["open", "investigating", "resolved"],
        message: "{VALUE} is not a valid incident status.",
      },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Dashboard query: "show me all open incidents for site X"
incidentSchema.index({ siteId: 1, status: 1 });

// Regulator view: "show me all critical incidents across all sites"
incidentSchema.index({ severity: 1, status: 1 });

const Incident = model<IIncident>("Incident", incidentSchema);

export default Incident;

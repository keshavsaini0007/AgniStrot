import { Schema, model } from "mongoose";
import type { IInspection, IChecklistItem } from "../types/index.js";

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    item: {
      type: String,
      required: [true, "Checklist item description is required."],
    },
    result: {
      type: String,
      enum: {
        values: ["pass", "fail", "na"],
        message: "{VALUE} is not a valid result. Use pass, fail, or na.",
      },
      required: [true, "Checklist result is required."],
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: false } // no separate _id for each checklist item — they're part of the parent doc
);

const inspectionSchema = new Schema<IInspection>(
  {
    clientUuid: {
      type: String,
      required: [true, "clientUuid is required."],
      unique: true, // ← this is the offline sync dedup key
      // if the mobile app retries a failed sync, the same clientUuid
      // triggers an upsert, not a duplicate insert
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "siteId is required."],
    },
    inspectorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "inspectorId is required."],
    },
    type: {
      type: String,
      required: [true, "Inspection type is required."],
      enum: {
        values: ["safety", "environmental", "production", "labour"],
        message: "{VALUE} is not a valid inspection type.",
      },
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
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
      // device-local timestamp set at the moment of capture — NOT when it syncs.
      // this is critical: an inspection captured at 8am offline and synced at 3pm
      // must still show as 8am in the audit trail.
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Compound index for the most common dashboard query:
// "give me all inspections for site X, sorted by most recent"
inspectionSchema.index({ siteId: 1, capturedAt: -1 });

const Inspection = model<IInspection>("Inspection", inspectionSchema);

export default Inspection;

import { Schema, model } from "mongoose";
import type { IHazard } from "../types/index.js";

// ── Feature 06: Hazard Register ──────────────────────────────────────────────
// One row per registered site hazard (manual registration or raised from an
// open RECURRING_HAZARD pattern alert). riskScore/riskLevel are deterministic
// outputs of the 5×5 matrix (likelihood × consequence) — always recomputed on
// the server, never trusted from a client value. Controls follow the hierarchy
// of controls; effectiveness is derived by rule from the STRONGEST implemented
// control tier (see hazardService.assessEffectiveness), with an empirical
// recurrence override from the batch sweep (batchRules.checkControlEffectiveness).

const hazardControlSchema = new Schema(
  {
    description: {
      type: String,
      required: [true, "Control description is required."],
      trim: true,
      maxlength: 500,
    },
    controlType: {
      type: String,
      required: [true, "controlType is required."],
      enum: {
        values: ["elimination", "substitution", "engineering", "administrative", "ppe"],
        message: "{VALUE} is not a valid hierarchy-of-controls tier.",
      },
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    implemented: {
      type: Boolean,
      default: false,
    },
    implementedAt: {
      type: Date,
      default: null,
    },
    implementedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: true }
);

const hazardEffectivenessSchema = new Schema(
  {
    status: {
      type: String,
      required: [true, "Effectiveness status is required."],
      enum: {
        values: ["effective", "partially_effective", "ineffective"],
        message: "{VALUE} is not a valid effectiveness verdict.",
      },
    },
    reduction: {
      type: Number,
      required: [true, "Reduction tier is required."],
      min: 0,
      max: 3,
    },
    residualLikelihood: {
      type: Number,
      required: [true, "residualLikelihood is required."],
      min: 1,
      max: 5,
    },
    residualConsequence: {
      type: Number,
      required: [true, "residualConsequence is required."],
      min: 1,
      max: 5,
    },
    residualRiskScore: {
      type: Number,
      required: [true, "residualRiskScore is required."],
      min: 1,
      max: 25,
    },
    residualRiskLevel: {
      type: String,
      required: [true, "residualRiskLevel is required."],
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "{VALUE} is not a valid risk level.",
      },
    },
    recurrenceOverride: {
      type: Boolean,
      default: false,
    },
    assessedAt: {
      type: Date,
      default: () => new Date(),
    },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "assessedBy is required."],
    },
    note: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const hazardSchema = new Schema<IHazard>(
  {
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "siteId is required."],
      index: true,
    },
    category: {
      type: String,
      required: [true, "category is required."],
      index: true,
      // canonical hazard category key — normalized on the server via
      // normalizeHazardCategory (feature 04 alias table), so a register entry
      // and a RECURRING_HAZARD alert for the same hazard always share a key.
    },
    title: {
      type: String,
      required: [true, "title is required."],
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, "description is required."],
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    sourceType: {
      type: String,
      required: [true, "sourceType is required."],
      enum: {
        values: ["manual", "alert"],
        message: "{VALUE} is not a valid register source.",
      },
      default: "manual",
    },
    sourceAlertId: {
      type: Schema.Types.ObjectId,
      ref: "Alert",
      default: null,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "registeredBy is required."],
    },
    registeredAt: {
      type: Date,
      default: () => new Date(),
    },
    likelihood: {
      type: Number,
      required: [true, "likelihood (1-5) is required."],
      min: 1,
      max: 5,
    },
    consequence: {
      type: Number,
      required: [true, "consequence (1-5) is required."],
      min: 1,
      max: 5,
    },
    riskScore: {
      type: Number,
      required: [true, "riskScore is required."],
      min: 1,
      max: 25,
    },
    riskLevel: {
      type: String,
      required: [true, "riskLevel is required."],
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "{VALUE} is not a valid risk level.",
      },
    },
    status: {
      type: String,
      required: [true, "status is required."],
      enum: {
        values: ["open", "mitigating", "controlled", "closed"],
        message: "{VALUE} is not a valid hazard status.",
      },
      default: "open",
      index: true,
    },
    controls: {
      type: [hazardControlSchema],
      default: [],
    },
    effectiveness: {
      type: hazardEffectivenessSchema,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closureNote: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for the register filters + Phase D sweep lookups.
hazardSchema.index({ siteId: 1, status: 1 });
hazardSchema.index({ siteId: 1, category: 1 });

export default model<IHazard>("Hazard", hazardSchema);
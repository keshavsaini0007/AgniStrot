import { Schema, model } from "mongoose";
import type { IAttendance } from "../types/index.js";

const attendanceSchema = new Schema<IAttendance>(
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
    workerRef: {
      type: String,
      required: [true, "workerRef is required."],
      trim: true,
      // worker name or ID — no biometric in MVP (explicitly out of scope per PRD NG5)
    },
    checkType: {
      type: String,
      required: [true, "checkType is required."],
      enum: {
        values: ["in", "out"],
        message: "{VALUE} is not valid. Use 'in' or 'out'.",
      },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    capturedAt: {
      type: Date,
      required: [true, "capturedAt is required."],
      // device-local timestamp — same reasoning as Inspection.capturedAt
    },
  }
  // no timestamps option — capturedAt IS the timestamp for attendance records
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Batch rule query: "how many check-ins for site X today vs. 14-day average"
attendanceSchema.index({ siteId: 1, capturedAt: -1 });

// Worker-level query: "all records for a specific worker at a site"
attendanceSchema.index({ siteId: 1, workerRef: 1 });

const Attendance = model<IAttendance>("Attendance", attendanceSchema);

export default Attendance;

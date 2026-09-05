import { Schema, model } from "mongoose";
import type { ISite } from "../types/index.js";

const siteSchema = new Schema<ISite>(
  {
    name: {
      type: String,
      required: [true, "Site name is required."],
      trim: true,
    },
    subsidiary: {
      type: String,
      required: [true, "Subsidiary name is required."],
      trim: true,
    },
    location: {
      lat: { type: Number, required: [true, "Latitude is required."] },
      lng: { type: Number, required: [true, "Longitude is required."] },
    },
    expectedWorkers: {
      type: Number,
      required: [true, "Expected number of workers is required."],
      min: [1, "Expected workers must be at least 1."],
      default: 50,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // we only need createdAt for sites
  }
);

const Site = model<ISite>("Site", siteSchema);

export default Site;

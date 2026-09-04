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
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // we only need createdAt for sites
  }
);

const Site = model<ISite>("Site", siteSchema);

export default Site;

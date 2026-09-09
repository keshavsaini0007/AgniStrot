import type { Response } from "express";
import { Types } from "mongoose";
import Site from "../models/Site.js";
import Inspection from "../models/Inspection.js";
import Incident from "../models/Incident.js";
import type { AuthenticatedRequest, MapMarker } from "../types/index.js";

// ── GET /api/v1/gis/markers ─────────────────────────────────────────────────
// Unified endpoint that aggregates geospatial markers from sites, inspections,
// and incidents. Role-based scoping applies: mine officials see only their site,
// corporate managers and regulators see all sites (optionally filtered by siteId).

export const getMapMarkers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { siteId } = req.query as { siteId?: string };

    // Role-based access control
    if (req.user.role === "field_officer") {
      res.status(403).json({ error: "Access denied. GIS view not available for field officers." });
      return;
    }

    // Determine site scope based on role
    const siteIds: Types.ObjectId[] = [];

    if (req.user.role === "mine_official") {
      // Mine officials can only see their assigned site (ignore query param)
      if (!req.user.siteId) {
        res.status(403).json({ error: "Access denied. No site assigned." });
        return;
      }
      siteIds.push(new Types.ObjectId(req.user.siteId));
    } else {
      // Corporate managers and regulators can optionally filter by siteId
      if (siteId) {
        // siteId already validated by gisMarkersSchema (24-char hex)
        siteIds.push(new Types.ObjectId(siteId));
      } else {
        // If no filter provided, fetch all sites
        const allSites = await Site.find().select("_id");
        siteIds.push(...allSites.map((s) => s._id));
      }
    }

    const siteFilter = siteIds.length > 0 ? { _id: { $in: siteIds } } : {};

    // Fetch data from 3 collections in parallel
    const [sites, inspections, incidents] = await Promise.all([
      // 1. Sites with coordinates
      Site.find(siteFilter).select("_id name subsidiary location"),

      // 2. Recent inspections with coordinates (last 100)
      Inspection.find({
        siteId: { $in: siteIds },
        location: { $exists: true },
      })
        .populate("siteId", "name")
        .sort({ capturedAt: -1 })
        .limit(100),

      // 3. Recent incidents with coordinates (last 100)
      Incident.find({
        siteId: { $in: siteIds },
        location: { $exists: true },
      })
        .populate("siteId", "name")
        .sort({ capturedAt: -1 })
        .limit(100),
    ]);

    // Transform data into standardized marker format
    const markers: MapMarker[] = [];

    // Add site markers
    for (const site of sites) {
      if (
        site.location &&
        typeof site.location.lat === "number" &&
        typeof site.location.lng === "number"
      ) {
        markers.push({
          id: site._id.toString(),
          category: "site",
          lat: site.location.lat,
          lng: site.location.lng,
          siteId: site._id.toString(),
          siteName: site.name,
          title: `Site: ${site.name}`,
          status: "active",
        });
      }
    }

    // Add inspection markers
    for (const inspection of inspections) {
      if (
        inspection.location &&
        typeof inspection.location.lat === "number" &&
        typeof inspection.location.lng === "number"
      ) {
        // Determine severity based on checklist results
        const hasFail = inspection.checklist.some((item) => item.result === "fail");
        const severity = hasFail ? "high" : "low";
        const status = hasFail ? "fail" : "pass";

        // Type-safe site access
        const siteDoc = inspection.siteId as unknown as { _id: Types.ObjectId; name?: string } | null;
        if (!siteDoc) continue; // Skip if site was deleted

        markers.push({
          id: inspection._id.toString(),
          category: "inspection",
          lat: inspection.location.lat,
          lng: inspection.location.lng,
          siteId: siteDoc._id.toString(),
          siteName: siteDoc.name ?? "Unknown Site",
          title: `${inspection.type.charAt(0).toUpperCase() + inspection.type.slice(1)} Inspection`,
          severity,
          status,
          timestamp: inspection.capturedAt,
        });
      }
    }

    // Add incident markers
    for (const incident of incidents) {
      if (
        incident.location &&
        typeof incident.location.lat === "number" &&
        typeof incident.location.lng === "number"
      ) {
        // Type-safe site access
        const siteDoc = incident.siteId as unknown as { _id: Types.ObjectId; name?: string } | null;
        if (!siteDoc) continue; // Skip if site was deleted

        markers.push({
          id: incident._id.toString(),
          category: "incident",
          lat: incident.location.lat,
          lng: incident.location.lng,
          siteId: siteDoc._id.toString(),
          siteName: siteDoc.name ?? "Unknown Site",
          title: `${incident.category.charAt(0).toUpperCase() + incident.category.slice(1)} Incident`,
          severity: incident.severity,
          status: incident.status,
          timestamp: incident.capturedAt,
        });
      }
    }

    res.json({
      data: markers,
      total: markers.length,
    });
  } catch (err) {
    console.error("GIS markers error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ── GET /api/v1/sites ───────────────────────────────────────────────────────
// List all sites (role-scoped). Mine official sees only their own site;
// corporate/regulator see all sites.

import { Router } from "express";
import type { Request, Response } from "express";
import Site from "../models/Site.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/sites — role-scoped list
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    
    // Build role-based filter
    let filter: any = {};
    if (user.role === "mine_official") {
      // Mine official sees only their site
      if (user.siteId) {
        filter._id = user.siteId;
      } else {
        // No site binding = empty result
        res.json({ sites: [], total: 0 });
        return;
      }
    }
    // corporate_manager and regulator see all sites (empty filter)
    
    const sites = await Site.find(filter).sort({ name: 1 }).lean();

    res.json({
      sites: sites.map((site) => ({
        _id: site._id,
        name: site.name,
        subsidiary: site.subsidiary,
        location: site.location,
        expectedWorkers: site.expectedWorkers,
      })),
      total: sites.length,
    });
  } catch (err) {
    console.error("Sites list error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/v1/sites/:id — single site details (RBAC enforced)
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const site = await Site.findById(req.params.id).lean();

    if (!site) {
      res.status(404).json({ error: "Site not found." });
      return;
    }

    // RBAC: mine_official can only access their own site
    const user = req.user!;
    if (user.role === "mine_official" && user.siteId !== site._id.toString()) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    res.json(site);
  } catch (err) {
    console.error("Site detail error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;

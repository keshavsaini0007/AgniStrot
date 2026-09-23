// ── Point-in-polygon (hand-rolled ray casting, RFC-free) ─────────────────────
// No Turf.js / external GIS dependency (standing rule). Implements the classic
// even-odd ray-casting rule (Franklin), which is correct for both convex and
// concave rings, with an explicit edge-tolerance pass so points that lie
// exactly on a boundary edge/vertex count as INSIDE.

export interface GeoRingPoint {
  lat: number;
  lng: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

const EDGE_EPSILON = 1e-9;

/** True when (lat,lng) sits on any ring edge (within epsilon tolerance). */
function isOnEdge(lat: number, lng: number, ring: GeoRingPoint[]): boolean {
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j]!;
    const b = ring[i]!;
    // Cross product of (b-a) × (p-a) — ~0 means collinear with the edge.
    const cross = (b.lng - a.lng) * (lat - a.lat) - (b.lat - a.lat) * (lng - a.lng);
    if (Math.abs(cross) > EDGE_EPSILON) continue;
    const minX = Math.min(a.lng, b.lng) - EDGE_EPSILON;
    const maxX = Math.max(a.lng, b.lng) + EDGE_EPSILON;
    const minY = Math.min(a.lat, b.lat) - EDGE_EPSILON;
    const maxY = Math.max(a.lat, b.lat) + EDGE_EPSILON;
    if (lng >= minX && lng <= maxX && lat >= minY && lat <= maxY) return true;
  }
  return false;
}

/**
 * Even-odd ray casting: a horizontal ray from the point crosses the ring an
 * odd number of times → inside. Handles concave polygons and the half-open
 * vertex rule; on-edge points are resolved by the tolerance pass above.
 * A degenerate ring (< 3 vertices) is never "inside".
 */
export function pointInPolygon(lat: number, lng: number, ring: GeoRingPoint[]): boolean {
  if (!Array.isArray(ring) || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i]!.lat;
    const yj = ring[j]!.lat;
    const xi = ring[i]!.lng;
    const xj = ring[j]!.lng;
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside || isOnEdge(lat, lng, ring);
}

/**
 * Geofence shortcut used by the sync write paths: a record without coordinates
 * is never blocked; a site without a boundary ring is never enforced; otherwise
 * the capture point must lie inside the ring.
 */
export function isPointWithinBoundary(
  point: GeoPoint | null | undefined,
  boundary: GeoRingPoint[] | null | undefined
): boolean {
  if (!point) return true;
  if (!boundary || boundary.length < 3) return true;
  return pointInPolygon(point.lat, point.lng, boundary);
}
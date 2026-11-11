/**
 * Go7 delivery-zone detection.
 *
 * Pure, dependency-free geospatial helpers used by the customer checkout,
 * the pricing core, admin, dispatch and (mirrored) server-side functions.
 *
 * Polygon convention: `polygon` is an array of [lat, lng] pairs, e.g.
 *   polygon: [[7.22, 3.44], [7.22, 3.45], [7.21, 3.45], [7.21, 3.44]]
 * (matches the existing [lat, lng] polygons used across the Go7 codebase).
 */

export interface ZonePoint {
  lat: number;
  lng: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  /** Higher priority wins when a point falls inside overlapping zones. */
  priority: number;
  /** Optional zone-specific delivery fee override (₦). */
  baseFee?: number | null;
  /** [lat, lng] boundary polygon (placeholder coordinates until verified). */
  polygon: number[][];
  /** Set to true once the polygon's real-world boundary has been verified. */
  boundsVerified?: boolean;
}

export interface ZoneMatch {
  matched: boolean;
  zoneId: string | null;
  zoneName: string | null;
  priority?: number;
}

const isFinitePoint = (lat: any, lng: any): lat is number => {
  return (
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180
  );
};

/**
 * Accurate point-in-polygon (ray-casting) test.
 * Handles points on the edge as inside.
 */
export function pointInPolygon(point: ZonePoint, polygon: number[][]): boolean {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false;
  const { lat, lng } = point;
  if (!isFinitePoint(lat, lng)) return false;

  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = Number(polygon[i]?.[0]);
    const yi = Number(polygon[i]?.[1]);
    const xj = Number(polygon[j]?.[0]);
    const yj = Number(polygon[j]?.[1]);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;

    const intersects =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Normalise a raw Firestore zone doc into a valid DeliveryZone. */
export function normalizeZone(raw: any): DeliveryZone | null {
  if (!raw || typeof raw !== 'object') return null;
  const polygon = Array.isArray(raw.polygon)
    ? raw.polygon.filter(
        (p: any) => Array.isArray(p) && p.length >= 2 && p.every((v: any) => Number.isFinite(Number(v)))
      )
    : [];
  if (polygon.length < 3) return null;

  return {
    id: String(raw.id || raw.name || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    name: String(raw.name || raw.id || 'Unknown zone'),
    description: raw.description ? String(raw.description) : undefined,
    enabled: raw.enabled !== false,
    priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
    // Preserve "no override" (null) vs an explicit ₦0 override.
    baseFee:
      raw.baseFee == null || raw.baseFee === ''
        ? null
        : Number.isFinite(Number(raw.baseFee))
        ? Number(raw.baseFee)
        : null,
    polygon,
    boundsVerified: Boolean(raw.boundsVerified),
  };
}

/**
 * Detect which delivery zone a coordinate falls inside.
 *
 * - Disabled zones never match.
 * - Overlapping zones resolve by explicit `priority` (higher wins).
 * - Invalid coordinates return `matched:false` safely.
 * - Outside every zone returns `{ matched:false, zoneId:null, zoneName:null }`.
 */
export function detectDeliveryZone(
  zones: DeliveryZone[],
  lat: any,
  lng: any
): ZoneMatch {
  if (!isFinitePoint(lat, lng)) {
    return { matched: false, zoneId: null, zoneName: null };
  }
  const point: ZonePoint = { lat: Number(lat), lng: Number(lng) };

  const valid = (zones || [])
    .map(normalizeZone)
    .filter((z): z is DeliveryZone => z !== null && z.enabled);

  let best: DeliveryZone | null = null;
  for (const z of valid) {
    if (pointInPolygon(point, z.polygon)) {
      if (!best || z.priority > best.priority) best = z;
    }
  }

  if (best) {
    return { matched: true, zoneId: best.id, zoneName: best.name, priority: best.priority };
  }
  return { matched: false, zoneId: null, zoneName: null };
}

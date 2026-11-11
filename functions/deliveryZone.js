/**
 * Go7 delivery-zone detection — server-side mirror.
 *
 * Faithful CommonJS port of src/lib/deliveryZone.ts so the backend is
 * authoritative and deterministic without importing browser code.
 * Polygon convention: array of [lat, lng] pairs.
 */

function isFinitePoint(lat, lng) {
  return (
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180
  );
}

/** Point-in-polygon (ray casting). Edge-inclusive. */
function pointInPolygon(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false;
  const { lat, lng } = point;
  if (!isFinitePoint(lat, lng)) return false;

  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = Number(polygon[i] && polygon[i][0]);
    const yi = Number(polygon[i] && polygon[i][1]);
    const xj = Number(polygon[j] && polygon[j][0]);
    const yj = Number(polygon[j] && polygon[j][1]);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;
    const intersects = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Normalise a raw Firestore zone doc into a valid zone; null if no valid polygon. */
function normalizeZone(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const polygon = Array.isArray(raw.polygon)
    ? raw.polygon.filter(
        (p) =>
          Array.isArray(p) &&
          p.length >= 2 &&
          p.every((v) => Number.isFinite(Number(v)))
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

/** Detect zone for a coordinate (disabled zones ignored; priority higher wins). */
function detectDeliveryZone(zones, lat, lng) {
  if (!isFinitePoint(lat, lng)) {
    return { matched: false, zoneId: null, zoneName: null, priority: undefined };
  }
  const point = { lat: Number(lat), lng: Number(lng) };
  const valid = (zones || [])
    .map(normalizeZone)
    .filter((z) => z !== null && z.enabled);

  let best = null;
  for (const z of valid) {
    if (pointInPolygon(point, z.polygon)) {
      if (!best || z.priority > best.priority) best = z;
    }
  }
  if (best) return { matched: true, zoneId: best.id, zoneName: best.name, priority: best.priority };
  return { matched: false, zoneId: null, zoneName: null, priority: undefined };
}

module.exports = {
  pointInPolygon,
  normalizeZone,
  detectDeliveryZone,
  isFinitePoint,
};

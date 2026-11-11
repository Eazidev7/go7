/**
 * Shared customer location quality helpers (GPS accuracy + monitoring).
 * Filter DevTools by [Go7Location].
 */

/** Prompt / block when GPS horizontal accuracy is worse than this (meters). */
export const GPS_ACCURACY_WARN_M = 80;
export const GPS_ACCURACY_HARD_M = 150;

export function logLocation(stage, detail) {
  try {
    console.info('[Go7Location]', stage, detail ?? '');
  } catch {
    /* ignore */
  }
}

/** Known invent / seed pins that must never price a delivery. */
const REJECTED_PINS = [
  [7.1475, 3.3619], // Abeokuta city-center default
  [7.1575, 3.347], // seed / AddAddress old default
  [7.1516, 3.3467], // alternate center
  [7.16, 3.35], // demo Mama's Kitchen
  [7.162, 3.348], // demo Burger Bros
  [7.155, 3.344], // demo HealthPlus
  [7.154, 3.3425], // demo Fresh Market
];

export function hasValidCoords(coords) {
  if (!coords) return false;
  const lat = Number(coords.lat ?? coords.latitude);
  const lng = Number(coords.lng ?? coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  // Reject invent / seed pins (never treat as real delivery)
  for (const [rLat, rLng] of REJECTED_PINS) {
    if (Math.abs(lat - rLat) < 0.0002 && Math.abs(lng - rLng) < 0.0002) return false;
  }
  return true;
}

export function normalizeCoords(coords) {
  if (!hasValidCoords(coords)) return null;
  return {
    lat: Number(coords.lat ?? coords.latitude),
    lng: Number(coords.lng ?? coords.longitude),
  };
}

export function isPoorGpsAccuracy(accuracyMeters, thresholdM = GPS_ACCURACY_WARN_M) {
  const a = Number(accuracyMeters);
  return Number.isFinite(a) && a > thresholdM;
}

export function isUnusableGpsAccuracy(accuracyMeters, thresholdM = GPS_ACCURACY_HARD_M) {
  const a = Number(accuracyMeters);
  return Number.isFinite(a) && a > thresholdM;
}

/**
 * Normalize saved address shapes from Firestore / localStorage into { lat, lng }.
 * Never invent city-center defaults.
 */
/**
 * Extract {lat,lng} from a customer address OR a vendor doc — shapes vary:
 * customer: {coordinates}, {lat,lng}, {latitude,longitude}
 * vendor:   {pickupCoords: GeoPoint}, {coordinates: {latitude,longitude}}, {location:{coordinates}}, {location:{lat,lng}}
 */
export function extractCoordsFromAddress(addr) {
  if (!addr) return null;
  const raw =
    addr.coordinates ||
    addr.pickupCoords ||
    addr.location?.coordinates ||
    addr.location ||
    (addr.lat != null && addr.lng != null ? { lat: addr.lat, lng: addr.lng } : null) ||
    (addr.latitude != null && addr.longitude != null
      ? { lat: addr.latitude, lng: addr.longitude }
      : null);
  return normalizeCoords(raw);
}

export function readActiveAddressFromStorage() {
  try {
    const raw = localStorage.getItem('go7ActiveAddress');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.address) return null;
    const coordinates = extractCoordsFromAddress(parsed);
    return {
      ...parsed,
      coordinates,
      gpsAccuracy: parsed.gpsAccuracy ?? parsed.accuracy ?? null,
      pinConfirmed: Boolean(parsed.pinConfirmed),
      fromGps: Boolean(parsed.fromGps),
    };
  } catch {
    return null;
  }
}

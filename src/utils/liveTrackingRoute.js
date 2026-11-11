import { haversineKm } from './distance';
import { OSRM_ROUTE_BASE } from '../config/routing';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'nRGZ9lGblbV9lFK2KclL';

export const MAPTILER_TILE_URL =
  `https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;

export const MAPTILER_ATTRIBUTION =
  '© MapTiler © OpenStreetMap contributors';

function normalizePoint(coords) {
  if (!coords) return null;
  const lat = Number(coords.lat ?? coords.latitude);
  const lng = Number(coords.lng ?? coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Fetch driving route polyline — OSRM (the old MapTiler /routes/ path 404s) */
export async function fetchDrivingRoute(from, to) {
  const a = normalizePoint(from);
  const b = normalizePoint(to);
  if (!a || !b) return null;

  try {
    const url =
      `${OSRM_ROUTE_BASE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM routes ${res.status}`);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;

    const coords = route.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [
      [a.lat, a.lng],
      [b.lat, b.lng],
    ];

    return {
      coords,
      distanceKm: route.distance / 1000,
      durationMin: Math.max(1, Math.ceil(route.duration / 60)),
    };
  } catch (err) {
    console.warn('[liveTracking] route fetch failed:', err?.message);
    return {
      coords: [[a.lat, a.lng], [b.lat, b.lng]],
      distanceKm: haversineKm(a.lat, a.lng, b.lat, b.lng),
      durationMin: Math.max(1, Math.ceil((haversineKm(a.lat, a.lng, b.lat, b.lng) / 25) * 60)),
    };
  }
}

/** Progress 0–100 along route from rider position */
export function progressAlongRoute(rider, routeCoords) {
  if (!rider || !routeCoords?.length) return 0;
  const point = normalizePoint(rider);
  if (!point) return 0;

  let bestDist = Infinity;
  let bestIdx = 0;
  let traveled = 0;

  for (let i = 0; i < routeCoords.length; i++) {
    const [lat, lng] = routeCoords[i];
    const d = haversineKm(point.lat, point.lng, lat, lng);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  for (let i = 0; i < bestIdx; i++) {
    const [aLat, aLng] = routeCoords[i];
    const [bLat, bLng] = routeCoords[i + 1];
    traveled += haversineKm(aLat, aLng, bLat, bLng);
  }

  let total = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLat, aLng] = routeCoords[i];
    const [bLat, bLng] = routeCoords[i + 1];
    total += haversineKm(aLat, aLng, bLat, bLng);
  }

  if (total <= 0) return 0;
  return Math.min(100, Math.round((traveled / total) * 100));
}

export function etaFromRiderToTarget(rider, target, speedKmh = 22) {
  const r = normalizePoint(rider);
  const t = normalizePoint(target);
  if (!r || !t) return { minutes: null, km: null };
  const km = haversineKm(r.lat, r.lng, t.lat, t.lng);
  const minutes = Math.max(1, Math.ceil((km / speedKmh) * 60));
  return { minutes, km: Math.round(km * 10) / 10 };
}

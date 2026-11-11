/**
 * Single source of truth for Abeokuta delivery zone checks.
 * Accepts all Abeokuta neighborhoods by name or coordinates.
 */

import {
  areas,
  ABEOKUTA_AREAS_CATALOG,
  ABEOKUTA_NEIGHBORHOODS,
  buildAreaNameIndex,
} from '../data/abeokutaAreasCatalog';
import { abeokutaAreas } from '../data/data/abeokutaAreas';
import { searchLandmarks } from '../data/landmarks';

export const ABEOKUTA_CENTER = { lat: 7.1475, lng: 3.3619 };

/** Metro Abeokuta + FUNAAB + Ogun suburbs (Ewekoro, Siun, Owode, etc.) */
export const SERVICE_BOUNDS = {
  south: 6.72,
  north: 7.58,
  west: 2.92,
  east: 3.88,
};

export const MAPTILER_BBOX = '2.92,6.72,3.88,7.58';
/** Max road distance from Abeokuta center — covers metro + nearby Ogun towns */
export const MAX_RADIUS_KM = 48;
/** Soft snap band beyond max radius for GPS drift / bad geocodes */
export const SNAP_RADIUS_KM = 12;

/** All known Abeokuta area names (lowercase) — derived from catalog */
const ABK_AREA_NAMES = buildAreaNameIndex();

/** Fix common lat/lng swap (Google sometimes returns lat~3, lng~7 for Nigeria). */
export function fixNigeriaCoords(lat, lng) {
  let la = Number(lat);
  let ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return { lat: la, lng: ln, swapped: false };
  }

  const latLooksLikeLng = la >= 2.5 && la <= 4.8;
  const lngLooksLikeLat = ln >= 6.5 && ln <= 9.5;
  if (latLooksLikeLng && lngLooksLikeLat) {
    return { lat: ln, lng: la, swapped: true };
  }

  return { lat: la, lng: ln, swapped: false };
}

function buildAreaIndex() {
  const index = new Map();

  const add = (name, lat, lng) => {
    const key = normalizeText(name);
    if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!index.has(key)) index.set(key, { lat, lng, label: name });
  };

  ABEOKUTA_AREAS_CATALOG.forEach((area) => {
    add(area.name, area.lat, area.lng);
    for (const alias of area.aliases || []) add(alias, area.lat, area.lng);
  });

  areas.forEach((area) => add(area.name, area.lat, area.lng));

  ABEOKUTA_NEIGHBORHOODS.forEach((n) => {
    const [lat, lng] = n.coordinates || [];
    add(n.name, lat, lng);
  });

  abeokutaAreas.forEach((area) => add(area.name, area.lat, area.lng));

  return index;
}

const AREA_INDEX = buildAreaIndex();

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Circular metro check — more forgiving than rectangular bounds alone */
export function isWithinMetroRadius(lat, lng, radiusKm = MAX_RADIUS_KM) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return haversineKm(ABEOKUTA_CENTER, { lat: latitude, lng: longitude }) <= radiusKm;
}

export function isWithinAbeokutaServiceArea(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const inBounds =
    latitude >= SERVICE_BOUNDS.south &&
    latitude <= SERVICE_BOUNDS.north &&
    longitude >= SERVICE_BOUNDS.west &&
    longitude <= SERVICE_BOUNDS.east;
  return inBounds || isWithinMetroRadius(latitude, longitude);
}

export function mentionsAbeokutaArea(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  if (normalized.includes('abeokuta') || normalized.includes('ogun state') || normalized === 'ogun') {
    return true;
  }

  for (const name of ABK_AREA_NAMES) {
    if (normalized.includes(name)) return true;
  }

  for (const area of areas) {
    if (normalized.includes(area.name.toLowerCase())) return true;
  }

  for (const n of ABEOKUTA_NEIGHBORHOODS) {
    if (normalized.includes(n.name.toLowerCase())) return true;
  }

  return false;
}

function landmarkSearchQueries(normalized) {
  const queries = [normalized];
  const words = normalized.split(' ').filter((w) => w.length >= 2);
  for (const word of words) queries.push(word);
  for (let i = 0; i < words.length - 1; i += 1) {
    queries.push(`${words[i]} ${words[i + 1]}`);
  }
  return [...new Set(queries)];
}

/** High-priority Abeokuta businesses — checked before generic area snapping. */
const KNOWN_ABK_BUSINESSES = [
  {
    tokens: ['peak olam', 'peakolam', 'peak-olam'],
    lat: 7.1572,
    lng: 3.3470,
    label: 'Peak Olam Suites, Camp',
  },
  {
    tokens: ['7linkz', '7 linkz'],
    lat: 7.1588,
    lng: 3.3515,
    label: '7Linkz Phone Village, Panseke',
  },
];

function scoreLandmarkMatch(normalized, landmark) {
  const fields = [landmark.name, landmark.shortName, landmark.address]
    .filter(Boolean)
    .map((f) => normalizeText(f));

  let score = 0;
  for (const field of fields) {
    if (!field) continue;
    if (normalized === field) score += 200;
    else if (normalized.includes(field)) score += field.length + 20;
    else if (field.includes(normalized)) score += normalized.length + 10;
  }

  const words = normalized.split(' ').filter((w) => w.length >= 3);
  for (const word of words) {
    for (const field of fields) {
      if (field.includes(word)) score += word.length;
    }
  }

  return score;
}

function pickBestLandmark(normalized) {
  let best = null;
  let bestScore = 0;

  for (const query of landmarkSearchQueries(normalized)) {
    for (const landmark of searchLandmarks(query)) {
      const score = scoreLandmarkMatch(normalized, landmark);
      if (score > bestScore) {
        bestScore = score;
        best = landmark;
      }
    }
  }

  return bestScore >= 4 ? best : null;
}

function pickBestAreaMatch(normalized) {
  let best = null;
  let bestScore = 0;

  for (const [key, coords] of AREA_INDEX.entries()) {
    if (key.length < 3) continue;
    if (normalized === key) {
      const score = key.length + 100;
      if (score > bestScore) {
        bestScore = score;
        best = coords;
      }
      continue;
    }
    if (!normalized.includes(key)) continue;
    const score = key.length;
    if (score > bestScore) {
      bestScore = score;
      best = coords;
    }
  }

  return best;
}

export function resolveLocalAreaCoords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const biz of KNOWN_ABK_BUSINESSES) {
    if (biz.tokens.some((token) => normalized.includes(token))) {
      return { lat: biz.lat, lng: biz.lng, label: biz.label };
    }
  }

  const landmark = pickBestLandmark(normalized);
  if (landmark) {
    return { lat: landmark.lat, lng: landmark.lng, label: landmark.shortName || landmark.name };
  }

  const areaMatch = pickBestAreaMatch(normalized);
  if (areaMatch) return areaMatch;

  for (const area of areas) {
    const name = area.name.toLowerCase();
    if (normalized === name || normalized.includes(name)) {
      return { lat: area.lat, lng: area.lng, label: area.name };
    }
  }

  for (const n of ABEOKUTA_NEIGHBORHOODS) {
    const name = n.name.toLowerCase();
    if (normalized.includes(name) && n.coordinates?.length === 2) {
      return { lat: n.coordinates[0], lng: n.coordinates[1], label: n.name };
    }
  }

  return null;
}

/** Prefer real geocode/GPS. Only fix swapped lat/lng — never snap to neighborhood center. */
export function preferLocalAreaCoords(address, geocoded) {
  if (!geocoded?.lat || !geocoded?.lng) return geocoded;

  const fixed = fixNigeriaCoords(geocoded.lat, geocoded.lng);
  const coords = { lat: fixed.lat, lng: fixed.lng };

  // Keep precise pins. Area catalog snaps destroy street-level accuracy.
  return fixed.swapped ? { ...coords, snapped: true } : { ...geocoded, lat: coords.lat, lng: coords.lng };
}

/**
 * Validate a delivery location using coords first, then Abeokuta place names.
 */
export function validateServiceLocation({ lat, lng, address = '', label = '' } = {}) {
  const text = `${address} ${label}`.trim();
  const fixed = fixNigeriaCoords(lat, lng);
  const parsedLat = fixed.lat;
  const parsedLng = fixed.lng;
  const hasCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
  const coordSwapped = fixed.swapped;

  // Trust real geocoded coordinates first — they are specific to the exact
  // address the user picked. Only fall back to generic area/text matching
  // (which collapses many different addresses onto the same landmark point)
  // when we don't have usable coordinates inside the service area.
  if (hasCoords && (isWithinAbeokutaServiceArea(parsedLat, parsedLng) || isWithinMetroRadius(parsedLat, parsedLng))) {
    return {
      valid: true,
      lat: parsedLat,
      lng: parsedLng,
      snapped: coordSwapped,
      message: coordSwapped ? 'Corrected coordinate order' : 'Inside Abeokuta zone',
      distance: haversineKm(ABEOKUTA_CENTER, { lat: parsedLat, lng: parsedLng }),
    };
  }

  if (mentionsAbeokutaArea(text)) {
    const local = resolveLocalAreaCoords(text);
    // Only use area centroid when we have NO real coords — never invent city center
    if (local && !hasCoords) {
      return {
        valid: true,
        lat: local.lat,
        lng: local.lng,
        snapped: true,
        message: `Using ${local.label} coordinates`,
      };
    }
    if (!hasCoords) {
      return {
        valid: false,
        lat: null,
        lng: null,
        snapped: false,
        message: 'Pick a precise place from suggestions or use GPS',
      };
    }
  }

  if (hasCoords) {
    const distance = haversineKm(ABEOKUTA_CENTER, { lat: parsedLat, lng: parsedLng });
    if (distance <= MAX_RADIUS_KM) {
      return {
        valid: true,
        lat: parsedLat,
        lng: parsedLng,
        snapped: coordSwapped,
        message: 'Inside Abeokuta metro radius',
        distance,
      };
    }
    // Never soft-snap toward city center — that sends riders to the wrong place
    return {
      valid: false,
      lat: parsedLat,
      lng: parsedLng,
      snapped: false,
      message: 'Location seems outside Abeokuta delivery area',
      distance,
    };
  }

  return {
    valid: false,
    lat: hasCoords ? parsedLat : null,
    lng: hasCoords ? parsedLng : null,
    snapped: false,
    message: 'Location seems outside Abeokuta delivery area',
  };
}

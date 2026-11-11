/**
 * Production road distance — Google Distance Matrix (via server-side Cloud
 * Function, most accurate for Nigerian roads) first, then ORS, then OSRM,
 * then a straight-line estimate as the last resort.
 */
import { httpsCallable } from 'firebase/functions';
import { fetchRoute, calculateStraightLineDistance } from '../lib/lib/geo/osrm.js';
import { estimateDeliveryTime } from './fareUtils.js';
import { ORS_API_KEY } from '../config/routing.js';
import { functions } from '../firebase/config';

const getDistanceMatrixFn = httpsCallable(functions, 'getDistanceMatrix');

async function fetchRouteGoogle(from, to) {
  const result = await getDistanceMatrixFn({ origin: from, destination: to });
  const data = result.data || {};
  if (!data.success || typeof data.distanceKm !== 'number') {
    throw new Error(data.error || 'Distance Matrix function returned no data');
  }
  return {
    km: Math.round(data.distanceKm * 10) / 10,
    durationMin: data.durationMinutes ?? estimateDeliveryTime(data.distanceKm),
    source: 'google',
  };
}

const IS_PROD = import.meta.env.PROD;
const USE_CUSTOM_OSRM = Boolean(
  import.meta.env.VITE_OSRM_URL || import.meta.env.VITE_DIRECTIONS_URL
);

function normalizePoint(coords) {
  if (!coords) return null;
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function fetchRouteORS(from, to, apiKey) {
  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      Accept: 'application/json, application/geo+json',
    },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
      units: 'km',
    }),
  });

  if (!response.ok) {
    throw new Error(`ORS API error: ${response.status}`);
  }

  const data = await response.json();
  const summary = data?.routes?.[0]?.summary;
  if (!summary) {
    throw new Error('Invalid ORS response');
  }

  const distanceKm =
    summary.distance > 1000 ? summary.distance / 1000 : summary.distance;

  return {
    km: Math.round(distanceKm * 10) / 10,
    durationMin: Math.round(summary.duration / 60),
    source: 'ors',
  };
}

async function tryOsrm(from, to) {
  if (IS_PROD && !USE_CUSTOM_OSRM) {
    throw new Error('Public OSRM disabled in production — use ORS or set VITE_OSRM_URL');
  }
  const route = await fetchRoute(from, to);
  return {
    km: route.distance,
    durationMin: route.duration,
    source: 'osrm',
  };
}

/**
 * @returns {Promise<{ km: number, durationMin: number, source: 'osrm' | 'ors' | 'estimate' }>}
 */
export async function getRoadDistanceKm(pickup, dropoff) {
  const from = normalizePoint(pickup);
  const to = normalizePoint(dropoff);
  if (!from || !to) {
    return { km: 0, durationMin: 0, source: 'estimate' };
  }

  const attempts = IS_PROD
    ? [
        () => fetchRouteGoogle(from, to),
        () => fetchRouteORS(from, to, ORS_API_KEY),
        () => tryOsrm(from, to),
      ]
    : [
        () => tryOsrm(from, to),
        () => fetchRouteGoogle(from, to),
        () => fetchRouteORS(from, to, ORS_API_KEY),
      ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.km > 0) {
        console.log(`[routing] ${result.source} active:`, result.km, 'km');
        return result;
      }
    } catch (err) {
      console.warn('[routing] attempt failed:', err?.message);
    }
  }

  let straightKm = calculateStraightLineDistance(from, to);
  // Identical snapped coords (e.g. both matched generic "Camp") — use short urban minimum
  if (straightKm < 0.05) {
    straightKm = 0.5;
  }
  const km = Math.round(straightKm * 1.25 * 10) / 10;
  console.warn('[routing] Using distance estimate:', km, 'km');
  return {
    km,
    durationMin: estimateDeliveryTime(km),
    source: 'estimate',
  };
}

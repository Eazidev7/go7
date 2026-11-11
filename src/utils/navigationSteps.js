/** Helpers for in-app turn-by-turn navigation. */

const R = 6371000;

export function haversineMeters(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function bearingDegrees(from, to) {
  if (!from || !to) return 0;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function latLngFromGoogle(loc) {
  if (!loc) return null;
  if (typeof loc.lat === 'function') {
    return { lat: loc.lat(), lng: loc.lng() };
  }
  return { lat: Number(loc.lat), lng: Number(loc.lng) };
}

export function extractRouteSteps(directions) {
  const leg = directions?.routes?.[0]?.legs?.[0];
  if (!leg?.steps?.length) return [];
  return leg.steps.map((step, index) => ({
    index,
    instruction: stripHtml(step.instructions || ''),
    distanceText: step.distance?.text || '',
    distanceMeters: step.distance?.value || 0,
    durationText: step.duration?.text || '',
    start: latLngFromGoogle(step.start_location),
    end: latLngFromGoogle(step.end_location),
    maneuver: step.maneuver || '',
  }));
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pick the step the rider should follow next. */
export function findActiveStepIndex(steps, riderLocation) {
  if (!steps?.length || !riderLocation) return 0;

  for (let i = 0; i < steps.length; i += 1) {
    const distToEnd = haversineMeters(riderLocation, steps[i].end);
    if (distToEnd > 35) return i;
  }

  return Math.max(0, steps.length - 1);
}

export function formatStepDistance(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function maneuverIcon(maneuver) {
  const m = String(maneuver || '').toLowerCase();
  if (m.includes('left')) return '↰';
  if (m.includes('right')) return '↱';
  if (m.includes('uturn') || m.includes('u-turn')) return '↩';
  if (m.includes('roundabout')) return '⟳';
  if (m.includes('merge')) return '⤴';
  if (m.includes('straight') || m.includes('continue')) return '↑';
  return '↑';
}

/**
 * Go7 vehicle-type normalization + dispatch preference — server-side mirror.
 * Vehicle types are for rider/dispatch, NOT a mandatory customer selection.
 */
const VEHICLE_TYPES = { BICYCLE: 'BICYCLE', EBIKE: 'EBIKE', MOTORCYCLE: 'MOTORCYCLE' };

const ALIASES = {
  bicycle: VEHICLE_TYPES.BICYCLE,
  bike: VEHICLE_TYPES.BICYCLE,
  'push_bike': VEHICLE_TYPES.BICYCLE,
  ebike: VEHICLE_TYPES.EBIKE,
  e_bike: VEHICLE_TYPES.EBIKE,
  electric_bike: VEHICLE_TYPES.EBIKE,
  electric: VEHICLE_TYPES.EBIKE,
  motorcycle: VEHICLE_TYPES.MOTORCYCLE,
  moto: VEHICLE_TYPES.MOTORCYCLE,
  motorcycle_2: VEHICLE_TYPES.MOTORCYCLE,
  okada: VEHICLE_TYPES.MOTORCYCLE,
};

function normalizeVehicleType(raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
  return ALIASES[key] || null;
}

// Whether the assigned vehicle belongs to Go7 (company fleet) or to the rider.
// Drives the rider-share policy: Go7 covers fuel/maintenance/depreciation on
// Go7-owned vehicles, so Go7 keeps the larger share; rider-owned riders carry
// those costs themselves and get the larger share.
const VEHICLE_OWNERSHIP = { GO7_OWNED: 'GO7_OWNED', RIDER_OWNED: 'RIDER_OWNED' };

const OWNERSHIP_ALIASES = {
  go7: VEHICLE_OWNERSHIP.GO7_OWNED,
  go7_owned: VEHICLE_OWNERSHIP.GO7_OWNED,
  go7owned: VEHICLE_OWNERSHIP.GO7_OWNED,
  company: VEHICLE_OWNERSHIP.GO7_OWNED,
  company_owned: VEHICLE_OWNERSHIP.GO7_OWNED,
  fleet: VEHICLE_OWNERSHIP.GO7_OWNED,
  go7_bike: VEHICLE_OWNERSHIP.GO7_OWNED,
  rider: VEHICLE_OWNERSHIP.RIDER_OWNED,
  rider_owned: VEHICLE_OWNERSHIP.RIDER_OWNED,
  riderowned: VEHICLE_OWNERSHIP.RIDER_OWNED,
  self: VEHICLE_OWNERSHIP.RIDER_OWNED,
  self_owned: VEHICLE_OWNERSHIP.RIDER_OWNED,
  personal: VEHICLE_OWNERSHIP.RIDER_OWNED,
  own: VEHICLE_OWNERSHIP.RIDER_OWNED,
};

function normalizeVehicleOwnership(raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
  return OWNERSHIP_ALIASES[key] || null;
}

function preferredVehiclesForDistance(distanceKm) {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km < 0) return [];
  if (km < 3) {
    return [
      { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.EBIKE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 1 },
    ];
  }
  if (km < 5) {
    return [
      { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 2 },
      { vehicleType: VEHICLE_TYPES.EBIKE, priority: 2 },
      { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 2 },
    ];
  }
  if (km < 8) {
    return [
      { vehicleType: VEHICLE_TYPES.EBIKE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 1 },
    ];
  }
  return [
    { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 3 },
    { vehicleType: VEHICLE_TYPES.EBIKE, priority: 2 },
    { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 1 },
  ];
}

function preferredVehicleForDistance(distanceKm) {
  const list = preferredVehiclesForDistance(distanceKm);
  if (list.length === 0) return null;
  return list.reduce((a, b) => (b.priority > a.priority ? b : a)).vehicleType;
}

function toNum(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

/**
 * Built-in operating policy, used when pricingSettings has no explicit
 * vehicleRules. Admin config always wins — these are the launch defaults:
 *   0–5 km   → BICYCLE only
 *   >5–8 km  → BICYCLE preferred, MOTORCYCLE allowed
 *   >8 km    → MOTORCYCLE only
 * Distance bands are "min exclusive, max inclusive" (5 km = bicycle-only,
 * 5.01 km opens motorcycle).
 */
const DEFAULT_VEHICLE_RULES = {
  GENERAL_DELIVERY: {
    BICYCLE: {
      enabled: true,
      preferred: true,
      preferredMinKm: 0,
      preferredMaxKm: 8,
      allowedMinKm: 0,
      allowedMaxKm: 8,
    },
    MOTORCYCLE: {
      enabled: true,
      preferred: true,
      preferredMinKm: 8,
      allowedMinKm: 5,
    },
    allowMotorcycleFallback: true,
  },
};

const POLICY_FLAG_KEYS = new Set(['allowmotorcyclefallback', 'fallback', 'bands']);

/**
 * Canonical vehicle-eligibility policy resolver.
 *
 * Reads `config.vehicleRules` (or legacy `config.vehicleEligibility`) and returns
 * the dispatch policy for a given distance/package/urgency. `availableVehicleTypes`
 * is optional; when provided it intersects the configured eligible vehicles with
 * vehicles that are actually online so the policy never claims availability
 * purely from configuration.
 *
 * Returns:
 *   preferredVehicle   — configured preferred type (or best available fallback)
 *   eligibleVehicles   — policy-eligible types (availability-intersected when
 *                        availability was provided; engaged fallback included)
 *   allowedVehicles    — the full dispatch set: eligible + configured fallback
 *                        types (motorcycle covering for bicycle when allowed)
 *   reason             — SHORT_DISTANCE / MEDIUM_DISTANCE / PREMIUM_DISTANCE /
 *                        LONG_DISTANCE
 */
function getEligibleVehiclePolicy(params, config) {
  const p = params || {};
  const distanceKm = Math.max(0, toNum(p.distanceKm, 0));
  const orderType = String(p.orderType || 'GENERAL_DELIVERY').toUpperCase();
  const available = Array.isArray(p.availableVehicleTypes)
    ? [...new Set(p.availableVehicleTypes.map(normalizeVehicleType).filter(Boolean))]
    : null;

  const rawRules = (config && (config.vehicleRules || config.vehicleEligibility)) || DEFAULT_VEHICLE_RULES;

  // Config may be keyed by order type ({ GENERAL_DELIVERY: { BICYCLE: ... } })
  // or directly by vehicle ({ BICYCLE: ..., MOTORCYCLE: ... }). If no top-level
  // key is a vehicle type, treat it as orderType-keyed.
  const topKeys = Object.keys(rawRules || {});
  const keyedByOrderType =
    topKeys.length > 0 &&
    topKeys.every((k) => !normalizeVehicleType(k) || POLICY_FLAG_KEYS.has(k.toLowerCase()));
  const rules = (keyedByOrderType ? rawRules[orderType] || {} : rawRules) || {};

  const allowFallback = rules.allowMotorcycleFallback !== false && rules.fallback !== false;

  const eligible = [];
  let preferred = null;
  let reason = 'DEFAULT';

  if (Array.isArray(rules.bands) && rules.bands.length) {
    // Legacy shape: { bands: [{ maxKm, vehicleType }] } — first matching band
    // ("up to maxKm use vehicleType") wins; ANY means all configured types.
    const sorted = [...rules.bands].sort((a, b) => toNum(a && a.maxKm, Infinity) - toNum(b && b.maxKm, Infinity));
    const match = sorted.find((b) => distanceKm <= toNum(b && b.maxKm, Infinity));
    const vt = match && String(match.vehicleType || '').toUpperCase();
    if (vt === 'ANY') eligible.push(VEHICLE_TYPES.BICYCLE, VEHICLE_TYPES.MOTORCYCLE);
    else if (vt && normalizeVehicleType(vt)) eligible.push(normalizeVehicleType(vt));
    preferred = eligible[0] || null;
  } else {
    for (const [key, rule] of Object.entries(rules)) {
      if (POLICY_FLAG_KEYS.has(key.toLowerCase())) continue;
      const vt = normalizeVehicleType(key) || String(key).toUpperCase();
      if (!rule || rule.enabled === false) continue;

      const allowedMin = toNum(rule.allowedMinKm ?? rule.minKm ?? rule.preferredMinKm, 0);
      const allowedMax = toNum(rule.allowedMaxKm ?? rule.maxKm ?? rule.preferredMaxKm, Infinity);
      // Distance bands are "min exclusive, max inclusive" to match the policy
      // notation (0–5 bicycle, >5–8 mixed, >8 motorcycle).
      if (distanceKm <= allowedMin || distanceKm > allowedMax) continue;

      eligible.push(vt);

      const isPreferred =
        rule.preferred === true ||
        (rule.preferred !== false &&
          distanceKm > toNum(rule.preferredMinKm ?? allowedMin, 0) &&
          distanceKm <= toNum(rule.preferredMaxKm ?? allowedMax, Infinity));
      if (!preferred && isPreferred) preferred = vt;
    }
  }

  // Dispatch-allowed set: eligible + motorcycle fallback when configured.
  // A MOTORCYCLE rule that is explicitly disabled still blocks the fallback.
  const motoRule = rules[VEHICLE_TYPES.MOTORCYCLE] || rules.motorcycle || rules.moto;
  const motoEnabled = !motoRule || motoRule.enabled !== false;
  const configuredAllowed =
    allowFallback && motoEnabled && !eligible.includes(VEHICLE_TYPES.MOTORCYCLE)
      ? [...eligible, VEHICLE_TYPES.MOTORCYCLE]
      : [...eligible];

  // Intersect with real availability when supplied; otherwise stay configured.
  let filtered = available ? eligible.filter((vt) => available.includes(vt)) : eligible;
  const allowed = available ? configuredAllowed.filter((vt) => available.includes(vt)) : configuredAllowed;
  if (filtered.length === 0 && available && allowFallback && allowed.length) {
    // Policy types unavailable but an allowed fallback vehicle is online.
    filtered = [...allowed];
  }
  // When actual availability is provided, eligibleVehicles reflects what can
  // really be assigned; when absent (pricing-time policy) it stays configured.
  const finalEligible = available ? filtered : eligible;

  if (preferred && !finalEligible.includes(preferred)) {
    preferred = finalEligible[0] || preferred;
  }
  if (!preferred) preferred = finalEligible[0] || null;

  if (distanceKm <= 5) reason = 'SHORT_DISTANCE';
  else if (distanceKm <= 8) reason = 'MEDIUM_DISTANCE';
  else if (distanceKm <= 15) reason = 'PREMIUM_DISTANCE';
  else reason = 'LONG_DISTANCE';

  return { preferredVehicle: preferred, eligibleVehicles: finalEligible, allowedVehicles: allowed, reason };
}

module.exports = {
  VEHICLE_TYPES,
  VEHICLE_OWNERSHIP,
  DEFAULT_VEHICLE_RULES,
  normalizeVehicleType,
  normalizeVehicleOwnership,
  preferredVehiclesForDistance,
  preferredVehicleForDistance,
  getEligibleVehiclePolicy,
};

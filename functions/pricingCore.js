/**
 * Go7 canonical delivery pricing engine — server-side mirror.
 *
 * Faithful CommonJS port of src/lib/pricingCore.ts. The backend is the
 * authoritative source for delivery fees; it NEVER trusts client values.
 * While `config.enabled === false` it preserves legacy behaviour per order
 * type (e.g. FOOD ₦500).
 */
const { detectDeliveryZone, normalizeZone, pointInPolygon } = require('./deliveryZone');
const { getEligibleVehiclePolicy, normalizeVehicleType, normalizeVehicleOwnership, VEHICLE_OWNERSHIP, DEFAULT_VEHICLE_RULES } = require('./vehicleType');

const ORDER_TYPES = {
  FOOD: 'FOOD',
  MARKET: 'MARKET',
  PHARMACY: 'PHARMACY',
  GENERAL_DELIVERY: 'GENERAL_DELIVERY',
  FUEL: 'FUEL',
};

const PRICING_CORE_VERSION = 1;

const roundNaira = (n) => Math.round(Number(n));
const toNum = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function numOrUndef(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeOrderTypeConfig(raw) {
  return {
    // Unconfigured order types are DISABLED (outside-service-area) until
    // explicitly enabled — e.g. FUEL is never silently priced by this engine.
    enabled: raw ? raw.enabled !== false : false,
    distanceMode: (raw && raw.distanceMode) || 'linear',
    // Unset scalars stay `undefined` so the engine falls back to global
    // defaults instead of 0 (min/max clamp inheritance, base fee, etc.).
    baseFee: numOrUndef(raw && raw.baseFee),
    includedKm: numOrUndef(raw && raw.includedKm),
    perKmAfterIncluded: numOrUndef(raw && raw.perKmAfterIncluded),
    flatFee: numOrUndef(raw && raw.flatFee),
    minimumFee: numOrUndef(raw && raw.minimumFee),
    maximumFee: numOrUndef(raw && raw.maximumFee),
    maxDistanceKm: numOrUndef(raw && raw.maxDistanceKm),
    roundingStepping: numOrUndef(raw && raw.roundingStepping),
    bands: Array.isArray(raw && raw.bands) ? raw.bands : [],
    additionalFees: Array.isArray(raw && raw.additionalFees) ? raw.additionalFees : [],
    discounts: Array.isArray(raw && raw.discounts) ? raw.discounts : [],
    freeDeliveryThreshold: numOrUndef(raw && raw.freeDeliveryThreshold),
  };
}

const DEFAULT_SINGLE = {
  distanceMode: 'linear',
  baseFee: 1000,
  includedKm: 2,
  perKmAfterIncluded: 150,
  minimumFee: 1000,
  maximumFee: 6000,
};

// ---------------------------------------------------------------------------
// Built-in launch policy when admin has not configured rider-share rules.
// Share depends on WHO owns the vehicle:
//   Go7-owned bicycle/motorcycle (Go7 covers fuel/maintenance/depreciation):
//     rider 40% / Go7 60% at all distances
//   Rider-owned vehicle ≤15 km: rider 60% / Go7 40%
//   Rider-owned vehicle >15 km: rider 65% / Go7 35%
// Other order types keep their configured/legacy share (default 50%).
// Bands without an `ownership` field apply to all riders (legacy admin config).
// Declared before normalizePricingConfig's first use at module init.
// ---------------------------------------------------------------------------
// HARD BUSINESS RULE: a Go7-owned vehicle never pays the rider more than Go7.
// Go7 funds the vehicle, fuel, maintenance and depreciation, so the rider share
// on GO7_OWNED is capped at 50% regardless of admin config or corridor override.
const MAX_GO7_OWNED_SHARE = 0.5;

// Operating economics defaults — referenced by normalizePricingConfig during
// module init (DEFAULT_PRICING_CONFIG), so the const must precede it.
const DEFAULT_ECONOMICS = {
  fuelPricePerLiter: 900,
  motorcycleKmPerLiter: 35,
  bicycleOperatingCostPerKm: 20,
  motorcycleOperatingCostPerKm: 55,
  go7VehicleMaintenanceAllowance: 100, // ₦ per order on Go7-owned vehicles
  paymentProcessingCost: 0.015, // decimal rate on customer grand total (Paystack ~1.5%)
  otherOperationalCost: 0, // flat ₦ per order
  lowContributionRatio: 0.25, // contribution below this fraction of fee → LOW_CONTRIBUTION
};

// Default share for a GO7_OWNED vehicle when no band/config matches. Kept
// below the hard cap — the policy default is 40% rider / 60% Go7.
const GO7_OWNED_DEFAULT_SHARE = 0.4;

// Ownership-aware rider-share matrix — the GLOBAL default applied to every
// order type (resolveRuleForOrderType falls back to top-level `bands`).
// pricingSettings/current may override per order type.
const DEFAULT_RIDER_SHARE_RULES = {
  bands: [
    { ownership: 'GO7_OWNED', share: GO7_OWNED_DEFAULT_SHARE, rule: 'GO7_OWNED' },
    { ownership: 'RIDER_OWNED', maxKm: 15, share: 0.6, rule: 'RIDER_OWNED_STANDARD' },
    { ownership: 'RIDER_OWNED', share: 0.65, rule: 'RIDER_OWNED_LONG_DISTANCE' },
  ],
};

// Default radius around a corridor endpoint's canonical coordinate that still
// counts as "inside" the area for pricing purposes. Admin may override per
// endpoint ({key, radiusKm}) or per corridor (radiusKm).
// Endpoint proximity radius for corridor matching when no explicit coords/radius
// are configured on the area. Kept tight (1 km) so adjacent areas stay distinct —
// e.g. Kuto (~1.7 km from Camp centre) must NOT match the Camp ↔ FUNAAB corridor.
// Admin can widen per-corridor via radiusKm when a wider catchment is intended.
const DEFAULT_CORRIDOR_RADIUS_KM = 1;

function normalizeServiceArea(raw) {
  return {
    enabled: raw && raw.enabled === true,
    bounds: (raw && raw.bounds) || { south: 6.72, north: 7.58, west: 2.92, east: 3.88 },
    center: (raw && raw.center) || { lat: 7.1475, lng: 3.3619 },
    maxRadiusKm: toNum(raw && raw.maxRadiusKm, 48),
    polygon: Array.isArray(raw && raw.polygon) ? raw.polygon : undefined,
  };
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Overall service-coverage check. If a service area is configured it is the
 * authoritative boundary; named zones are OPTIONAL groupings inside it and
 * never define the boundary. No service area => everything is in coverage.
 */
function isWithinServiceArea(lat, lng, serviceArea) {
  if (!serviceArea) return true;
  if (Array.isArray(serviceArea.polygon) && serviceArea.polygon.length >= 3) {
    return pointInPolygon({ lat, lng }, serviceArea.polygon);
  }
  const b = serviceArea.bounds || {};
  const inBounds =
    lat >= toNum(b.south) && lat <= toNum(b.north) &&
    lng >= toNum(b.west) && lng <= toNum(b.east);
  let inRadius = false;
  if (serviceArea.center && serviceArea.maxRadiusKm > 0) {
    inRadius = haversineKm(serviceArea.center, { lat, lng }) <= serviceArea.maxRadiusKm;
  }
  return inBounds || inRadius;
}

function normalizePricingConfig(raw) {
  const global = normalizeOrderTypeConfig(raw && raw.global);
  const orderTypes = {};
  for (const key of Object.keys(ORDER_TYPES)) {
    orderTypes[key] = normalizeOrderTypeConfig((raw && raw.orderTypes && raw.orderTypes[key]));
  }
  const zones = (Array.isArray(raw && raw.zones) ? raw.zones : [])
    .map(normalizeZone)
    .filter((z) => z !== null);

  return {
    enabled: raw && raw.enabled === true,
    legacyDefaultFee: toNum(raw && raw.legacyDefaultFee, 500),
    roundingStepping: toNum(raw && raw.roundingStepping, 50),
    global,
    orderTypes,
    zones,
    serviceArea: normalizeServiceArea(raw && raw.serviceArea),
    // Admin-configurable vehicle + rider-share rules. Prefer the new names but
    // keep the older keys as aliases; absent config falls back to the built-in
    // launch policy (bicycle-first short trips, 55% rider share >15 km).
    vehicleRules: (raw && (raw.vehicleRules || raw.vehicleEligibility)) || DEFAULT_VEHICLE_RULES,
    riderShareRules: (raw && (raw.riderShareRules || raw.riderShare)) || DEFAULT_RIDER_SHARE_RULES,
    // High-density pricing corridors (admin-configured; never widen service area).
    corridors: normalizeCorridors(raw && (raw.corridors || (raw.deliveryPricing && raw.deliveryPricing.corridors))),
    // Operating economics — analysis/decision-support assumptions only.
    economics: normalizeEconomics(raw && (raw.economics || (raw.deliveryPricing && raw.deliveryPricing.economics))),
    outsideServiceArea:
      (raw && raw.outsideServiceArea) || {
        message: 'Go7 does not currently deliver to this location.',
        allowOrder: false,
      },
  };
}

const DEFAULT_PRICING_CONFIG = normalizePricingConfig({
  enabled: false,
  legacyDefaultFee: 500,
  roundingStepping: 50,
  global: DEFAULT_SINGLE,
  orderTypes: {
    // FOOD final launch bands (only apply while config.enabled === true):
    // 0–2 ₦600 · 2–4 ₦800 · 4–6 ₦1,000 · 6–8 ₦1,200 · 8–10 ₦1,500 ·
    // 10–15 ₦1,800 · >15 ₦2,200 + ₦100/km beyond 15 km.
    FOOD: {
      distanceMode: 'bands',
      bands: [
        { minKm: 0, maxKm: 2, fee: 600 },
        { minKm: 2, maxKm: 4, fee: 800 },
        { minKm: 4, maxKm: 6, fee: 1000 },
        { minKm: 6, maxKm: 8, fee: 1200 },
        { minKm: 8, maxKm: 10, fee: 1500 },
        { minKm: 10, maxKm: 15, fee: 1800 },
        { minKm: 15, fee: 2200, perKmBeyond: 100 },
      ],
      minimumFee: 500,
      maximumFee: 6000,
    },
    MARKET: { distanceMode: 'linear', baseFee: 400, perKmAfterIncluded: 100, minimumFee: 400 },
    PHARMACY: { distanceMode: 'linear', baseFee: 350, perKmAfterIncluded: 90, minimumFee: 350 },
    // BOOK DELIVERY final launch bands:
    // 0–3 ₦900 · 3–5 ₦1,050 · 5–8 ₦1,350 · 8–10 ₦2,500 · 10–15 ₦3,000 ·
    // 15–20 ₦3,650 · 20–25 ₦5,150 · 25–30 ₦6,050 · >30 ₦6,050 + ₦200/km.
    GENERAL_DELIVERY: {
      distanceMode: 'bands',
      bands: [
        { minKm: 0, maxKm: 3, fee: 900 },
        { minKm: 3, maxKm: 5, fee: 1050 },
        { minKm: 5, maxKm: 8, fee: 1350 },
        { minKm: 8, maxKm: 10, fee: 2500 },
        { minKm: 10, maxKm: 15, fee: 3000 },
        { minKm: 15, maxKm: 20, fee: 3650 },
        { minKm: 20, maxKm: 25, fee: 5150 },
        { minKm: 25, maxKm: 30, fee: 6050 },
        { minKm: 30, fee: 6050, perKmBeyond: 200 },
      ],
      minimumFee: 500,
      maximumFee: 0, // no fee cap — long-distance band prices trips >25 km
      maxDistanceKm: 40, // hard trip limit; service-area bounds still apply
      roundingStepping: 1,
    },
    FUEL: { enabled: false },
  },
  zones: [],
});

// ---------------------------------------------------------------------------
// Vehicle eligibility + rider share rules — admin-configurable distance bands.
// Stored under pricingSettings/current.deliveryPricing.vehicleRules and
// pricingSettings/current.deliveryPricing.riderShareRules.
// ---------------------------------------------------------------------------
function normalizeBandList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b) => ({
      maxKm: numOrUndef(b && b.maxKm),
      vehicleType: b && b.vehicleType ? String(b.vehicleType).toUpperCase() : undefined,
      ownership: b && b.ownership ? normalizeVehicleOwnership(b.ownership) || String(b.ownership).toUpperCase() : undefined,
      share: numOrUndef(b && (b.share ?? b.riderShareRate ?? b.rate)),
      rule: b && b.rule ? String(b.rule) : undefined,
    }))
    .filter((b) => b.maxKm != null || b.vehicleType || b.share != null)
    .sort((a, b2) => toNum(a.maxKm, Infinity) - toNum(b2.maxKm, Infinity));
}

function resolveRuleForOrderType(raw, orderType) {
  if (!raw) return null;
  const cfg = raw[orderType];
  if (cfg && Array.isArray(cfg.bands)) return cfg.bands;
  if (Array.isArray(raw.bands)) return raw.bands;
  return null;
}

// ---------------------------------------------------------------------------
// High-density pricing corridors — admin-configurable (pricingSettings/current
// .corridors or .deliveryPricing.corridors). A corridor is a PRICING rule only:
// it never widens the service area and never bypasses distance/zone validation.
// ---------------------------------------------------------------------------
function canonAreaKey(v) {
  return String(v == null ? '' : v)
    .toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function normalizeCorridorArea(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const key = canonAreaKey(raw);
    return key ? { key } : null;
  }
  const key = canonAreaKey(raw.key || raw.id || raw.name || raw.area);
  const lat = numOrUndef(raw.lat ?? raw.latitude);
  const lng = numOrUndef(raw.lng ?? raw.longitude);
  const radiusKm = numOrUndef(raw.radiusKm ?? raw.radius);
  if (!key && lat == null) return null;
  return { key, lat, lng, radiusKm };
}

function normalizeCorridorAreaList(raw) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map(normalizeCorridorArea).filter(Boolean);
}

function normalizeCorridors(raw) {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.entries(raw).map(([id, c]) => ({ id, ...c }))
      : [];
  return list
    .map((c) => {
      if (!c) return null;
      const id = String(c.id || c.corridorId || c.name || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
      const deliveryFee = numOrUndef(c.deliveryFee ?? c.fee ?? c.price);
      if (!id || !Number.isFinite(deliveryFee) || deliveryFee <= 0) return null;
      const allowedVehicles = (Array.isArray(c.allowedVehicles) ? c.allowedVehicles : [])
        .map(normalizeVehicleType)
        .filter(Boolean);
      return {
        id,
        name: String(c.name || id),
        enabled: c.enabled !== false,
        orderTypes: Array.isArray(c.orderTypes) && c.orderTypes.length
          ? c.orderTypes.map((t) => String(t).toUpperCase())
          : [ORDER_TYPES.GENERAL_DELIVERY],
        pickupAreas: normalizeCorridorAreaList(c.pickupAreas ?? c.pickupArea ?? c.from),
        dropoffAreas: normalizeCorridorAreaList(c.dropoffAreas ?? c.dropoffArea ?? c.to),
        bidirectional: c.bidirectional !== false,
        maxDistanceKm: numOrUndef(c.maxDistanceKm ?? c.maxKm),
        deliveryFee: roundNaira(deliveryFee),
        allowedVehicles,
        preferredVehicle: normalizeVehicleType(c.preferredVehicle) || null,
        riderShareRate: (() => {
          const rs = c.riderShareRate ?? c.riderShare ?? c.share;
          if (rs && typeof rs === 'object') {
            return {
              GO7_OWNED: numOrUndef(rs.GO7_OWNED ?? rs.go7Owned ?? rs.go7),
              RIDER_OWNED: numOrUndef(rs.RIDER_OWNED ?? rs.riderOwned ?? rs.rider),
            };
          }
          return numOrUndef(rs);
        })(),
        fallbackToDistancePricing: c.fallbackToDistancePricing !== false,
        priority: numOrUndef(c.priority) ?? 0,
        radiusKm: numOrUndef(c.radiusKm ?? c.endpointRadiusKm) ?? DEFAULT_CORRIDOR_RADIUS_KM,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Resolve a high-density corridor for a pickup→dropoff pair.
 *
 * A corridor applies only when BOTH endpoints match its configured areas AND
 * the authoritative distance is within maxDistanceKm. Endpoint matching is
 * bidirectional by default and works two ways:
 *   - canonical key match (pickupKey/dropoffKey from the location resolver), or
 *   - coordinate proximity to the area's canonical coordinates (within radiusKm)
 * so a customer cannot force corridor pricing by typing an area name.
 *
 * `locationLookup`: optional map of canonical area key → {lat,lng} (built from
 * locationResolver's loadLocations() in the quote path).
 */
function resolveCorridor(params) {
  const p = params || {};
  const corridors = Array.isArray(p.corridors) ? p.corridors : [];
  if (!corridors.length) return null;
  const orderType = String(p.orderType || ORDER_TYPES.GENERAL_DELIVERY).toUpperCase();
  const distanceKm = toNum(p.distanceKm, NaN);
  const lookup = p.locationLookup || {};
  const pickup = p.pickup;
  const dropoff = p.dropoff;
  if (!pickup || !dropoff) return null;
  const pickupKey = canonAreaKey(p.pickupKey);
  const dropoffKey = canonAreaKey(p.dropoffKey);

  const endpointMatches = (point, key, areas, corridorRadiusKm) => {
    if (!Array.isArray(areas) || !areas.length) return false;
    for (const area of areas) {
      const aKey = canonAreaKey(area.key);
      if (key && aKey && key === aKey) return true;
      const lat = area.lat != null ? area.lat : lookup[aKey] && lookup[aKey].lat;
      const lng = area.lng != null ? area.lng : lookup[aKey] && lookup[aKey].lng;
      if (lat == null || lng == null) continue;
      const radiusKm = Number.isFinite(area.radiusKm) ? area.radiusKm : corridorRadiusKm;
      if (haversineKm({ lat: point.lat, lng: point.lng }, { lat, lng }) <= radiusKm) return true;
    }
    return false;
  };

  for (const c of corridors) {
    if (c.enabled === false) continue;
    if (Array.isArray(c.orderTypes) && c.orderTypes.length && !c.orderTypes.includes(orderType)) continue;
    if (Number.isFinite(c.maxDistanceKm) && Number.isFinite(distanceKm) && distanceKm > c.maxDistanceKm) continue;

    const forward =
      endpointMatches(pickup, pickupKey, c.pickupAreas, c.radiusKm) &&
      endpointMatches(dropoff, dropoffKey, c.dropoffAreas, c.radiusKm);
    const reverse =
      c.bidirectional !== false &&
      endpointMatches(pickup, pickupKey, c.dropoffAreas, c.radiusKm) &&
      endpointMatches(dropoff, dropoffKey, c.pickupAreas, c.radiusKm);
    if (forward || reverse) return c;
  }
  return null;
}

function findCorridorById(config, corridorId) {
  if (!corridorId) return null;
  const id = String(corridorId).toUpperCase();
  const list = (config && config.corridors) || [];
  return list.find((c) => c.id === id) || null;
}

/**
 * Build canonical-key → {lat,lng} for corridor endpoint matching from the
 * locationResolver catalog ({areas, landmarks} or a flat array). Indexes each
 * location's id, name, and aliases.
 */
function buildCorridorLocationLookup(locations) {
  const lookup = {};
  const lists = Array.isArray(locations)
    ? [locations]
    : [locations && locations.areas, locations && locations.landmarks].filter(Array.isArray);
  for (const list of lists) {
    for (const loc of list) {
      if (!loc || !Number.isFinite(Number(loc.lat)) || !Number.isFinite(Number(loc.lng))) continue;
      const coords = { lat: Number(loc.lat), lng: Number(loc.lng) };
      for (const key of [loc.id, loc.key, loc.name, ...(Array.isArray(loc.aliases) ? loc.aliases : [])]) {
        const k = canonAreaKey(key);
        if (k && !lookup[k]) lookup[k] = coords;
      }
    }
  }
  return lookup;
}

function resolveVehicleType(orderType, distanceKm, config) {
  const policy = getEligibleVehiclePolicy({ orderType, distanceKm }, config);
  if (!policy || !Array.isArray(policy.eligibleVehicles) || policy.eligibleVehicles.length === 0) return null;
  if (policy.eligibleVehicles.length === 1) return policy.eligibleVehicles[0];
  return policy.preferredVehicle || 'ANY';
}

/**
 * Ownership-aware band matcher: a band applies when its `ownership` field is
 * absent (legacy/admin bands apply to everyone) or equals the rider's
 * ownership. Within the matching bands, first band whose maxKm covers the
 * distance wins (bands are sorted by maxKm ascending).
 */
function matchingShareBand(bands, distanceKm, vehicleOwnership) {
  const ownership = vehicleOwnership || VEHICLE_OWNERSHIP.RIDER_OWNED;
  const km = toNum(distanceKm, 0);
  const sorted = normalizeBandList(bands);
  // Pass 1: ownership-specific bands (most specific wins).
  for (const band of sorted) {
    if (band.ownership !== ownership) continue;
    const maxKm = toNum(band.maxKm, Infinity);
    if (km <= maxKm && band.share != null) return band;
  }
  // Pass 2: bands with no ownership apply to everyone (legacy admin config).
  for (const band of sorted) {
    if (band.ownership) continue;
    const maxKm = toNum(band.maxKm, Infinity);
    if (km <= maxKm && band.share != null) return band;
  }
  return null;
}

function resolveRiderShare(orderType, distanceKm, config, vehicleOwnership) {
  const rules = (config && (config.riderShareRules || config.riderShare)) || DEFAULT_RIDER_SHARE_RULES;
  const bands = resolveRuleForOrderType(rules, orderType);
  if (!bands || bands.length === 0) return null;
  const band = matchingShareBand(bands, distanceKm, vehicleOwnership);
  return band ? Math.max(0, Math.min(1, band.share)) : null;
}

function buildRiderShareRule(orderType, vehicleType, distanceKm, config, vehicleOwnership) {
  const rules = (config && (config.riderShareRules || config.riderShare)) || DEFAULT_RIDER_SHARE_RULES;
  const bands = resolveRuleForOrderType(rules, orderType);
  if (bands && bands.length) {
    const band = matchingShareBand(bands, distanceKm, vehicleOwnership);
    if (band && band.rule) return band.rule;
  }
  const vt = vehicleType || 'ANY';
  const own = vehicleOwnership === VEHICLE_OWNERSHIP.GO7_OWNED ? 'GO7' : 'RIDER';
  return `${orderType}_${own}_${vt}_${distanceKm > 15 ? 'LONG_DISTANCE' : 'STANDARD'}`;
}

/**
 * Canonical rider-share lookup used by pricing + payout. Returns the rate and a
 * stable rule identifier so the order can record which policy produced it.
 */
function getRiderShare(params) {
  const orderType = String((params && params.orderType) || ORDER_TYPES.GENERAL_DELIVERY).toUpperCase();
  const distanceKm = toNum(params && params.distanceKm, 0);
  const vehicleType = params && params.vehicleType ? String(params.vehicleType).toUpperCase() : null;
  const config = params && params.config;
  // Unknown ownership is treated as rider-owned: the rider who owns their
  // vehicle is the common case, and paying the rider-owned rate to an
  // unflagged fleet rider is safer than underpaying a self-funded rider.
  const vehicleOwnership = normalizeVehicleOwnership(params && params.vehicleOwnership) || VEHICLE_OWNERSHIP.RIDER_OWNED;

  // A matched pricing corridor may carry its own rider share — a flat number
  // applies to everyone; an object {GO7_OWNED, RIDER_OWNED} is per-ownership.
  if (params && params.corridorId) {
    const corridor = findCorridorById(config, params.corridorId);
    const raw = corridor && corridor.riderShareRate;
    const rate =
      raw && typeof raw === 'object'
        ? numOrUndef(raw[vehicleOwnership]) ?? numOrUndef(raw.RIDER_OWNED)
        : numOrUndef(raw);
    if (Number.isFinite(rate)) {
      let clamped = Math.max(0, Math.min(1, rate));
      // Corridor overrides obey the same hard rule: GO7_OWNED <= 50%.
      if (vehicleOwnership === VEHICLE_OWNERSHIP.GO7_OWNED && clamped > MAX_GO7_OWNED_SHARE) {
        clamped = MAX_GO7_OWNED_SHARE;
      }
      return {
        riderShareRate: clamped,
        platformShareRate: Number((1 - clamped).toFixed(4)),
        vehicleOwnership,
        rule: `${corridor.id}_CORRIDOR`,
      };
    }
  }

  const rate = resolveRiderShare(orderType, distanceKm, config, vehicleOwnership);
  let riderShareRate = Number.isFinite(rate)
    ? Number(rate.toFixed(4))
    : vehicleOwnership === VEHICLE_OWNERSHIP.GO7_OWNED
      ? GO7_OWNED_DEFAULT_SHARE
      : 0.5;
  // Hard cap: GO7-owned vehicles may never pay the rider more than Go7.
  if (vehicleOwnership === VEHICLE_OWNERSHIP.GO7_OWNED && riderShareRate > MAX_GO7_OWNED_SHARE) {
    riderShareRate = MAX_GO7_OWNED_SHARE;
  }
  return {
    riderShareRate,
    platformShareRate: Number((1 - riderShareRate).toFixed(4)),
    vehicleOwnership,
    rule: buildRiderShareRule(orderType, vehicleType, distanceKm, config, vehicleOwnership),
  };
}

/**
 * Fee of the distance band that contains `distanceKm` (0–3=₦900, 3–5=₦1050, …).
 * An open-ended band (no maxKm) may carry `perKmBeyond` — the long-distance
 * rule: fee + (distanceKm - minKm) * perKmBeyond.
 */
function bandFlatFee(cfg, distanceKm) {
  const bands = cfg.bands || [];
  if (!Array.isArray(bands) || bands.length === 0) return 0;
  const sorted = [...bands].sort((a, b) => toNum(a.minKm, 0) - toNum(b.minKm, 0));
  for (const band of sorted) {
    const minKm = toNum(band && band.minKm, 0);
    const maxKm = toNum(band && band.maxKm, Infinity);
    // Band edges are inclusive on the upper bound ("0–3 km = ₦900" covers 3.0 km;
    // sorted order means the lower band wins at a shared boundary).
    if (distanceKm >= minKm && distanceKm <= maxKm) {
      const fee = toNum(band && band.fee, 0);
      const perKmBeyond = toNum(band && band.perKmBeyond, 0);
      return fee + Math.round(Math.max(0, distanceKm - minKm) * perKmBeyond);
    }
  }
  const last = sorted[sorted.length - 1];
  const perKmBeyond = toNum(last && last.perKmBeyond, 0);
  return toNum(last && last.fee, 0) + Math.round(Math.max(0, distanceKm - toNum(last && last.minKm, 0)) * perKmBeyond);
}

function calculateDeliveryFee(params) {
  const config = normalizePricingConfig((params && params.config) || DEFAULT_PRICING_CONFIG);
  const orderType = String((params && params.orderType) || ORDER_TYPES.GENERAL_DELIVERY).toUpperCase();
  const distanceKm = Math.max(0, toNum(params && params.distanceKm, 0));
  const subtotal = Math.max(0, toNum(params && params.subtotal, 0));

  const legacy = config.enabled === false;
  const ot = config.orderTypes[orderType] || config.orderTypes[ORDER_TYPES.GENERAL_DELIVERY];

  let zoneMatch = { matched: false, zoneId: null, zoneName: null, priority: undefined };
  if (params && params.zoneId) {
    const z = config.zones.find((z2) => z2.id === params.zoneId && z2.enabled);
    if (z) zoneMatch = { matched: true, zoneId: z.id, zoneName: z.name, priority: z.priority };
  } else if (params && params.latitude != null && params.longitude != null) {
    zoneMatch = detectDeliveryZone(config.zones, params.latitude, params.longitude);
  }
  const matchedZone = zoneMatch.matched
    ? config.zones.find((z) => z.id === zoneMatch.zoneId)
    : null;

  let appliedRule;
  let baseFee = 0;
  let distanceFee = 0;
  let zoneFee = 0;
  let orderTypeFee = 0;
  let outside = false;
  let outsideMessage = null;

  // Service-area gate: the overall coverage boundary is authoritative; named
  // zones are optional groupings inside it and never define the boundary.
  // FUEL stays isolated (never gated by the general service area).
  const coordsProvided = params && params.latitude != null && params.longitude != null;
  const shouldGateServiceArea =
    !legacy &&
    coordsProvided &&
    orderType !== ORDER_TYPES.FUEL &&
    config.serviceArea &&
    config.serviceArea.enabled === true;

  if (legacy) {
    appliedRule = 'legacy';
  } else if (
    shouldGateServiceArea &&
    !isWithinServiceArea(Number(params.latitude), Number(params.longitude), config.serviceArea)
  ) {
    appliedRule = 'outside-service-area';
    outside = true;
    outsideMessage = (config.outsideServiceArea && config.outsideServiceArea.message) || null;
  } else if (matchedZone && Number.isFinite(matchedZone.baseFee) && matchedZone.baseFee != null) {
    appliedRule = 'zone';
    zoneFee = Math.max(0, toNum(matchedZone.baseFee, 0));
  } else if (ot.enabled !== false) {
    if (ot.distanceMode === 'bands') {
      appliedRule = 'distance-bands';
      baseFee = 0;
      distanceFee = bandFlatFee(ot, distanceKm);
    } else if (ot.distanceMode === 'flat') {
      appliedRule = 'flat';
      baseFee = toNum(ot.flatFee !== undefined ? ot.flatFee : ot.baseFee, 0);
    } else {
      appliedRule = 'distance-linear';
      const includedKm = toNum(ot.includedKm !== undefined ? ot.includedKm : config.global.includedKm, 0);
      const perKm = toNum(ot.perKmAfterIncluded !== undefined ? ot.perKmAfterIncluded : config.global.perKmAfterIncluded, 0);
      baseFee = toNum(ot.baseFee !== undefined ? ot.baseFee : config.global.baseFee, 0);
      distanceFee = Math.round(Math.max(0, distanceKm - includedKm) * perKm);
    }
  } else {
    appliedRule = 'outside-service-area';
    outside = true;
    outsideMessage = (config.outsideServiceArea && config.outsideServiceArea.message) || null;
  }

  const additionalFees = (ot.additionalFees || []).reduce(
    (sum, f) => sum + Math.max(0, toNum(f && f.amount)),
    0
  );
  const discounts = (ot.discounts || []).reduce(
    (sum, d) => sum + Math.max(0, toNum(d && d.amount)),
    0
  );
  const freeThreshold = toNum(ot.freeDeliveryThreshold, 0);
  const isFree = freeThreshold > 0 && subtotal >= freeThreshold;

  let subtotalBeforeClamp = baseFee + distanceFee + zoneFee + orderTypeFee + additionalFees - discounts;
  if (isFree) subtotalBeforeClamp = 0;

  const vehicleType = resolveVehicleType(orderType, distanceKm, config) || (params && params.vehicleType) || null;

  if (legacy) {
    return {
      orderType,
      appliedRule: 'legacy',
      enabled: config.enabled === true,
      legacy: true,
      zoneId: zoneMatch.zoneId,
      zoneName: zoneMatch.zoneName,
      inZone: zoneMatch.matched,
      baseFee: 0,
      distanceFee: 0,
      zoneFee: 0,
      orderTypeFee: 0,
      additionalFees: 0,
      discounts: 0,
      subtotalBeforeClamp: 0,
      deliveryFee: toNum(config.legacyDefaultFee, 500),
      minimumFee: 0,
      maximumFee: 0,
      distanceKm,
      outsideServiceArea: false,
      outsideMessage: null,
      vehicleType,
      version: PRICING_CORE_VERSION,
    };
  }

  const minimumFee = toNum(ot.minimumFee, toNum(config.global.minimumFee, 0));
  const maximumFee = toNum(ot.maximumFee, toNum(config.global.maximumFee, 0));
  let deliveryFee = subtotalBeforeClamp;
  if (!outside) {
    // Explicit zone overrides are authoritative prices and are NOT clamped by
    // the order-type/global min/max (they are their own rule).
    if (appliedRule !== 'zone' && maximumFee > 0) deliveryFee = Math.min(deliveryFee, maximumFee);
    if (appliedRule !== 'zone' && minimumFee > 0) deliveryFee = Math.max(deliveryFee, minimumFee);
    // Per-order-type rounding (e.g. BOOK DELIVERY rounds to ₦1/exact, FOOD to ₦50).
    const step = Math.max(1, toNum(ot.roundingStepping, toNum(config.roundingStepping, 50)));
    deliveryFee = Math.max(0, Math.round(deliveryFee / step) * step);
    if (appliedRule !== 'zone' && deliveryFee < minimumFee && minimumFee > 0) deliveryFee = minimumFee;
  }

  return {
    orderType,
    appliedRule,
    enabled: config.enabled === true,
    legacy,
    zoneId: zoneMatch.zoneId,
    zoneName: zoneMatch.zoneName,
    inZone: zoneMatch.matched,
    baseFee,
    distanceFee,
    zoneFee,
    orderTypeFee,
    additionalFees,
    discounts,
    subtotalBeforeClamp,
    deliveryFee,
    minimumFee,
    maximumFee,
    distanceKm,
    outsideServiceArea: outside,
    outsideMessage,
    vehicleType,
    version: PRICING_CORE_VERSION,
  };
}

function getDeliveryFee(params, config) {
  return calculateDeliveryFee(Object.assign({}, params, config ? { config } : {})).deliveryFee;
}

function verifyDeliveryFeeAgainstQuote(quoteFee, params, config, tolerance) {
  const result = calculateDeliveryFee(Object.assign({}, params, { config }));
  if (result.outsideServiceArea) return { valid: false, serverFee: 0, difference: Infinity };
  const difference = Math.abs(toNum(quoteFee) - result.deliveryFee);
  return {
    valid: difference <= (Number.isFinite(tolerance) ? tolerance : 50),
    serverFee: result.deliveryFee,
    difference,
  };
}

// ---------------------------------------------------------------------------
// Admin-config validation — canonical, shared by admin save + server enforcement.
// ---------------------------------------------------------------------------

/**
 * Validate a distance-band list before it is persisted. Returns
 * {valid, errors[]}. The canonical band convention is CONTIGUOUS + UPPER-
 * INCLUSIVE: sorted by minKm, each band's minKm must equal the previous
 * band's maxKm, and a shared boundary belongs to the LOWER band
 * (0–2 km then >2–4 km: 2.0 km is the first band's price, 2.01 the next).
 * Rules enforced:
 *   - first band must start at 0 (no gap at the origin)
 *   - no overlaps and no gaps between consecutive bands
 *   - fees must be finite and >= 0
 *   - only the final band may be open-ended (no maxKm)
 *   - perKmBeyond is only meaningful on the final open band
 *   - maxDistanceKm, when present, must be > 0
 * The engine itself stays deterministic even for malformed input (first
 * sorted band wins), so this validator is the save-time gate.
 */
function validateDistanceBands(bands, scope) {
  const errors = [];
  const s = scope || 'bands';
  if (!Array.isArray(bands) || bands.length === 0) {
    errors.push(`${s}: at least one band is required`);
    return { valid: false, errors };
  }
  const sorted = [...bands].sort((a, b) => toNum(a && a.minKm, 0) - toNum(b && b.minKm, 0));
  let prevMax = null;
  sorted.forEach((b, i) => {
    const minKm = toNum(b && b.minKm, NaN);
    const maxKm = b && (b.maxKm === null || b.maxKm === undefined) ? null : toNum(b.maxKm, NaN);
    const fee = toNum(b && b.fee, NaN);
    const perKmBeyond = toNum(b && b.perKmBeyond, 0);
    const label = `${s}[${i}] ${minKm}–${maxKm == null ? '∞' : maxKm} km`;
    if (!Number.isFinite(minKm) || minKm < 0) errors.push(`${label}: minKm must be >= 0`);
    if (maxKm != null && (!Number.isFinite(maxKm) || maxKm <= minKm)) {
      errors.push(`${label}: maxKm must be > minKm`);
    }
    if (!Number.isFinite(fee) || fee < 0) errors.push(`${label}: fee must be >= 0`);
    if (perKmBeyond < 0) errors.push(`${label}: perKmBeyond cannot be negative`);
    if (i === 0) {
      if (minKm > 0) errors.push(`${label}: first band must start at 0 km`);
    } else {
      if (prevMax == null) {
        errors.push(`${label}: a closed band cannot follow an open-ended band`);
      } else if (minKm < prevMax) {
        errors.push(`${label}: overlaps the previous band (minKm ${minKm} < ${prevMax})`);
      } else if (minKm > prevMax) {
        errors.push(`${label}: gap before this band (${prevMax}–${minKm} km unpriced)`);
      }
      if (i < sorted.length - 1 && maxKm == null) {
        errors.push(`${label}: only the final band may be open-ended`);
      }
    }
    if (perKmBeyond > 0 && maxKm != null) {
      errors.push(`${label}: perKmBeyond only applies to the open-ended final band`);
    }
    prevMax = maxKm;
  });
  return { valid: errors.length === 0, errors };
}

/** Validate the deliveryPricing order-type blocks (GENERAL_DELIVERY + FOOD). */
function validateDeliveryPricingConfig(deliveryPricing) {
  const errors = [];
  const ot = (deliveryPricing && deliveryPricing.orderTypes) || {};
  for (const key of Object.keys(ot)) {
    const cfg = ot[key];
    if (!cfg || cfg.distanceMode !== 'bands') continue;
    const res = validateDistanceBands(cfg.bands, `orderTypes.${key}.bands`);
    errors.push(...res.errors);
    if (cfg.maxDistanceKm != null && (!Number.isFinite(Number(cfg.maxDistanceKm)) || Number(cfg.maxDistanceKm) <= 0)) {
      errors.push(`orderTypes.${key}.maxDistanceKm must be > 0`);
    }
    if (cfg.minimumFee != null && Number(cfg.minimumFee) < 0) {
      errors.push(`orderTypes.${key}.minimumFee cannot be negative`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a riderShareRules object before it is persisted. Returns
 * {valid, errors[]}. Rejects economically invalid config rather than silently
 * accepting it. (Server-side getRiderShare still hard-clamps as defense.)
 */
function validateRiderShareRules(rules) {
  const errors = [];
  const checkBands = (bands, scope) => {
    for (const b of bands || []) {
      const ownership = b && b.ownership ? normalizeVehicleOwnership(b.ownership) : null;
      const share = numOrUndef(b && (b.share ?? b.riderShareRate ?? b.rate));
      if (ownership === VEHICLE_OWNERSHIP.GO7_OWNED && Number.isFinite(share) && share > MAX_GO7_OWNED_SHARE) {
        errors.push(`${scope}: GO7_OWNED rider share ${share} exceeds the ${MAX_GO7_OWNED_SHARE} maximum`);
      }
    }
  };
  if (rules && typeof rules === 'object') {
    if (Array.isArray(rules.bands)) checkBands(rules.bands, 'bands');
    for (const [key, val] of Object.entries(rules)) {
      if (val && Array.isArray(val.bands)) checkBands(val.bands, key);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Operating economics — decision-support only, NEVER changes customer pricing.
// (DEFAULT_ECONOMICS is declared above, before module-init normalize runs.)
// ---------------------------------------------------------------------------

function normalizeEconomics(raw) {
  const d = DEFAULT_ECONOMICS;
  const e = raw && typeof raw === 'object' ? raw : {};
  return {
    fuelPricePerLiter: toNum(e.fuelPricePerLiter, d.fuelPricePerLiter),
    motorcycleKmPerLiter: toNum(e.motorcycleKmPerLiter, d.motorcycleKmPerLiter),
    bicycleOperatingCostPerKm: toNum(e.bicycleOperatingCostPerKm, d.bicycleOperatingCostPerKm),
    motorcycleOperatingCostPerKm: toNum(e.motorcycleOperatingCostPerKm, d.motorcycleOperatingCostPerKm),
    go7VehicleMaintenanceAllowance: toNum(e.go7VehicleMaintenanceAllowance, d.go7VehicleMaintenanceAllowance),
    paymentProcessingCost: toNum(e.paymentProcessingCost, d.paymentProcessingCost),
    otherOperationalCost: toNum(e.otherOperationalCost, d.otherOperationalCost),
    lowContributionRatio: toNum(e.lowContributionRatio, d.lowContributionRatio),
  };
}

/**
 * Go7 delivery contribution — decision support, NOT "profit" (it excludes
 * overheads like office, support, app infra). Integer-safe: all ₦ rounded.
 *
 * @returns {{deliveryFee, riderPayout, go7DeliveryShare, serviceFee,
 *   grossGo7Revenue, estimatedOperatingCost, estimatedContribution,
 *   contributionStatus: 'HEALTHY'|'LOW_CONTRIBUTION'|'LOSS_RISK'}}
 */
function calculateGo7DeliveryContribution(params) {
  const p = params || {};
  const config = normalizePricingConfig(p.config || DEFAULT_PRICING_CONFIG);
  const economics = normalizeEconomics(config.economics || (config.deliveryPricing && config.deliveryPricing.economics));

  const deliveryFee = Math.round(toNum(p.deliveryFee, 0));
  const riderPayout = Math.round(toNum(p.riderPayout, 0));
  const serviceFee = Math.round(toNum(p.serviceFee, 0));
  const distanceKm = toNum(p.distanceKm, 0);
  const ownership = normalizeVehicleOwnership(p.vehicleOwnership) || VEHICLE_OWNERSHIP.RIDER_OWNED;
  const vehicle = normalizeVehicleType(p.vehicleType) || 'MOTORCYCLE';
  const grandTotal = toNum(p.grandTotal, deliveryFee + serviceFee);

  const go7DeliveryShare = Math.round(deliveryFee - riderPayout);
  // Service/platform fee is Go7 revenue on top of the delivery-fee share.
  const grossGo7Revenue = Math.round(go7DeliveryShare + serviceFee);

  // Go7 only bears vehicle running cost on its own fleet; on rider-owned
  // vehicles the rider carries fuel/maintenance inside their share.
  const kmCost =
    vehicle === 'BICYCLE'
      ? economics.bicycleOperatingCostPerKm
      : economics.motorcycleOperatingCostPerKm;
  const vehicleCost =
    ownership === VEHICLE_OWNERSHIP.GO7_OWNED
      ? distanceKm * kmCost + economics.go7VehicleMaintenanceAllowance
      : 0;
  const paymentCost =
    economics.paymentProcessingCost <= 1
      ? grandTotal * economics.paymentProcessingCost // decimal rate on total
      : economics.paymentProcessingCost; // flat ₦ amount
  const estimatedOperatingCost = Math.round(vehicleCost + paymentCost + economics.otherOperationalCost);
  const estimatedContribution = Math.round(grossGo7Revenue - estimatedOperatingCost);

  let contributionStatus = 'HEALTHY';
  if (estimatedContribution <= 0) contributionStatus = 'LOSS_RISK';
  else if (deliveryFee > 0 && estimatedContribution < deliveryFee * economics.lowContributionRatio)
    contributionStatus = 'LOW_CONTRIBUTION';

  return {
    deliveryFee,
    riderPayout,
    go7DeliveryShare,
    serviceFee,
    grossGo7Revenue,
    estimatedOperatingCost,
    estimatedContribution,
    contributionStatus,
    vehicleOwnership: ownership,
    vehicleType: vehicle,
  };
}

module.exports = {
  ORDER_TYPES,
  PRICING_CORE_VERSION,
  normalizePricingConfig,
  normalizeServiceArea,
  isWithinServiceArea,
  DEFAULT_PRICING_CONFIG,
  calculateDeliveryFee,
  getDeliveryFee,
  verifyDeliveryFeeAgainstQuote,
  bandFlatFee,
  resolveVehicleType,
  resolveRiderShare,
  getRiderShare,
  normalizeBandList,
  normalizeCorridors,
  resolveCorridor,
  findCorridorById,
  buildCorridorLocationLookup,
  validateRiderShareRules,
  validateDistanceBands,
  validateDeliveryPricingConfig,
  calculateGo7DeliveryContribution,
  normalizeEconomics,
  DEFAULT_ECONOMICS,
  MAX_GO7_OWNED_SHARE,
  DEFAULT_RIDER_SHARE_RULES,
  DEFAULT_CORRIDOR_RADIUS_KM,
};

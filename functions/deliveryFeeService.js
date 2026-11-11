/**
 * Go7 server-authoritative delivery fee validation.
 *
 * The backend is the source of truth. It:
 *  - validates coordinates (finite, lat∈[-90,90], lng∈[-180,180], no 0,0 placeholder)
 *  - derives the delivery distance from pickup→destination coordinates
 *    (never trusts the client distance)
 *  - derives the zone from the destination coordinates (never trusts client zoneId)
 *  - derives the orderType from the authenticated service context
 *    (never trusts client orderType)
 *  - recomputes the fee with the canonical engine (functions/pricingCore.js)
 *  - rejects a client fee / zone / distance / orderType that does not match
 *
 * While deliveryPricing.enabled === false the engine returns the legacy fee
 * (FOOD ₦500), preserving production behaviour.
 */
const admin = require('firebase-admin');
const axios = require('axios');
const { calculateDeliveryFee, ORDER_TYPES, getRiderShare, resolveCorridor, buildCorridorLocationLookup, calculateGo7DeliveryContribution } = require('./pricingCore');
const { getEligibleVehiclePolicy } = require('./vehicleType');
const { detectDeliveryZone } = require('./deliveryZone');
const { loadCanonicalDeliveryPricing } = require('./pricingConfig');
const { loadLocations } = require('./locationResolver');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_DISTANCE_MATRIX_SERVER_KEY;
const DEFAULT_MAX_KM = 20;
const FEE_TOLERANCE = 50; // ₦ — canonical rounding tolerance between client/server
const DISTANCE_TOLERANCE_KM = 1.0;

class AuthFeeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Validate and normalise a coordinate; throws AuthFeeError on invalid input. */
function validateCoordinates(raw, label) {
  const lat = Number(raw && (raw.lat !== undefined ? raw.lat : raw.latitude));
  const lng = Number(raw && (raw.lng !== undefined ? raw.lng : raw.longitude));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AuthFeeError('invalid-coordinates', `${label || 'location'} coordinates must be finite numbers`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AuthFeeError('invalid-coordinates', `${label || 'location'} coordinates out of range`);
  }
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);
  // Only reject a true 0,0 / degenerate sentinel (still a real, valid Abeokuta
  // coordinate like the city centre 7.1475,3.3619 must NOT be rejected).
  const isZeroPlaceholder = absLat < 0.0001 && absLng < 0.0001;
  if (isZeroPlaceholder) {
    throw new AuthFeeError('invalid-coordinates', `${label || 'location'} coordinates are a 0,0 placeholder — not a real location`);
  }
  return { lat, lng };
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

async function roadDistanceKm(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    `${origin.lat},${origin.lng}`
  )}&destinations=${encodeURIComponent(
    `${destination.lat},${destination.lng}`
  )}&mode=driving&units=metric&region=ng&key=${GOOGLE_MAPS_API_KEY}`;
  const response = await axios.get(url, { timeout: 8000 });
  const element = response.data && response.data.rows && response.data.rows[0] && response.data.rows[0].elements && response.data.rows[0].elements[0];
  if (response.data && response.data.status !== 'OK') return null;
  if (!element || element.status !== 'OK') return null;
  return element.distance.value / 1000;
}

/**
 * Derive authoriative delivery distance (km) for pickup→destination.
 * Uses Google Distance Matrix (road) when available, else Haversine×1.2
 * (straight-line-to-road heuristic). Validates against max km.
 */
async function deriveDistanceKm(pickup, destination, maxKm) {
  const max = Number.isFinite(maxKm) && maxKm > 0 ? maxKm : DEFAULT_MAX_KM;
  let km = null;
  let method = 'haversine';
  try {
    km = await roadDistanceKm(pickup, destination);
    if (Number.isFinite(km)) method = 'google';
  } catch (err) {
    console.warn('deliveryFeeService road matrix failed:', err.message);
  }
  if (!Number.isFinite(km) || km <= 0) {
    km = Math.round(haversineKm(pickup, destination) * 1.2 * 10) / 10;
    method = 'haversine';
  }
  if (!(km > 0)) {
    throw new AuthFeeError('invalid-distance', 'Could not determine delivery distance');
  }
  if (km > max) {
    throw new AuthFeeError(
      'outside-service-area',
      `Delivery not available beyond ${max} km (${km.toFixed(1)} km)`
    );
  }
  return { km: Math.round(km * 10) / 10, method };
}

function readOrderType(raw) {
  const type = String(raw || '').toUpperCase();
  return Object.values(ORDER_TYPES).includes(type) ? type : null;
}

/**
 * Pure, deterministic recomputation used for validation.
 *
 * Params:
 *   orderType          - authoritative/context order type (from authenticated request)
 *   clientOrderType    - optional value supplied by the client (must match)
 *   clientFee          - optional fee supplied by the client (must match server)
 *   clientDistanceKm   - optional distance supplied by the client (must match server)
 *   clientZoneId       - optional zone supplied by the client (must match server)
 *   pickup, destination- trusted coordinates
 *   authoritativeDistanceKm - server-derived road distance if available
 *   subtotal, config
 *
 * Throws AuthFeeError on mismatch or invalid input.
 */
function recomputeAuthFee(params) {
  const orderType = readOrderType(params.orderType);
  if (!orderType) throw new AuthFeeError('invalid-order-type', 'Unknown order type');

  const config = params.config;
  const tolerance = Number.isFinite(params.tolerance) ? params.tolerance : FEE_TOLERANCE;

  // Client cannot choose a different orderType than the requested service.
  if (params.clientOrderType != null && readOrderType(params.clientOrderType) !== orderType) {
    throw new AuthFeeError('manipulated-order-type', 'Order type mismatch');
  }

  if (!params.pickup || !params.destination) {
    throw new AuthFeeError('invalid-coordinates', 'Pickup and destination are required');
  }
  const pickup = validateCoordinates(params.pickup, 'pickup');
  const destination = validateCoordinates(params.destination, 'destination');

  const serverDistanceKm =
    Number.isFinite(params.authoritativeDistanceKm)
      ? Math.round(params.authoritativeDistanceKm * 10) / 10
      : Math.round(haversineKm(pickup, destination) * 1.2 * 10) / 10;

  // Client cannot override the distance.
  if (Number.isFinite(params.clientDistanceKm)) {
    const diff = Math.abs(Number(params.clientDistanceKm) - serverDistanceKm);
    if (diff > DISTANCE_TOLERANCE_KM) {
      throw new AuthFeeError('manipulated-distance', `Delivery distance mismatch (server: ${serverDistanceKm} km)`);
    }
  }

  // Zone is derived from destination coords; client cannot choose one.
  const derivedZone = detectDeliveryZone(config.zones, destination.lat, destination.lng);
  if (params.clientZoneId != null && derivedZone.zoneId !== String(params.clientZoneId)) {
    throw new AuthFeeError('manipulated-zone', `Zone mismatch (server: ${derivedZone.zoneId || 'none'})`);
  }

  const breakdown = calculateDeliveryFee({
    orderType,
    distanceKm: serverDistanceKm,
    latitude: destination.lat,
    longitude: destination.lng,
    subtotal: params.subtotal,
    vehicleType: params.vehicleType,
    config,
  });

  if (breakdown.outsideServiceArea) {
    throw new AuthFeeError('outside-service-area', breakdown.outsideMessage || 'Outside service area');
  }

  // Corridor override: a matched high-density corridor replaces the distance
  // tariff but never bypasses the service-area gate above. The client cannot
  // choose a corridor — it is resolved from the actual coordinates.
  const corridor = params.corridor || null;
  if (params.clientCorridorId != null && String(params.clientCorridorId) !== String(corridor ? corridor.id : '')) {
    throw new AuthFeeError('manipulated-corridor', 'Corridor mismatch');
  }
  const serverFee = corridor ? corridor.deliveryFee : breakdown.deliveryFee;

  // Client cannot change the delivery fee.
  if (Number.isFinite(params.clientFee)) {
    const diff = Math.abs(Number(params.clientFee) - serverFee);
    if (diff > tolerance) {
      throw new AuthFeeError('manipulated-delivery-fee', `Delivery fee mismatch (server: ₦${serverFee})`);
    }
  }

  return {
    orderType,
    serverFee,
    serverDistanceKm,
    serverZoneId: derivedZone.zoneId,
    serverZoneName: derivedZone.zoneName,
    corridor,
    breakdown,
  };
}

/**
 * High-level authoritative quote: load config, validate coords, derive
 * distance + zone, and compute the authoritative fee. Returns a safe,
 * transparent breakdown plus a config version identifier.
 */
async function computeDeliveryFee(params, options) {
  const db = options.db || admin.firestore();
  const { config, version } = await loadCanonicalDeliveryPricing(db);

  const orderType = readOrderType(params.orderType || options.orderType);
  if (!orderType) throw new AuthFeeError('invalid-order-type', 'Unknown order type');

  const pickup = validateCoordinates(params.pickup, 'pickup');
  const destination = validateCoordinates(params.destination, 'destination');

  // A per-order-type ceiling wins when configured (parcels may travel further
  // than a flat-fee food order); otherwise the global configured max applies.
  const orderTypeMaxKm =
    config.orderTypes && config.orderTypes[orderType]
      ? config.orderTypes[orderType].maxDistanceKm
      : undefined;
  const effectiveMaxKm =
    Number.isFinite(orderTypeMaxKm) && orderTypeMaxKm > 0 ? orderTypeMaxKm : config.maxDistanceKm;
  const { km, method } = await deriveDistanceKm(pickup, destination, effectiveMaxKm);

  // Corridor resolution is server-side only, from the actual coordinates and
  // the canonical location catalog. Gated on config.enabled: while the new
  // pricing model is off (legacy flat fee) corridors must never activate.
  let corridor = null;
  const corridors = config.enabled && Array.isArray(config.corridors) ? config.corridors : [];
  if (corridors.length) {
    let locationLookup = {};
    try {
      locationLookup = buildCorridorLocationLookup(await loadLocations());
    } catch (err) {
      console.warn('deliveryFeeService location lookup failed (corridor match falls back to inline coords):', err.message);
    }
    corridor = resolveCorridor({
      pickup,
      dropoff: destination,
      distanceKm: km,
      orderType,
      pickupKey: params.pickupLocationKey,
      dropoffKey: params.dropoffLocationKey,
      corridors,
      locationLookup,
    });
  }

  // Forward client-supplied values so the server validates (and rejects
  // manipulation of) fee, distance, zone and orderType before order creation.
  const result = recomputeAuthFee({
    orderType,
    pickup,
    destination,
    authoritativeDistanceKm: km,
    distanceKm: km,
    subtotal: params.subtotal,
    vehicleType: params.vehicleType,
    clientFee: params.clientFee,
    clientDistanceKm: params.clientDistanceKm,
    clientZoneId: params.clientZoneId,
    clientOrderType: params.clientOrderType,
    clientCorridorId: params.clientCorridorId,
    corridor,
    config,
  });

  const otCfg = config.orderTypes[result.orderType] || {};
  const perKmRate = Number.isFinite(otCfg.perKmAfterIncluded) ? otCfg.perKmAfterIncluded : 0;
  const minimumFee = result.breakdown.minimumFee || 0;
  const maximumFee = result.breakdown.maximumFee || 0;

  const policy = getEligibleVehiclePolicy({ orderType, distanceKm: km }, config);
  let eligibleVehicles = policy && Array.isArray(policy.eligibleVehicles) ? policy.eligibleVehicles : [];
  let allowedVehicles = policy && Array.isArray(policy.allowedVehicles) && policy.allowedVehicles.length
    ? policy.allowedVehicles
    : eligibleVehicles;
  let preferredVehicle = policy ? policy.preferredVehicle : null;
  let vehicleSelectionReason = policy ? policy.reason : null;

  if (corridor) {
    // Corridor vehicle config overrides the distance policy when present;
    // dispatch availability checks still apply downstream.
    if (corridor.allowedVehicles && corridor.allowedVehicles.length) {
      eligibleVehicles = corridor.allowedVehicles;
      allowedVehicles = corridor.allowedVehicles;
      vehicleSelectionReason = 'CORRIDOR';
    }
    preferredVehicle = corridor.preferredVehicle || preferredVehicle;
  }

  const vehicleType = preferredVehicle
    ? preferredVehicle
    : eligibleVehicles.length === 1
      ? eligibleVehicles[0]
      : eligibleVehicles.length
        ? 'ANY'
        : null;
  const share = getRiderShare({ orderType, distanceKm: km, vehicleType, corridorId: corridor ? corridor.id : null, config });

  // Decision-support estimate: no rider is assigned yet, so the payout/share
  // preview assumes rider-owned (the common case). Assignment recomputes the
  // authoritative split with the actual rider's vehicleOwnership.
  const estServiceFee = Math.round(result.serverFee * (Number.isFinite(config.platformFeeRateParcel) ? config.platformFeeRateParcel : 0.1));
  const go7Contribution = calculateGo7DeliveryContribution({
    deliveryFee: result.serverFee,
    riderPayout: Math.round(result.serverFee * share.riderShareRate),
    serviceFee: estServiceFee,
    distanceKm: km,
    vehicleType: vehicleType === 'ANY' ? preferredVehicle : vehicleType,
    vehicleOwnership: 'RIDER_OWNED',
    orderType: result.orderType,
    config,
  });

  return {
    orderType: result.orderType,
    deliveryFee: result.serverFee,
    distanceKm: result.serverDistanceKm,
    distanceMethod: method,
    zoneId: result.serverZoneId,
    zoneName: result.serverZoneName,
    vehicleType,
    preferredVehicleType: preferredVehicle,
    eligibleVehicles,
    allowedVehicleTypes: allowedVehicles,
    vehicleSelectionReason,
    corridorId: corridor ? corridor.id : null,
    corridorName: corridor ? corridor.name : null,
    pricingSource: corridor ? 'corridor' : 'distance',
    riderShareRate: share.riderShareRate,
    platformShareRate: share.platformShareRate,
    riderShareRule: share.rule,
    // Quote-time economics are an ESTIMATE assuming a rider-owned vehicle.
    // assignRiderToBooking recomputes the authoritative split using the
    // assigned rider's actual vehicleOwnership.
    payoutEstimateBasis: 'RIDER_OWNED',
    payoutFinalizedAt: 'ASSIGNMENT',
    go7Contribution,
    pricingConfigVersion: version,
    breakdown: {
      orderType: result.orderType,
      distanceKm: result.serverDistanceKm,
      baseFee: result.breakdown.baseFee,
      perKmRate,
      distanceCharge: result.breakdown.distanceFee,
      minimumFee,
      maximumFee,
      zoneFee: result.breakdown.zoneFee,
      orderTypeFee: result.breakdown.orderTypeFee,
      discounts: result.breakdown.discounts,
      subtotalBeforeClamp: result.breakdown.subtotalBeforeClamp,
      deliveryFee: result.breakdown.deliveryFee,
      appliedRule: result.breakdown.appliedRule,
      legacy: result.breakdown.legacy,
    },
  };
}

module.exports = {
  AuthFeeError,
  validateCoordinates,
  haversineKm,
  deriveDistanceKm,
  recomputeAuthFee,
  computeDeliveryFee,
  FEE_TOLERANCE,
  DEFAULT_MAX_KM,
};

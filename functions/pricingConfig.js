/**
 * Server-side delivery pricing configuration loader.
 *
 * Reads the authoritative pricing configuration from Firestore:
 *   - pricingSettings/current  (global + per-order-type pricing + switch + version)
 *   - deliveryZones            (zone boundaries / priority / zone base fee)
 * and returns a canonical config consumed by functions/pricingCore.js.
 *
 * While `deliveryPricing.enabled === false` the engine returns the legacy fee
 * per order type (FOOD ₦500), so production behaviour is unchanged until the
 * new configuration is explicitly enabled.
 */
const { ORDER_TYPES, DEFAULT_PRICING_CONFIG } = require('./pricingCore');
const { normalizeZone } = require('./deliveryZone');

// Mirror of src/utils/abeokutaServiceArea.js — the authoritative overall
// Abeokuta service boundary. Deliverable anywhere in this area; named zones
// (FUNAAB, Camp, Alabata, Obantoko …) are OPTIONAL groupings inside it.
const ABEOKUTA_BOUNDS = { south: 6.72, north: 7.58, west: 2.92, east: 3.88 };
const ABEOKUTA_CENTER = { lat: 7.1475, lng: 3.3619 };
const MAX_RADIUS_KM = 48;

/**
 * Maximum ROAD distance for a single delivery.
 *
 * This is read by deliveryFeeService.deriveDistanceKm — but nothing used to
 * WRITE it, so the hardcoded DEFAULT_MAX_KM = 20 fallback always won and the
 * declared 48 km service area above was never the binding limit. It is now
 * written explicitly so the real ceiling lives in one configurable place.
 *
 * Kept at 20 km so current behaviour is unchanged. An individual order type may
 * override it via deliveryPricing.orderTypes.<TYPE>.maxDistanceKm (parcels can
 * legitimately travel further than a flat-fee food order).
 *
 * NOTE: raising this widens where orders are accepted. FOOD/MARKET/PHARMACY
 * currently charge a flat legacy fee, so a longer run is not priced for it —
 * tune GENERAL_DELIVERY separately rather than raising this globally.
 */
const DEFAULT_MAX_DISTANCE_KM = 20;

const LEGACY_DEFAULT_FEES = {
  [ORDER_TYPES.FOOD]: 500,
  [ORDER_TYPES.MARKET]: 400,
  [ORDER_TYPES.PHARMACY]: 500,
  [ORDER_TYPES.GENERAL_DELIVERY]: 500,
  [ORDER_TYPES.FUEL]: 0,
};

const DEFAULT_ORDER_TYPES = {
  // FOOD final launch bands (active only while deliveryPricing.enabled):
  // 0–2 ₦600 · 2–4 ₦800 · 4–6 ₦1,000 · 6–8 ₦1,200 · 8–10 ₦1,500 ·
  // 10–15 ₦1,800 · >15 ₦2,200 + ₦100/km beyond 15 km.
  [ORDER_TYPES.FOOD]: {
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
  [ORDER_TYPES.MARKET]: { distanceMode: 'linear', baseFee: 400, perKmAfterIncluded: 100, minimumFee: 400, maximumFee: 6000 },
  [ORDER_TYPES.PHARMACY]: { distanceMode: 'linear', baseFee: 350, perKmAfterIncluded: 90, minimumFee: 350, maximumFee: 4000 },
  // BOOK DELIVERY final launch bands:
  // 0–3 ₦900 · 3–5 ₦1,050 · 5–8 ₦1,350 · 8–10 ₦2,500 · 10–15 ₦3,000 ·
  // 15–20 ₦3,650 · 20–25 ₦5,150 · 25–30 ₦6,050 · >30 ₦6,050 + ₦200/km.
  // maxDistanceKm 40 lets the priced long-distance bands actually serve;
  // the Abeokuta service-area bounds remain the geographic gate.
  [ORDER_TYPES.GENERAL_DELIVERY]: {
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
    maximumFee: 0, // no cap — long-distance bands price >25 km trips
    roundingStepping: 1,
    maxDistanceKm: 40,
  },
  [ORDER_TYPES.FUEL]: { enabled: false },
};

function toNum(v, fb) {
  return Number.isFinite(Number(v)) ? Number(v) : fb;
}

/** Build the canonical config object from Firestore pricingSettings + zones. */
function buildCanonicalConfig(pricingSettings, zones) {
  const dp = (pricingSettings && pricingSettings.deliveryPricing) || {};
  const launch = !pricingSettings || pricingSettings.launchMode !== false;
  const baseFee = launch ? pricingSettings.launchBaseFee : pricingSettings.standardBaseFee;
  const includedKm = launch ? pricingSettings.launchIncludedKm : pricingSettings.standardIncludedKm;
  const perKm = launch ? pricingSettings.launchPerKmAfterIncluded : pricingSettings.standardPerKmAfterIncluded;

  const overrides = dp.orderTypes || {};
  const orderTypes = {};
  for (const key of Object.keys(DEFAULT_ORDER_TYPES)) {
    orderTypes[key] = Object.assign({}, DEFAULT_ORDER_TYPES[key], overrides[key] || {});
  }
  // BOOK DELIVERY = separate point-to-point pricing (base + per-km launch model).
  // Only an explicit deliveryPricing.orderTypes.GENERAL_DELIVERY override wins.
  orderTypes[ORDER_TYPES.GENERAL_DELIVERY] = Object.assign(
    {},
    DEFAULT_ORDER_TYPES[ORDER_TYPES.GENERAL_DELIVERY],
    (dp.orderTypes && dp.orderTypes[ORDER_TYPES.GENERAL_DELIVERY]) || {}
  );

  return {
    enabled: dp.enabled === true,
    legacyDefaultFee: toNum(dp.legacyDefaultFee, LEGACY_DEFAULT_FEES[ORDER_TYPES.FOOD]),
    roundingStepping: toNum(dp.roundingStepping, toNum(pricingSettings && pricingSettings.roundingStep, 50)),
    global: {
      distanceMode: 'linear',
      baseFee,
      includedKm,
      perKmAfterIncluded: perKm,
      minimumFee: pricingSettings && pricingSettings.minimumDeliveryFee,
      maximumFee: pricingSettings && pricingSettings.maximumDeliveryFee,
    },
    orderTypes,
    zones: (Array.isArray(zones) ? zones : []).map(normalizeZone).filter((z) => z !== null),
    // Was silently absent before — see DEFAULT_MAX_DISTANCE_KM.
    maxDistanceKm:
      dp.maxDistanceKm !== undefined && Number.isFinite(Number(dp.maxDistanceKm)) && Number(dp.maxDistanceKm) > 0
        ? Number(dp.maxDistanceKm)
        : DEFAULT_MAX_DISTANCE_KM,
    // Overall Abeokuta coverage = authoritative service boundary; named zones
    // are optional groupings inside it, configurable via deliveryPricing.serviceArea.
    serviceArea: {
      enabled: dp.serviceArea ? dp.serviceArea.enabled !== false : true,
      bounds: (dp.serviceArea && dp.serviceArea.bounds) || ABEOKUTA_BOUNDS,
      center: (dp.serviceArea && dp.serviceArea.center) || ABEOKUTA_CENTER,
      maxRadiusKm: dp.serviceArea && Number.isFinite(dp.serviceArea.maxRadiusKm)
        ? dp.serviceArea.maxRadiusKm
        : MAX_RADIUS_KM,
      polygon: Array.isArray(dp.serviceArea && dp.serviceArea.polygon) ? dp.serviceArea.polygon : undefined,
    },
    // Admin-configurable vehicle + rider-share rules. Stored on
    // pricingSettings/current either inside deliveryPricing or as top-level
    // fields so the admin UI can write them without overwriting orderTypes.
    vehicleRules:
      dp.vehicleRules || dp.vehicleEligibility || (pricingSettings && pricingSettings.vehicleRules) || null,
    riderShareRules:
      dp.riderShareRules || dp.riderShare || (pricingSettings && pricingSettings.riderShareRules) || null,
    // High-density pricing corridors (e.g. Camp ↔ FUNAAB). Admin-managed;
    // pricing rules only — they never change the service boundary.
    corridors:
      dp.corridors || (pricingSettings && pricingSettings.corridors) || null,
    // Operating-economics assumptions for contribution analysis (never
    // changes customer pricing).
    economics: dp.economics || (pricingSettings && pricingSettings.economics) || null,
    // Book Delivery customer service fee rate (10% of delivery fee). Surfaced
    // here so contribution estimates use the same rate as booking math.
    platformFeeRateParcel:
      toNum(pricingSettings && pricingSettings.platformFeeRateParcel, NaN) || 0.1,
    outsideServiceArea:
      dp.outsideServiceArea || { message: 'Go7 does not currently deliver to this location.', allowOrder: false },
  };
}

/** Load pricingSettings + deliveryZones and return { enabled, config, version }. */
async function loadCanonicalDeliveryPricing(db) {
  let pricingSettings = null;
  try {
    const snap = await db.doc('pricingSettings/current').get();
    if (snap.exists) pricingSettings = snap.data();
  } catch (err) {
    console.warn('Failed to load pricingSettings in functions:', err.message);
  }

  let zones = [];
  try {
    const q = await db.collection('deliveryZones').get();
    zones = q.docs.map((d) => Object.assign({ id: d.id }, d.data()));
  } catch (err) {
    console.warn('Failed to load deliveryZones in functions:', err.message);
  }

  const config = buildCanonicalConfig(pricingSettings, zones);
  const dp = (pricingSettings && pricingSettings.deliveryPricing) || {};
  let version = 'legacy';
  if (config.enabled) {
    version =
      (dp.version && String(dp.version)) ||
      (pricingSettings &&
        pricingSettings.updatedAt &&
        pricingSettings.updatedAt.toMillis
          ? String(pricingSettings.updatedAt.toMillis())
          : 'pricingSettings/current');
  }
  return { enabled: config.enabled, config, version, legacyDefaultFee: LEGACY_DEFAULT_FEES };
}

module.exports = {
  buildCanonicalConfig,
  loadCanonicalDeliveryPricing,
  DEFAULT_ORDER_TYPES,
  LEGACY_DEFAULT_FEES,
  DEFAULT_PRICING_CONFIG,
};

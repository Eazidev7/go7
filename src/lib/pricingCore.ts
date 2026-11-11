/**
 * Go7 canonical delivery pricing engine.
 *
 * ONE source of truth for order-type aware delivery pricing:
 *   FOOD, MARKET, PHARMACY, GENERAL_DELIVERY, FUEL (FUEL stays isolated).
 *
 * Pure and dependency-free so it can be mirrored to server-side functions
 * (which MUST be authoritative when an order is created). All business
 * values live in Firestore: `pricingSettings/current` + `deliveryZones`.
 *
 * Pricing priority:
 *   1. explicit special zone pricing (zone.baseFee override)
 *   2. order-type distance pricing (linear / bands / flat)
 *   3. outside-service-area handling
 *
 * While `config.enabled === false` the engine preserves legacy behaviour for
 * an order type (e.g. FOOD's historical flat ₦500) so nothing changes until
 * the new configuration is explicitly enabled.
 */
import { DeliveryZone, detectDeliveryZone, normalizeZone } from './deliveryZone';

export const ORDER_TYPES = {
  FOOD: 'FOOD',
  MARKET: 'MARKET',
  PHARMACY: 'PHARMACY',
  GENERAL_DELIVERY: 'GENERAL_DELIVERY',
  FUEL: 'FUEL',
} as const;
export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export interface DeliveryFeeBreakdown {
  orderType: OrderType | string;
  appliedRule: 'legacy' | 'zone' | 'distance-bands' | 'distance-linear' | 'flat' | 'outside-service-area';
  enabled: boolean;
  legacy: boolean;
  zoneId: string | null;
  zoneName: string | null;
  inZone: boolean;
  baseFee: number;
  distanceFee: number;
  zoneFee: number;
  orderTypeFee: number;
  additionalFees: number;
  discounts: number;
  subtotalBeforeClamp: number;
  deliveryFee: number;
  minimumFee: number;
  maximumFee: number;
  distanceKm?: number;
  outsideServiceArea: boolean;
  outsideMessage: string | null;
  vehicleType?: string;
  version: number;
}

export interface DeliveryFeeParams {
  orderType: OrderType | string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  vehicleType?: string;
  subtotal?: number;
  /** Optional pre-detected zone id to skip re-detection. */
  zoneId?: string | null;
  /** Optional full config (Firestore pricingSettings + deliveryZones). */
  config?: any;
}

export const PRICING_CORE_VERSION = 1;

const roundNaira = (n: number) => Math.round(n);
const toNum = (v: any, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function numOrUndef(v: any): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeOrderTypeConfig(raw: any): any {
  return {
    // Unconfigured order types are DISABLED (outside-service-area) until
    // explicitly enabled — e.g. FUEL is never silently priced by this engine.
    enabled: raw ? raw.enabled !== false : false,
    distanceMode: raw?.distanceMode || 'linear',
    // Unset scalars stay `undefined` so the engine can fall back to the
    // global defaults instead of 0 (min/max clamp inheritance, base fee, etc.).
    baseFee: numOrUndef(raw?.baseFee),
    includedKm: numOrUndef(raw?.includedKm),
    perKmAfterIncluded: numOrUndef(raw?.perKmAfterIncluded),
    flatFee: numOrUndef(raw?.flatFee),
    minimumFee: numOrUndef(raw?.minimumFee),
    maximumFee: numOrUndef(raw?.maximumFee),
    roundingStepping: numOrUndef(raw?.roundingStepping),
    bands: Array.isArray(raw?.bands) ? raw.bands : [],
    additionalFees: Array.isArray(raw?.additionalFees) ? raw.additionalFees : [],
    discounts: Array.isArray(raw?.discounts) ? raw.discounts : [],
  };
}

export function normalizeServiceArea(raw: any): any {
  return {
    enabled: raw?.enabled === true,
    bounds: raw?.bounds || { south: 6.72, north: 7.58, west: 2.92, east: 3.88 },
    center: raw?.center || { lat: 7.1475, lng: 3.3619 },
    maxRadiusKm: toNum(raw?.maxRadiusKm, 48),
    polygon: Array.isArray(raw?.polygon) ? raw.polygon : undefined,
  };
}

function haversineKm(a: any, b: any): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Overall service-coverage check. If a service area is configured it is the
 * authoritative coverage boundary — named zones are OPTIONAL groupings inside
 * it and never define the boundary. No service area => everything in coverage.
 */
export function isWithinServiceArea(lat: number, lng: number, serviceArea: any): boolean {
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

export function normalizePricingConfig(raw: any): any {
  const global = normalizeOrderTypeConfig(raw?.global);
  const orderTypes: Record<string, any> = {};
  for (const key of Object.values(ORDER_TYPES)) {
    orderTypes[key] = normalizeOrderTypeConfig(raw?.orderTypes?.[key]);
  }
  const zones: DeliveryZone[] = (Array.isArray(raw?.zones) ? raw.zones : [])
    .map(normalizeZone)
    .filter((z): z is DeliveryZone => z !== null);

  return {
    enabled: raw?.enabled === true,
    legacyDefaultFee: toNum(raw?.legacyDefaultFee, 500),
    roundingStepping: toNum(raw?.roundingStepping, 50),
    global,
    orderTypes,
    zones,
    serviceArea: normalizeServiceArea(raw?.serviceArea),
    outsideServiceArea:
      raw?.outsideServiceArea || { message: 'Go7 does not currently deliver to this location.', allowOrder: false },
  };
}

export const DEFAULT_PRICING_CONFIG = normalizePricingConfig({
  enabled: false,
  legacyDefaultFee: 500,
  roundingStepping: 50,
  global: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150, minimumFee: 1000, maximumFee: 6000 },
  orderTypes: {
    FOOD: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 0, minimumFee: 500 },
    MARKET: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100 },
    PHARMACY: { distanceMode: 'linear', baseFee: 350, includedKm: 0, perKmAfterIncluded: 90 },
    // BOOK DELIVERY launch pricing: base ₦400 + ₦100/km, min ₦500, exact (step 1).
    GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 500, maximumFee: 6000, roundingStepping: 1 },
    FUEL: { enabled: false },
  },
  zones: [],
  outsideServiceArea: { message: 'Go7 does not currently deliver to this location.', allowOrder: false },
});

/** Flat fee of the distance band that contains `distanceKm` (e.g. 0–2=₦700, 2–4=₦900). */
function bandFlatFee(cfg: any, distanceKm: number): number {
  const bands = cfg.bands || [];
  if (!Array.isArray(bands) || bands.length === 0) return 0;
  const sorted = [...bands].sort((a, b) => toNum(a.minKm, 0) - toNum(b.minKm, 0));
  for (const band of sorted) {
    const minKm = toNum(band.minKm, 0);
    const maxKm = toNum(band.maxKm, Infinity);
    if (distanceKm >= minKm && (maxKm === Infinity || distanceKm < maxKm)) {
      return toNum(band.fee, 0);
    }
  }
  return toNum(sorted[sorted.length - 1]?.fee, 0);
}

/**
 * Canonical delivery-fee computation. Config is the single source of truth
 * (Firestore). Returns a transparent breakdown; the returned `deliveryFee`
 * is what checkout should display and the server must recompute.
 */
export function calculateDeliveryFee(params: DeliveryFeeParams): DeliveryFeeBreakdown {
  const config = normalizePricingConfig(params.config || DEFAULT_PRICING_CONFIG);
  const orderType = String(params.orderType || ORDER_TYPES.GENERAL_DELIVERY).toUpperCase();
  const distanceKm = Math.max(0, toNum(params.distanceKm, 0));
  const subtotal = Math.max(0, toNum(params.subtotal, 0));

  const legacy = config.enabled === false;
  const ot = config.orderTypes[orderType] || config.orderTypes[ORDER_TYPES.GENERAL_DELIVERY];

  // ---- zone detection (unless a zone was pre-resolved) ----
  let zoneMatch = { matched: false, zoneId: null as string | null, zoneName: null as string | null };
  if (params.zoneId) {
    const z = config.zones.find((z: DeliveryZone) => z.id === params.zoneId && z.enabled);
    if (z) zoneMatch = { matched: true, zoneId: z.id, zoneName: z.name };
  } else if (params.latitude != null && params.longitude != null) {
    zoneMatch = detectDeliveryZone(config.zones, params.latitude, params.longitude);
  }
  const matchedZone = zoneMatch.matched
    ? config.zones.find((z: DeliveryZone) => z.id === zoneMatch.zoneId)
    : null;

  // ---- decide pricing rule ----
  let appliedRule: DeliveryFeeBreakdown['appliedRule'];
  let baseFee = 0;
  let distanceFee = 0;
  let zoneFee = 0;
  let orderTypeFee = 0;
  let outside = false;
  let outsideMessage: string | null = null;

  // Service-area gate: the overall coverage boundary is authoritative.
  // Named zones are optional groupings INSIDE it and never define the boundary.
  // FUEL stays isolated (never gated by the general service area).
  const coordsProvided = params.latitude != null && params.longitude != null;
  const shouldGateServiceArea =
    !legacy &&
    coordsProvided &&
    orderType !== ORDER_TYPES.FUEL &&
    config.serviceArea &&
    config.serviceArea.enabled === true;

  if (legacy) {
    appliedRule = 'legacy';
    baseFee = 0;
    distanceFee = 0;
    zoneFee = 0;
  } else if (
    shouldGateServiceArea &&
    !isWithinServiceArea(Number(params.latitude), Number(params.longitude), config.serviceArea)
  ) {
    appliedRule = 'outside-service-area';
    outside = true;
    outsideMessage = config.outsideServiceArea?.message || null;
  } else if (matchedZone && Number.isFinite(matchedZone.baseFee) && matchedZone.baseFee != null) {
    appliedRule = 'zone';
    zoneFee = Math.max(0, toNum(matchedZone.baseFee, 0));
    baseFee = 0;
  } else if (ot.enabled !== false) {
    if (ot.distanceMode === 'bands') {
      appliedRule = 'distance-bands';
      // Band fee is a flat per-range total (already includes the base).
      baseFee = 0;
      distanceFee = bandFlatFee(ot, distanceKm);
    } else if (ot.distanceMode === 'flat') {
      appliedRule = 'flat';
      baseFee = toNum(ot.flatFee ?? ot.baseFee, 0);
    } else {
      appliedRule = 'distance-linear';
      const includedKm = toNum(ot.includedKm, toNum(config.global.includedKm, 0));
      const perKm = toNum(ot.perKmAfterIncluded, toNum(config.global.perKmAfterIncluded, 0));
      baseFee = toNum(ot.baseFee ?? config.global.baseFee, 0);
      distanceFee = Math.round(Math.max(0, distanceKm - includedKm) * perKm);
    }
  } else {
    appliedRule = 'outside-service-area';
    outside = true;
    outsideMessage = config.outsideServiceArea?.message || null;
  }

  const additionalFees = (ot.additionalFees || []).reduce(
    (sum: number, f: any) => sum + Math.max(0, toNum(f?.amount)),
    0
  );
  const discounts = (ot.discounts || []).reduce(
    (sum: number, d: any) => sum + Math.max(0, toNum(d?.amount)),
    0
  );
  const freeThreshold = toNum(ot.freeDeliveryThreshold, 0);
  const isFree = freeThreshold > 0 && subtotal >= freeThreshold;

  let subtotalBeforeClamp = baseFee + distanceFee + zoneFee + orderTypeFee + additionalFees - discounts;
  if (isFree) subtotalBeforeClamp = 0;

  const minimumFee = toNum(ot.minimumFee, toNum(config.global.minimumFee, 0));
  const maximumFee = toNum(ot.maximumFee, toNum(config.global.maximumFee, 0));
  if (legacy) {
    // Preserve legacy behaviour exactly until the new config is enabled.
    return {
      orderType,
      appliedRule: 'legacy',
      enabled: config.enabled === true,
      legacy,
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
      vehicleType: params.vehicleType,
      version: PRICING_CORE_VERSION,
    };
  }

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
    vehicleType: params.vehicleType,
    version: PRICING_CORE_VERSION,
  };
}

/** Convenience wrapper: return only the fee amount. */
export function getDeliveryFee(params: DeliveryFeeParams, config?: any): number {
  return calculateDeliveryFee({ ...params, config: config || params.config }).deliveryFee;
}

/**
 * Server-authoritative check: recompute the fee from the config + coordinates
 * and compare against a client-supplied fee. A malicious client cannot lower
 * the fee this way.
 */
export function verifyDeliveryFeeAgainstQuote(
  quoteFee: number,
  params: DeliveryFeeParams,
  config: any,
  tolerance: number = 50
): { valid: boolean; serverFee: number; difference: number } {
  const result = calculateDeliveryFee({ ...params, config });
  if (result.outsideServiceArea) return { valid: false, serverFee: 0, difference: Infinity };
  const difference = Math.abs(toNum(quoteFee) - result.deliveryFee);
  return { valid: difference <= tolerance, serverFee: result.deliveryFee, difference };
}

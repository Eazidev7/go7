/**
 * Delivery-pricing configuration loader.
 *
 * Reads the single source of truth from Firestore:
 *   - pricingSettings/current   (global + per-order-type delivery pricing + master switch)
 *   - deliveryZones/{id}        (zone boundaries, priority, zone base fee)
 *
 * Output is a canonical config object consumed by src/lib/pricingCore.ts.
 * While `deliveryPricing.enabled` is false the canonical engine returns the
 * legacy fee per order type (e.g. FOOD ₦500), so nothing changes until the
 * new pricing is explicitly enabled.
 */
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { fetchPricingSettings } from '../utils/pricingSettings';
import { ORDER_TYPES } from './pricingCore';
import { ABEOKUTA_CENTER, MAX_RADIUS_KM, SERVICE_BOUNDS } from '../utils/abeokutaServiceArea';

export const LEGACY_DEFAULT_FEES = {
  [ORDER_TYPES.FOOD]: 500,
  [ORDER_TYPES.MARKET]: 400,
  [ORDER_TYPES.PHARMACY]: 500,
  [ORDER_TYPES.GENERAL_DELIVERY]: 500,
};

const DEFAULT_ORDER_TYPES = {
  [ORDER_TYPES.FOOD]: {
    distanceMode: 'bands',
    bands: [
      { minKm: 0, maxKm: 2, fee: 700 },
      { minKm: 2, maxKm: 4, fee: 900 },
      { minKm: 4, maxKm: 6, fee: 1100 },
      { minKm: 6, maxKm: 8, fee: 1300 },
      { minKm: 8, maxKm: 9999, fee: 1500 },
    ],
    minimumFee: 500,
    maximumFee: 6000,
  },
  [ORDER_TYPES.MARKET]: { distanceMode: 'linear', baseFee: 400, perKmAfterIncluded: 100, minimumFee: 400, maximumFee: 6000 },
  [ORDER_TYPES.PHARMACY]: { distanceMode: 'linear', baseFee: 350, perKmAfterIncluded: 90, minimumFee: 350, maximumFee: 4000 },
  // BOOK DELIVERY launch pricing: base ₦400 + ₦100/km, min ₦500, exact (step 1).
  [ORDER_TYPES.GENERAL_DELIVERY]: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 500, maximumFee: 6000, roundingStepping: 1 },
  [ORDER_TYPES.FUEL]: { enabled: false },
};

/** Build the canonical config from Firestore pricingSettings + zones. */
export function buildCanonicalConfig(pricingSettings, zones) {
  const dp = pricingSettings?.deliveryPricing || {};
  const launch = pricingSettings?.launchMode !== false;
  const baseFee = launch ? pricingSettings?.launchBaseFee : pricingSettings?.standardBaseFee;
  const includedKm = launch ? pricingSettings?.launchIncludedKm : pricingSettings?.standardIncludedKm;
  const perKm = launch ? pricingSettings?.launchPerKmAfterIncluded : pricingSettings?.standardPerKmAfterIncluded;

  const overrides = dp.orderTypes || {};
  const orderTypes = {};
  for (const key of Object.keys(DEFAULT_ORDER_TYPES)) {
    orderTypes[key] = {
      ...DEFAULT_ORDER_TYPES[key],
      ...(overrides[key] || {}),
    };
  }
  // BOOK DELIVERY = separate point-to-point pricing (base + per-km launch model).
  // Only an explicit deliveryPricing.orderTypes.GENERAL_DELIVERY override wins;
  // otherwise the launch defaults above apply (NOT the commerce/global model).
  orderTypes[ORDER_TYPES.GENERAL_DELIVERY] = {
    ...DEFAULT_ORDER_TYPES[ORDER_TYPES.GENERAL_DELIVERY],
    ...(overrides[ORDER_TYPES.GENERAL_DELIVERY] || {}),
  };

  return {
    enabled: dp.enabled === true,
    legacyDefaultFee: dp.legacyDefaultFee ?? LEGACY_DEFAULT_FEES[ORDER_TYPES.FOOD],
    roundingStepping: dp.roundingStepping ?? pricingSettings?.roundingStep ?? 50,
    global: {
      distanceMode: 'linear',
      baseFee,
      includedKm,
      perKmAfterIncluded: perKm,
      minimumFee: pricingSettings?.minimumDeliveryFee,
      maximumFee: pricingSettings?.maximumDeliveryFee,
    },
    orderTypes,
    zones: Array.isArray(zones) ? zones : [],
    // Overall Abeokuta coverage = authoritative service boundary. Named zones are
    // optional groupings inside it; they are NOT the boundary. Configurable via
    // deliveryPricing.serviceArea so the area can change without code changes.
    serviceArea: {
      enabled: dp.serviceArea ? dp.serviceArea.enabled !== false : true,
      bounds: dp.serviceArea?.bounds || SERVICE_BOUNDS,
      center: dp.serviceArea?.center || ABEOKUTA_CENTER,
      maxRadiusKm: dp.serviceArea?.maxRadiusKm ?? MAX_RADIUS_KM,
      polygon: Array.isArray(dp.serviceArea?.polygon) ? dp.serviceArea.polygon : undefined,
    },
    outsideServiceArea:
      dp.outsideServiceArea || { message: 'Go7 does not currently deliver to this location.', allowOrder: false },
  };
}

/** @returns a disabled (legacy) canonical config — safe default when not configured/on error. */
export function legacyDeliveryPricingConfig() {
  return {
    enabled: false,
    legacyDefaultFee: LEGACY_DEFAULT_FEES[ORDER_TYPES.FOOD],
    roundingStepping: 50,
    global: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150, minimumFee: 1000, maximumFee: 6000 },
    orderTypes: DEFAULT_ORDER_TYPES,
    zones: [],
    outsideServiceArea: { message: 'Go7 does not currently deliver to this location.', allowOrder: false },
  };
}

/** Load pricingSettings + deliveryZones and build the canonical config. */
export async function loadDeliveryPricingConfig(db) {
  let pricingSettings = null;
  try {
    pricingSettings = await fetchPricingSettings(db);
  } catch (err) {
    console.warn('Failed to load pricingSettings:', err?.message);
    return legacyDeliveryPricingConfig();
  }
  let zones = [];
  try {
    const snap = await getDocs(collection(db, 'deliveryZones'));
    zones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Failed to load deliveryZones:', err?.message);
  }
  return buildCanonicalConfig(pricingSettings, zones);
}

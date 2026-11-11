/**
 * GO7 Launch / Standard pricing — Firestore-backed configurable delivery fees.
 * Document: pricingSettings/current
 */

export const PRICING_SETTINGS_DOC_PATH = 'pricingSettings/current';

export const DEFAULT_VEHICLE_RULES = {
  BICYCLE: {
    enabled: true,
    preferredMinKm: 0,
    preferredMaxKm: 8,
    allowedMinKm: 0,
    allowedMaxKm: 8,
    preferred: true,
  },
  EBIKE: { enabled: false },
  MOTORCYCLE: {
    enabled: true,
    preferredMinKm: 8,
    allowedMinKm: 5,
    allowedMaxKm: 999,
    preferred: true,
  },
  allowMotorcycleFallback: true,
};

/**
 * Rider share depends on who owns the dispatched vehicle.
 * Go7-owned (Go7 covers fuel/maintenance/depreciation): rider 40% / Go7 60%.
 * Rider-owned: rider 60% / Go7 40% (≤15 km), rider 65% / Go7 35% (>15 km).
 * Bands without `ownership` apply to all riders (backward compatible).
 * HARD RULE: GO7_OWNED share may never exceed 50% — the server clamps it and
 * validateShareConfig rejects such config on save.
 */
export const DEFAULT_RIDER_SHARE_RULES = {
  bands: [
    { ownership: 'GO7_OWNED', share: 0.4, rule: 'GO7_OWNED' },
    { ownership: 'RIDER_OWNED', maxKm: 15, share: 0.6, rule: 'RIDER_OWNED_STANDARD' },
    { ownership: 'RIDER_OWNED', maxKm: 999, share: 0.65, rule: 'RIDER_OWNED_LONG_DISTANCE' },
  ],
};

export const MAX_GO7_OWNED_SHARE = 0.5;

/**
 * Band convention (mirrors pricingCore.validateDistanceBands): bands are
 * contiguous and UPPER-INCLUSIVE — sorted by minKm, each minKm must equal the
 * previous band's maxKm, and a shared boundary price belongs to the LOWER
 * band (0–2 km ₦600, >2–4 km ₦800 → 2.0 km = ₦600, 2.01 km = ₦800).
 * Rejects overlaps, gaps, negative fees, and misplaced open bands.
 */
export function validateBandList(bands, label) {
  const errors = [];
  const s = label || 'bands';
  const sorted = [...(bands || [])].sort((a, b) => (Number(a.minKm) || 0) - (Number(b.minKm) || 0));
  if (!sorted.length) { errors.push(`${s}: at least one band is required`); return errors; }
  let prevMax = null;
  sorted.forEach((b, i) => {
    const minKm = Number(b.minKm);
    const maxKm = b.maxKm === null || b.maxKm === undefined || b.maxKm === '' ? null : Number(b.maxKm);
    const fee = Number(b.fee);
    const perKmBeyond = Number(b.perKmBeyond) || 0;
    const tag = `${s} band ${i + 1} (${minKm}–${maxKm == null ? 'open' : maxKm} km)`;
    if (!Number.isFinite(minKm) || minKm < 0) errors.push(`${tag}: minKm must be ≥ 0`);
    if (maxKm != null && (!Number.isFinite(maxKm) || maxKm <= minKm)) errors.push(`${tag}: maxKm must be > minKm`);
    if (!Number.isFinite(fee) || fee < 0) errors.push(`${tag}: fee cannot be negative`);
    if (perKmBeyond < 0) errors.push(`${tag}: perKmBeyond cannot be negative`);
    if (i === 0) {
      if (minKm > 0) errors.push(`${tag}: first band must start at 0 km`);
    } else {
      if (prevMax == null) errors.push(`${tag}: a bounded band cannot follow an open-ended band`);
      else if (minKm < prevMax) errors.push(`${tag}: overlaps the previous band (${minKm} < ${prevMax})`);
      else if (minKm > prevMax) errors.push(`${tag}: gap — ${prevMax}–${minKm} km would be unpriced`);
      if (i < sorted.length - 1 && maxKm == null) errors.push(`${tag}: only the final band may be open-ended`);
    }
    if (perKmBeyond > 0 && maxKm != null) errors.push(`${tag}: perKmBeyond only applies to the open-ended final band`);
    prevMax = maxKm;
  });
  return errors;
}

/** Validate both deliveryPricing order-type band tables. */
export function validateDeliveryPricing(deliveryPricing) {
  const errors = [];
  const ot = (deliveryPricing && deliveryPricing.orderTypes) || {};
  for (const [key, cfg] of Object.entries(ot)) {
    if (!cfg || cfg.distanceMode !== 'bands') continue;
    errors.push(...validateBandList(cfg.bands, key === 'GENERAL_DELIVERY' ? 'Book Delivery' : key));
    if (cfg.maxDistanceKm != null && (!Number.isFinite(Number(cfg.maxDistanceKm)) || Number(cfg.maxDistanceKm) <= 0)) {
      errors.push(`${key}: maxDistanceKm must be > 0`);
    }
    if (cfg.minimumFee != null && Number(cfg.minimumFee) < 0) errors.push(`${key}: minimum fee cannot be negative`);
  }
  return errors;
}

/** Client-side mirror of the server hard rule — rejects invalid config on save. */
export function validateShareConfig(settings) {
  const errors = [];
  for (const b of settings?.riderShareRules?.bands || []) {
    if (String(b.ownership || '').toUpperCase() === 'GO7_OWNED' && b.share > MAX_GO7_OWNED_SHARE) {
      errors.push(`Go7-owned rider share cannot exceed ${MAX_GO7_OWNED_SHARE * 100}% (got ${Math.round(b.share * 100)}%)`);
    }
  }
  for (const c of settings?.corridors || []) {
    const rs = c?.riderShareRate;
    if (rs && typeof rs === 'object' && Number.isFinite(rs.GO7_OWNED) && rs.GO7_OWNED > MAX_GO7_OWNED_SHARE) {
      errors.push(`Corridor ${c.id}: GO7_OWNED share cannot exceed ${MAX_GO7_OWNED_SHARE * 100}%`);
    } else if (Number.isFinite(rs) && rs > MAX_GO7_OWNED_SHARE) {
      // A flat corridor override would also apply to Go7-owned riders.
      errors.push(`Corridor ${c.id}: flat rider share ${Math.round(rs * 100)}% exceeds the 50% Go7-owned cap — use per-ownership override`);
    }
  }
  return errors;
}

/**
 * Book Delivery + FOOD distance-band pricing — mirror of the backend
 * DEFAULT_ORDER_TYPES so the admin UI shows the true active defaults.
 * deliveryPricing.enabled is the production pricing switch; it stays false
 * until the final fare review is approved.
 */
export const DEFAULT_DELIVERY_PRICING = {
  enabled: false,
  orderTypes: {
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
      maximumFee: 0,
      maxDistanceKm: 40,
      roundingStepping: 1,
    },
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
  },
};

/** Operating-cost assumptions — decision support only, never customer pricing. */
export const DEFAULT_ECONOMICS = {
  fuelPricePerLiter: 900,
  motorcycleKmPerLiter: 35,
  bicycleOperatingCostPerKm: 20,
  motorcycleOperatingCostPerKm: 55,
  go7VehicleMaintenanceAllowance: 100,
  paymentProcessingCost: 0.015,
  otherOperationalCost: 0,
  lowContributionRatio: 0.25,
};

function normalizeDistanceBands(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((b) => ({
      minKm: toNumber(b && b.minKm, 0),
      maxKm: b && (b.maxKm === null || b.maxKm === undefined) ? null : toNumber(b.maxKm, null),
      fee: Math.max(0, toNumber(b && b.fee, 0)),
      perKmBeyond: b && b.perKmBeyond != null ? toNumber(b.perKmBeyond, 0) : undefined,
    }))
    .filter((b) => b.fee > 0)
    .sort((a, b) => a.minKm - b.minKm);
}

function normalizeOrderTypeBands(raw, defaults) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    distanceMode: 'bands',
    bands: normalizeDistanceBands(r.bands && r.bands.length ? r.bands : defaults.bands),
    minimumFee: toNumber(r.minimumFee, defaults.minimumFee),
    maximumFee: toNumber(r.maximumFee, defaults.maximumFee),
    maxDistanceKm: r.maxDistanceKm != null ? toNumber(r.maxDistanceKm, defaults.maxDistanceKm) : defaults.maxDistanceKm,
    roundingStepping: toNumber(r.roundingStepping, defaults.roundingStepping),
  };
}

export function normalizeDeliveryPricing(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_DELIVERY_PRICING;
  return {
    enabled: r.enabled === true,
    orderTypes: {
      GENERAL_DELIVERY: normalizeOrderTypeBands(r.orderTypes?.GENERAL_DELIVERY, d.orderTypes.GENERAL_DELIVERY),
      FOOD: normalizeOrderTypeBands(r.orderTypes?.FOOD, d.orderTypes.FOOD),
    },
  };
}

export function normalizeEconomicsSettings(raw) {
  const e = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_ECONOMICS;
  return {
    fuelPricePerLiter: toNumber(e.fuelPricePerLiter, d.fuelPricePerLiter),
    motorcycleKmPerLiter: toNumber(e.motorcycleKmPerLiter, d.motorcycleKmPerLiter),
    bicycleOperatingCostPerKm: toNumber(e.bicycleOperatingCostPerKm, d.bicycleOperatingCostPerKm),
    motorcycleOperatingCostPerKm: toNumber(e.motorcycleOperatingCostPerKm, d.motorcycleOperatingCostPerKm),
    go7VehicleMaintenanceAllowance: toNumber(e.go7VehicleMaintenanceAllowance, d.go7VehicleMaintenanceAllowance),
    paymentProcessingCost: toNumber(e.paymentProcessingCost, d.paymentProcessingCost),
    otherOperationalCost: toNumber(e.otherOperationalCost, d.otherOperationalCost),
    lowContributionRatio: toNumber(e.lowContributionRatio, d.lowContributionRatio),
  };
}

/**
 * High-density pricing corridors — PRICING rules only; they never change the
 * Abeokuta service boundary. The server verifies endpoints by canonical
 * location key AND coordinate proximity before applying the corridor fare.
 * Camp ↔ FUNAAB is the launch corridor target (₦900–₦1,000 customer fee).
 */
export const DEFAULT_CORRIDORS = [
  {
    id: 'CAMP_FUNAAB',
    name: 'Camp ↔ FUNAAB',
    enabled: true,
    orderTypes: ['GENERAL_DELIVERY'],
    pickupAreas: ['camp'],
    dropoffAreas: ['funaab'],
    bidirectional: true,
    maxDistanceKm: 18,
    deliveryFee: 950,
    allowedVehicles: ['BICYCLE', 'MOTORCYCLE'],
    preferredVehicle: null,
    riderShareRate: null, // null = ownership model applies (40% Go7-owned / 60-65% rider-owned)
    fallbackToDistancePricing: true,
    priority: 0,
    radiusKm: 1,
  },
];

function normalizeCorridorAreaList(raw) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((a) => {
      if (typeof a === 'string') return a.trim() || null;
      if (a && typeof a === 'object') {
        const key = String(a.key || a.id || a.name || a.area || '').trim();
        const out = key ? { key } : {};
        if (Number.isFinite(Number(a.lat))) out.lat = Number(a.lat);
        if (Number.isFinite(Number(a.lng))) out.lng = Number(a.lng);
        if (Number.isFinite(Number(a.radiusKm))) out.radiusKm = Number(a.radiusKm);
        return out.key || out.lat != null ? out : null;
      }
      return null;
    })
    .filter(Boolean);
}

export function normalizeCorridors(raw) {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.entries(raw).map(([id, c]) => ({ id, ...c }))
      : DEFAULT_CORRIDORS;
  return list
    .map((c) => {
      if (!c) return null;
      const id = String(c.id || c.name || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
      const deliveryFee = toNumber(c.deliveryFee ?? c.fee, NaN);
      if (!id || !Number.isFinite(deliveryFee) || deliveryFee <= 0) return null;
      return {
        id,
        name: String(c.name || id),
        enabled: c.enabled !== false,
        orderTypes: Array.isArray(c.orderTypes) && c.orderTypes.length ? c.orderTypes : ['GENERAL_DELIVERY'],
        pickupAreas: normalizeCorridorAreaList(c.pickupAreas ?? c.pickupArea ?? c.from),
        dropoffAreas: normalizeCorridorAreaList(c.dropoffAreas ?? c.dropoffArea ?? c.to),
        bidirectional: c.bidirectional !== false,
        maxDistanceKm: toNumber(c.maxDistanceKm ?? c.maxKm, 18),
        deliveryFee: Math.round(deliveryFee),
        allowedVehicles: Array.isArray(c.allowedVehicles) ? c.allowedVehicles : ['BICYCLE', 'MOTORCYCLE'],
        preferredVehicle: c.preferredVehicle || null,
        riderShareRate:
          c.riderShareRate && typeof c.riderShareRate === 'object'
            ? {
                GO7_OWNED: toNumber(c.riderShareRate.GO7_OWNED ?? c.riderShareRate.go7Owned, NaN),
                RIDER_OWNED: toNumber(c.riderShareRate.RIDER_OWNED ?? c.riderShareRate.riderOwned, NaN),
              }
            : c.riderShareRate == null
              ? null
              : toNumber(c.riderShareRate ?? c.share, NaN),
        fallbackToDistancePricing: c.fallbackToDistancePricing !== false,
        priority: toNumber(c.priority, 0),
        radiusKm: toNumber(c.radiusKm ?? c.endpointRadiusKm, 1),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);
}

export const DEFAULT_PRICING_SETTINGS = {
  launchMode: true,
  fuelPriceReference: 1200,
  launchBaseFee: 1000,
  launchIncludedKm: 2,
  launchPerKmAfterIncluded: 150,
  standardBaseFee: 1000,
  standardIncludedKm: 2,
  standardPerKmAfterIncluded: 180,
  waitingGraceMinutes: 10,
  waitingFeePerMinute: 50,
  enableTimeCharge: false,
  minimumDeliveryFee: 1000,
  maximumDeliveryFee: 6000,
  // Platform pricing (customer + rider splits)
  platformFeeRateFood: 0.1,
  platformFeeRateParcel: 0.1,
  go7BikeRiderDeliveryShare: 0.5,
  defaultRiderDeliveryShare: 0.5,
  vendorCommissionRate: 0.08,
  vehicleRules: DEFAULT_VEHICLE_RULES,
  riderShareRules: DEFAULT_RIDER_SHARE_RULES,
  corridors: DEFAULT_CORRIDORS,
  deliveryPricing: DEFAULT_DELIVERY_PRICING,
  economics: DEFAULT_ECONOMICS,
};

let activeSettings = { ...DEFAULT_PRICING_SETTINGS };

export function getActivePricingSettings() {
  return activeSettings;
}

export function setActivePricingSettings(settings) {
  activeSettings = normalizePricingSettings(settings);
  return activeSettings;
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeVehicleRules(raw) {
  const d = DEFAULT_VEHICLE_RULES;
  const src = raw || {};
  const vehicles = {};
  for (const [type, def] of Object.entries(d)) {
    if (type === 'allowMotorcycleFallback' || type === 'fallback') continue;
    const r = src[type] || {};
    vehicles[type] = {
      enabled: r.enabled != null ? Boolean(r.enabled) : def.enabled !== false,
      preferredMinKm: toNumber(r.preferredMinKm, def.preferredMinKm ?? 0),
      preferredMaxKm: toNumber(r.preferredMaxKm, def.preferredMaxKm ?? 999),
      allowedMinKm: toNumber(r.allowedMinKm, def.allowedMinKm ?? def.preferredMinKm ?? 0),
      allowedMaxKm: toNumber(r.allowedMaxKm, def.allowedMaxKm ?? def.preferredMaxKm ?? 999),
      preferred: r.preferred != null ? Boolean(r.preferred) : def.preferred !== false,
    };
  }
  return {
    ...vehicles,
    allowMotorcycleFallback: src.allowMotorcycleFallback !== false,
  };
}

function normalizeRiderShareRules(raw) {
  const d = DEFAULT_RIDER_SHARE_RULES;
  const bands = Array.isArray(raw && raw.bands) ? raw.bands : d.bands;
  return {
    bands: bands
      .map((b) => ({
        ownership: b && b.ownership ? String(b.ownership).toUpperCase() : undefined,
        maxKm: toNumber(b && b.maxKm, 999),
        share: Math.max(0, Math.min(1, toNumber(b && b.share, 0.5))),
        rule: b && b.rule ? String(b.rule) : undefined,
      }))
      .filter((b) => b.maxKm > 0)
      .sort((a, b) => a.maxKm - b.maxKm),
  };
}

export function normalizePricingSettings(data = {}) {
  const d = DEFAULT_PRICING_SETTINGS;
  return {
    launchMode: data.launchMode !== false,
    fuelPriceReference: toNumber(data.fuelPriceReference, d.fuelPriceReference),
    launchBaseFee: toNumber(data.launchBaseFee, d.launchBaseFee),
    launchIncludedKm: toNumber(data.launchIncludedKm, d.launchIncludedKm),
    launchPerKmAfterIncluded: toNumber(data.launchPerKmAfterIncluded, d.launchPerKmAfterIncluded),
    standardBaseFee: toNumber(data.standardBaseFee, d.standardBaseFee),
    standardIncludedKm: toNumber(data.standardIncludedKm, d.standardIncludedKm),
    standardPerKmAfterIncluded: toNumber(data.standardPerKmAfterIncluded, d.standardPerKmAfterIncluded),
    waitingGraceMinutes: toNumber(data.waitingGraceMinutes, d.waitingGraceMinutes),
    waitingFeePerMinute: toNumber(data.waitingFeePerMinute, d.waitingFeePerMinute),
    enableTimeCharge: Boolean(data.enableTimeCharge),
    minimumDeliveryFee: toNumber(data.minimumDeliveryFee, d.minimumDeliveryFee),
    maximumDeliveryFee: toNumber(data.maximumDeliveryFee, d.maximumDeliveryFee),
    platformFeeRateFood: toNumber(data.platformFeeRateFood, d.platformFeeRateFood),
    platformFeeRateParcel: toNumber(data.platformFeeRateParcel, d.platformFeeRateParcel),
    go7BikeRiderDeliveryShare: toNumber(data.go7BikeRiderDeliveryShare, d.go7BikeRiderDeliveryShare),
    defaultRiderDeliveryShare: toNumber(data.defaultRiderDeliveryShare, d.defaultRiderDeliveryShare),
    vendorCommissionRate: toNumber(data.vendorCommissionRate, d.vendorCommissionRate),
    vehicleRules: normalizeVehicleRules(data.vehicleRules),
    riderShareRules: normalizeRiderShareRules(data.riderShareRules),
    corridors: normalizeCorridors(data.corridors),
    deliveryPricing: normalizeDeliveryPricing(data.deliveryPricing),
    economics: normalizeEconomicsSettings(data.economics || (data.deliveryPricing || {}).economics),
    updatedAt: data.updatedAt ?? null,
  };
}

/**
 * @param {object} settings - normalized pricing settings
 * @param {{ distanceKm: number, waitingMinutes?: number, packageMultiplier?: number, durationMin?: number }} options
 */
export function calculateGo7DeliveryFare(settings, options = {}) {
  const s = normalizePricingSettings(settings);
  const km = Math.max(0, toNumber(options.distanceKm, 0));
  const waitingMinutes = Math.max(0, toNumber(options.waitingMinutes, 0));
  const packageMultiplier =
    Number.isFinite(options.packageMultiplier) && options.packageMultiplier > 0
      ? options.packageMultiplier
      : 1;

  const launch = s.launchMode;
  const baseFee = launch ? s.launchBaseFee : s.standardBaseFee;
  const includedKm = launch ? s.launchIncludedKm : s.standardIncludedKm;
  const perKm = launch ? s.launchPerKmAfterIncluded : s.standardPerKmAfterIncluded;

  const chargeableKm = Math.max(0, Math.round((km - includedKm) * 100) / 100);
  const distanceCharge = Math.round(chargeableKm * perKm);

  let waitingCharge = 0;
  if (waitingMinutes > s.waitingGraceMinutes) {
    const billableMinutes = waitingMinutes - s.waitingGraceMinutes;
    waitingCharge = Math.round(billableMinutes * s.waitingFeePerMinute);
  }

  let timeFee = 0;
  if (s.enableTimeCharge && options.durationMin != null) {
    const mins = Math.max(0, toNumber(options.durationMin, 0));
    timeFee = Math.round(mins * 20);
  }

  const subtotalBeforeClamp = baseFee + distanceCharge + waitingCharge + timeFee;
  let deliverySubtotal = Math.max(
    s.minimumDeliveryFee,
    Math.min(s.maximumDeliveryFee, subtotalBeforeClamp)
  );

  const packageSurcharge =
    packageMultiplier > 1 ? Math.round(deliverySubtotal * (packageMultiplier - 1)) : 0;
  let total = deliverySubtotal + packageSurcharge;
  total = Math.min(s.maximumDeliveryFee + packageSurcharge, total);
  total = Math.round(total / 50) * 50;
  total = Math.max(total, s.minimumDeliveryFee);

  return {
    pricingMode: launch ? 'launch' : 'standard',
    baseFee,
    includedKm,
    perKmAfterIncluded: perKm,
    chargeableKm,
    distanceCharge,
    waitingMinutes,
    waitingGraceMinutes: s.waitingGraceMinutes,
    waitingCharge,
    timeFee,
    packageSurcharge,
    subtotal: deliverySubtotal,
    total,
    distance: km,
    minimumDeliveryFee: s.minimumDeliveryFee,
    maximumDeliveryFee: s.maximumDeliveryFee,
    // aliases for legacy UI fields
    baseFare: baseFee,
    distanceFee: distanceCharge,
    duration: options.durationMin ?? 0,
  };
}

export async function fetchPricingSettings(db) {
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, ...PRICING_SETTINGS_DOC_PATH.split('/')));
  if (!snap.exists()) {
    return normalizePricingSettings(DEFAULT_PRICING_SETTINGS);
  }
  return normalizePricingSettings(snap.data());
}

export function subscribePricingSettings(db, onChange, onError) {
  let unsubscribe = () => {};
  import('firebase/firestore').then(({ doc, onSnapshot }) => {
    unsubscribe = onSnapshot(
      doc(db, ...PRICING_SETTINGS_DOC_PATH.split('/')),
      (snap) => {
        const settings = snap.exists()
          ? normalizePricingSettings(snap.data())
          : normalizePricingSettings(DEFAULT_PRICING_SETTINGS);
        setActivePricingSettings(settings);
        if (typeof onChange === 'function') {
          onChange(settings);
        }
      },
      (err) => {
        console.warn('[pricing] Firestore subscribe failed, using defaults:', err?.message);
        const settings = normalizePricingSettings(DEFAULT_PRICING_SETTINGS);
        setActivePricingSettings(settings);
        if (typeof onChange === 'function') {
          onChange(settings);
        }
        onError?.(err);
      }
    );
  });
  return () => unsubscribe();
}

export async function savePricingSettings(db, settings, updatedBy = null) {
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const payload = {
    ...normalizePricingSettings(settings),
    updatedAt: serverTimestamp(),
  };
  // Every pricing change bumps the canonical config version — the backend
  // records it on each quote/order (pricingConfigVersion) for audit.
  payload.deliveryPricing = {
    ...(payload.deliveryPricing || {}),
    version: String(Date.now()),
  };
  if (updatedBy) payload.updatedBy = updatedBy;
  await setDoc(doc(db, ...PRICING_SETTINGS_DOC_PATH.split('/')), payload, { merge: true });
  return payload;
}

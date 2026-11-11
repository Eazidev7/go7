/**
 * Go7 Shared Fare Calculator (Firebase Functions)
 * Mirrors frontend launch/standard pricing from pricingSettings/current
 */

const DEFAULT_PRICING_SETTINGS = {
  launchMode: true,
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
};

function normalizeSettings(data = {}) {
  const d = DEFAULT_PRICING_SETTINGS;
  const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
  return {
    launchMode: data.launchMode !== false,
    launchBaseFee: num(data.launchBaseFee, d.launchBaseFee),
    launchIncludedKm: num(data.launchIncludedKm, d.launchIncludedKm),
    launchPerKmAfterIncluded: num(data.launchPerKmAfterIncluded, d.launchPerKmAfterIncluded),
    standardBaseFee: num(data.standardBaseFee, d.standardBaseFee),
    standardIncludedKm: num(data.standardIncludedKm, d.standardIncludedKm),
    standardPerKmAfterIncluded: num(data.standardPerKmAfterIncluded, d.standardPerKmAfterIncluded),
    waitingGraceMinutes: num(data.waitingGraceMinutes, d.waitingGraceMinutes),
    waitingFeePerMinute: num(data.waitingFeePerMinute, d.waitingFeePerMinute),
    enableTimeCharge: Boolean(data.enableTimeCharge),
    minimumDeliveryFee: num(data.minimumDeliveryFee, d.minimumDeliveryFee),
    maximumDeliveryFee: num(data.maximumDeliveryFee, d.maximumDeliveryFee),
  };
}

function calculateGo7DeliveryFare(settings, options = {}) {
  const s = normalizeSettings(settings);
  const km = Math.max(0, Number(options.distanceKm) || 0);
  const waitingMinutes = Math.max(0, Number(options.waitingMinutes) || 0);
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
    waitingCharge = Math.round((waitingMinutes - s.waitingGraceMinutes) * s.waitingFeePerMinute);
  }

  let timeFee = 0;
  if (s.enableTimeCharge && options.durationMin != null) {
    timeFee = Math.round(Math.max(0, Number(options.durationMin) || 0) * 20);
  }

  const subtotalBeforeClamp = baseFee + distanceCharge + waitingCharge + timeFee;
  let deliverySubtotal = Math.max(
    s.minimumDeliveryFee,
    Math.min(s.maximumDeliveryFee, subtotalBeforeClamp)
  );

  const packageSurcharge =
    packageMultiplier > 1 ? Math.round(deliverySubtotal * (packageMultiplier - 1)) : 0;
  let total = deliverySubtotal + packageSurcharge;
  total = Math.round(total / 50) * 50;
  total = Math.max(total, s.minimumDeliveryFee);

  return {
    baseFee,
    includedKm,
    chargeableKm,
    distanceCharge,
    waitingCharge,
    timeFee,
    packageSurcharge,
    subtotal: deliverySubtotal,
    total,
    distance: km,
    pricingMode: launch ? 'launch' : 'standard',
    baseFare: baseFee,
    distanceCost: distanceCharge,
    timeCost: timeFee,
  };
}

let cachedSettings = { ...DEFAULT_PRICING_SETTINGS };

async function loadPricingSettingsFromFirestore(db) {
  try {
    const snap = await db.doc('pricingSettings/current').get();
    if (snap.exists) {
      cachedSettings = normalizeSettings(snap.data());
    }
  } catch (err) {
    console.warn('Using default pricing settings in functions:', err?.message);
  }
  return cachedSettings;
}

function calculateFare(distanceKm, durationMin, opts = {}) {
  const settings = opts.pricingSettings || cachedSettings;
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin,
    waitingMinutes: opts.waitingMinutes ?? 0,
    packageMultiplier: opts.packageMultiplier ?? 1,
  });
  return result.total;
}

function getFareBreakdown(distanceKm, durationMin, opts = {}) {
  const settings = opts.pricingSettings || cachedSettings;
  return calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin,
    waitingMinutes: opts.waitingMinutes ?? 0,
    packageMultiplier: opts.packageMultiplier ?? 1,
  });
}

module.exports = {
  DEFAULT_PRICING_SETTINGS,
  normalizeSettings,
  calculateGo7DeliveryFare,
  loadPricingSettingsFromFirestore,
  calculateFare,
  getFareBreakdown,
  BASE_FARE: DEFAULT_PRICING_SETTINGS.launchBaseFee,
  PRICE_PER_KM: DEFAULT_PRICING_SETTINGS.launchPerKmAfterIncluded,
  PRICE_PER_MIN: 20,
};

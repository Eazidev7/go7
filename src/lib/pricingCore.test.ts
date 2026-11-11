import {
  calculateDeliveryFee,
  getDeliveryFee,
  verifyDeliveryFeeAgainstQuote,
  normalizePricingConfig,
  ORDER_TYPES,
} from './pricingCore';

function square(latC: number, lngC: number, half: number): number[][] {
  return [
    [latC - half, lngC - half],
    [latC - half, lngC + half],
    [latC + half, lngC + half],
    [latC + half, lngC - half],
  ];
}

const baseConfig = () =>
  normalizePricingConfig({
    enabled: true,
    roundingStepping: 50,
    global: {
      distanceMode: 'linear',
      baseFee: 1000,
      includedKm: 2,
      perKmAfterIncluded: 150,
      minimumFee: 1000,
      maximumFee: 6000,
    },
    zones: [
      { id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: 800, polygon: square(7.22, 3.44, 0.02) },
      { id: 'camp', name: 'Camp / Abule Mecho', priority: 1, baseFee: 800, polygon: square(7.148, 3.36, 0.02) },
    ],
    orderTypes: {
      FOOD: {
        distanceMode: 'bands',
        bands: [
          { minKm: 0, maxKm: 2, fee: 700 },
          { minKm: 2, maxKm: 4, fee: 900 },
        ],
        baseFee: 400,
        minimumFee: 500,
        maximumFee: 6000,
      },
      MARKET: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 400, maximumFee: 6000 },
      PHARMACY: { distanceMode: 'linear', baseFee: 350, perKmAfterIncluded: 90, minimumFee: 350 },
      GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150 },
    },
  });

describe('calculateDeliveryFee — distance pricing', () => {
  it('applies distance bands for distance pricing (outside zone)', () => {
    const config = baseConfig();
    // outside zones -> bands: 1.5km -> ₦700
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.FOOD, distanceKm: 1.5, config });
    expect(r.outsideServiceArea).toBe(false);
    expect(r.deliveryFee).toBe(700);
  });
  it('applies the correct band fee (3km -> ₦900)', () => {
    const config = baseConfig();
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.FOOD, distanceKm: 3, config });
    expect(r.deliveryFee).toBe(900);
  });
  it('applies linear distance pricing for MARKET', () => {
    const config = baseConfig();
    // 400 + 3*100 = 700
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.MARKET, distanceKm: 3, config });
    expect(r.deliveryFee).toBe(700);
  });
});

describe('calculateDeliveryFee — zone pricing', () => {
  it('uses zone base fee when a coordinate is inside a zone with baseFee', () => {
    const config = baseConfig();
    const r = calculateDeliveryFee({
      orderType: ORDER_TYPES.GENERAL_DELIVERY,
      latitude: 7.22,
      longitude: 3.44,
      config,
    });
    expect(r.zoneId).toBe('funaab');
    expect(r.appliedRule).toBe('zone');
    expect(r.zoneFee).toBe(800);
    expect(r.deliveryFee).toBe(800);
  });
  it('falls back to distance pricing when no zone matches', () => {
    const config = baseConfig();
    const r = calculateDeliveryFee({
      orderType: ORDER_TYPES.GENERAL_DELIVERY,
      latitude: 9.0,
      longitude: 3.0,
      distanceKm: 0,
      config,
    });
    expect(r.inZone).toBe(false);
    expect(r.appliedRule).toBe('distance-linear');
  });
});

describe('calculateDeliveryFee — constraints', () => {
  it('clamps to minimum fee', () => {
    const config = normalizePricingConfig({
      ...baseConfig(),
      orderTypes: { FOOD: { distanceMode: 'flat', flatFee: 100, minimumFee: 500, maximumFee: 6000 } },
      zones: [],
    });
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.FOOD, distanceKm: 0, config });
    expect(r.deliveryFee).toBe(500);
  });
  it('clamps to maximum fee', () => {
    const config = normalizePricingConfig({
      ...baseConfig(),
      orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, perKmAfterIncluded: 5000, maximumFee: 6000 } },
      zones: [],
    });
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.GENERAL_DELIVERY, distanceKm: 20, config });
    expect(r.deliveryFee).toBe(6000);
  });
});

describe('calculateDeliveryFee — legacy / config-off behaviour', () => {
  it('returns legacy default fee (FOOD ₦500) when config is disabled', () => {
    const config = normalizePricingConfig({ ...baseConfig(), enabled: false, legacyDefaultFee: 500, zones: [] });
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.FOOD, distanceKm: 3, config });
    expect(r.legacy).toBe(true);
    expect(r.appliedRule).toBe('legacy');
    expect(r.deliveryFee).toBe(500);
  });
});

describe('calculateDeliveryFee — outside service area', () => {
  it('returns outside-service-area when order type is disabled', () => {
    const config = normalizePricingConfig({
      ...baseConfig(),
      orderTypes: { FOOD: { enabled: false } },
      zones: [],
    });
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.FOOD, distanceKm: 3, config });
    expect(r.outsideServiceArea).toBe(true);
    expect(r.deliveryFee).toBe(0);
    expect(r.outsideMessage).toBeTruthy();
  });
});

describe('calculateDeliveryFee — transparent breakdown', () => {
  it('exposes every component', () => {
    const config = baseConfig();
    const r = calculateDeliveryFee({ orderType: ORDER_TYPES.GENERAL_DELIVERY, distanceKm: 5, config });
    expect(r).toHaveProperty('baseFee');
    expect(r).toHaveProperty('distanceFee');
    expect(r).toHaveProperty('zoneFee');
    expect(r).toHaveProperty('orderTypeFee');
    expect(r).toHaveProperty('additionalFees');
    expect(r).toHaveProperty('discounts');
    expect(r).toHaveProperty('deliveryFee');
  });
});

describe('verifyDeliveryFeeAgainstQuote (server authoritative)', () => {
  it('accepts a correct fee', () => {
    const config = baseConfig();
    const result = calculateDeliveryFee({ orderType: ORDER_TYPES.FOOD, distanceKm: 1.5, config });
    const check = verifyDeliveryFeeAgainstQuote(result.deliveryFee, { orderType: ORDER_TYPES.FOOD, distanceKm: 1.5 }, config);
    expect(check.valid).toBe(true);
  });
  it("rejects a tampered (too low) fee — client can't change 800 to 50", () => {
    const config = baseConfig();
    const check = verifyDeliveryFeeAgainstQuote(50, { orderType: ORDER_TYPES.FOOD, distanceKm: 1.5 }, config);
    expect(check.valid).toBe(false);
    expect(check.serverFee).toBe(700);
  });
});

describe('getDeliveryFee', () => {
  it('returns just the numeric fee', () => {
    const config = baseConfig();
    expect(getDeliveryFee({ orderType: ORDER_TYPES.MARKET, distanceKm: 0, config })).toBe(400);
    expect(getDeliveryFee({ orderType: ORDER_TYPES.MARKET, distanceKm: 1, config })).toBe(500);
  });
});

describe('calculateDeliveryFee — service area (named zones optional)', () => {
  // Overall Abeokuta coverage is the authoritative boundary; named zones are
  // optional groupings inside it and must NOT define the boundary.
  const saConfig = () =>
    normalizePricingConfig({
      enabled: true,
      serviceArea: {
        enabled: true,
        bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 },
        center: { lat: 7.1475, lng: 3.3619 },
        maxRadiusKm: 48,
      },
      zones: [{ id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: null, polygon: square(7.22, 3.44, 0.02) }],
      orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 1000, includedKm: 2, perKmAfterIncluded: 150, minimumFee: 1000 } },
    });

  it('destination within Abeokuta but no named zone → default distance pricing (NOT rejected)', () => {
    const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', latitude: 7.1, longitude: 3.3, distanceKm: 1, config: saConfig() });
    expect(r.outsideServiceArea).toBe(false);
    expect(r.zoneId).toBeNull();
    expect(r.appliedRule).toBe('distance-linear');
    expect(r.deliveryFee).toBe(1000);
  });

  it('destination outside Abeokuta service area → outside-service-area', () => {
    const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', latitude: 6.0, longitude: 3.0, distanceKm: 1, config: saConfig() });
    expect(r.outsideServiceArea).toBe(true);
  });

  it('named zone inside Abeokuta is still identified (optional grouping)', () => {
    const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', latitude: 7.22, longitude: 3.44, distanceKm: 1, config: saConfig() });
    expect(r.inZone).toBe(true);
    expect(r.zoneId).toBe('funaab');
    expect(r.appliedRule).toBe('distance-linear'); // baseFee null → distance pricing
  });

  it('FUEL is not gated by the general service area (isolated)', () => {
    const cfg = normalizePricingConfig({
      enabled: true,
      serviceArea: { enabled: true, bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 } },
      orderTypes: { FUEL: { enabled: true, distanceMode: 'flat', flatFee: 1000 } },
      zones: [],
    });
    const r = calculateDeliveryFee({ orderType: 'FUEL', distanceKm: 0, latitude: 6.0, longitude: 3.0, config: cfg });
    expect(r.outsideServiceArea).toBe(false);
    expect(r.deliveryFee).toBe(1000);
  });
});

describe('BOOK DELIVERY launch pricing (base ₦400 + ₦100/km, min ₦500)', () => {
  const bdConfig = () =>
    normalizePricingConfig({
      enabled: true,
      roundingStepping: 50,
      serviceArea: { enabled: true, bounds: { south: 6.72, north: 7.58, west: 2.92, east: 3.88 }, center: { lat: 7.1475, lng: 3.3619 }, maxRadiusKm: 48 },
      zones: [
        { id: 'funaab', name: 'FUNAAB', priority: 1, baseFee: null, polygon: square(7.22, 3.44, 0.02) },
        { id: 'camp', name: 'Camp / Abule Mecho', priority: 1, baseFee: null, polygon: square(7.148, 3.36, 0.01) },
        { id: 'alabata', name: 'Alabata', priority: 1, baseFee: null, polygon: square(7.205, 3.412, 0.015) },
        { id: 'obantoko', name: 'Obantoko', priority: 1, baseFee: null, polygon: square(7.165, 3.375, 0.015) },
      ],
      orderTypes: { GENERAL_DELIVERY: { distanceMode: 'linear', baseFee: 400, includedKm: 0, perKmAfterIncluded: 100, minimumFee: 500, maximumFee: 6000, roundingStepping: 1 } },
    });

  const feeAt = (km: number, lat = 7.1, lng = 3.3) =>
    calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: km, latitude: lat, longitude: lng, config: bdConfig() }).deliveryFee;

  it('0.5 km → ₦500 (minimum)', () => expect(feeAt(0.5)).toBe(500));
  it('1 km → ₦500 (minimum)', () => expect(feeAt(1)).toBe(500));
  it('2 km → ₦600', () => expect(feeAt(2)).toBe(600));
  it('3 km → ₦700', () => expect(feeAt(3)).toBe(700));
  it('5 km → ₦900', () => expect(feeAt(5)).toBe(900));
  it('8 km → ₦1,200', () => expect(feeAt(8)).toBe(1200));
  it('10 km → ₦1,400', () => expect(feeAt(10)).toBe(1400));
  it('2.4 km → ₦640 (exact, decimal distance not rounded prematurely)', () => expect(feeAt(2.4)).toBe(640));

  it('Abeokuta destination outside named zones → accepted at distance pricing', () => {
    const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 3, latitude: 7.13, longitude: 3.34, config: bdConfig() });
    expect(r.outsideServiceArea).toBe(false);
    expect(r.zoneId).toBeNull();
    expect(r.appliedRule).toBe('distance-linear');
  });
  it.each([
    ['FUNAAB', 7.22, 3.44],
    ['Camp', 7.148, 3.36],
    ['Alabata', 7.205, 3.412],
    ['Obantoko', 7.165, 3.375],
    ['Panseke (outside named zones, still accepted)', 7.158, 3.352],
  ])('accepted inside %s', (_n, lat, lng) => {
    const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 2, latitude: lat, longitude: lng, config: bdConfig() });
    expect(r.outsideServiceArea).toBe(false);
  });
  it('outside Abeokuta → rejected', () => {
    const r = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 5, latitude: 6.0, longitude: 3.0, config: bdConfig() });
    expect(r.outsideServiceArea).toBe(true);
  });
  it('referral ₦200 credit is separate from the delivery fee (fee stays ₦600)', () => {
    const fee = calculateDeliveryFee({ orderType: 'GENERAL_DELIVERY', distanceKm: 2, latitude: 7.13, longitude: 3.34, config: bdConfig() }).deliveryFee;
    const promoCreditApplied = 200;
    expect(fee).toBe(600);
    expect(fee - promoCreditApplied).toBe(400); // customer pays, ledger keeps ₦600
  });
});

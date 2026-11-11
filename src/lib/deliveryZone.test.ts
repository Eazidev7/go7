import {
  pointInPolygon,
  detectDeliveryZone,
  normalizeZone,
  DeliveryZone,
} from './deliveryZone';

// [lat, lng] square polygon helper
function square(latC: number, lngC: number, half: number): number[][] {
  return [
    [latC - half, lngC - half],
    [latC - half, lngC + half],
    [latC + half, lngC + half],
    [latC + half, lngC - half],
  ];
}

const zone = (
  id: string,
  name: string,
  polygon: number[][],
  overrides: Partial<DeliveryZone> = {}
): DeliveryZone => ({
  id,
  name,
  enabled: true,
  priority: 0,
  polygon,
  ...overrides,
});

describe('pointInPolygon', () => {
  it('returns true for a point inside the polygon', () => {
    expect(pointInPolygon({ lat: 7.22, lng: 3.44 }, square(7.22, 3.44, 0.01))).toBe(true);
  });
  it('returns false for a point outside the polygon', () => {
    expect(pointInPolygon({ lat: 7.1, lng: 3.3 }, square(7.22, 3.44, 0.01))).toBe(false);
  });
  it('handles invalid polygons safely', () => {
    expect(pointInPolygon({ lat: 7.22, lng: 3.44 }, [])).toBe(false);
    expect(pointInPolygon({ lat: 7.22, lng: 3.44 }, [[1, 2]])).toBe(false);
  });
  it('handles invalid coordinates safely', () => {
    expect(pointInPolygon({ lat: NaN, lng: 3.44 }, square(7.22, 3.44, 0.01))).toBe(false);
    expect(pointInPolygon({ lat: 200, lng: 3.44 }, square(7.22, 3.44, 0.01))).toBe(false);
  });
});

describe('detectDeliveryZone', () => {
  const zones: DeliveryZone[] = [
    zone('funaab', 'FUNAAB', square(7.22, 3.44, 0.02)),
    zone('camp', 'Camp / Abule Mecho', square(7.148, 3.36, 0.01)),
    zone('alabata', 'Alabata', square(7.205, 3.412, 0.015)),
    zone('obantoko', 'Obantoko', square(7.165, 3.375, 0.015)),
  ];

  it('detects a point inside FUNAAB', () => {
    const r = detectDeliveryZone(zones, 7.22, 3.44);
    expect(r.matched).toBe(true);
    expect(r.zoneId).toBe('funaab');
  });
  it('detects a point inside Camp', () => {
    const r = detectDeliveryZone(zones, 7.148, 3.36);
    expect(r.matched).toBe(true);
    expect(r.zoneName).toBe('Camp / Abule Mecho');
  });
  it('detects a point inside Alabata', () => {
    const r = detectDeliveryZone(zones, 7.205, 3.412);
    expect(r.matched).toBe(true);
    expect(r.zoneId).toBe('alabata');
  });
  it('detects a point inside Obantoko', () => {
    const r = detectDeliveryZone(zones, 7.165, 3.375);
    expect(r.matched).toBe(true);
    expect(r.zoneId).toBe('obantoko');
  });
  it('returns matched:false for a point outside all zones', () => {
    const r = detectDeliveryZone(zones, 6.5, 3.0);
    expect(r.matched).toBe(false);
    expect(r.zoneId).toBeNull();
    expect(r.zoneName).toBeNull();
  });
  it('resolves overlap by priority', () => {
    const overlapping = [
      zone('low', 'Low', square(7.22, 3.44, 0.02), { priority: 1 }),
      zone('high', 'High', square(7.22, 3.44, 0.02), { priority: 10 }),
    ];
    const r = detectDeliveryZone(overlapping, 7.22, 3.44);
    expect(r.zoneId).toBe('high');
  });
  it('ignores disabled zones', () => {
    const r = detectDeliveryZone(
      [zone('funaab', 'FUNAAB', square(7.22, 3.44, 0.02), { enabled: false })],
      7.22,
      3.44
    );
    expect(r.matched).toBe(false);
  });
  it('handles invalid coordinates safely', () => {
    expect(detectDeliveryZone(zones, NaN, 3.44).matched).toBe(false);
    expect(detectDeliveryZone(zones, 999, 3.44).matched).toBe(false);
  });
});

describe('normalizeZone', () => {
  it('builds a stable id and skips zones without valid polygons', () => {
    const ok = normalizeZone({ id: 'FUNAAB', name: 'FUNAAB', polygon: square(7.22, 3.44, 0.01) });
    expect(ok?.id).toBe('funaab');
    expect(normalizeZone({ id: 'x', name: 'x', polygon: [] })).toBeNull();
  });
});

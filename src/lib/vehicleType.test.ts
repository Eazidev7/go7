import {
  normalizeVehicleType,
  preferredVehiclesForDistance,
  preferredVehicleForDistance,
  VEHICLE_TYPES,
} from './vehicleType';

describe('normalizeVehicleType', () => {
  it('normalizes bicycle labels', () => {
    expect(normalizeVehicleType('bicycle')).toBe(VEHICLE_TYPES.BICYCLE);
    expect(normalizeVehicleType('Bike')).toBe(VEHICLE_TYPES.BICYCLE);
    expect(normalizeVehicleType('BICYCLE')).toBe(VEHICLE_TYPES.BICYCLE);
  });
  it('normalizes e-bike labels', () => {
    expect(normalizeVehicleType('e-bike')).toBe(VEHICLE_TYPES.EBIKE);
    expect(normalizeVehicleType('ebike')).toBe(VEHICLE_TYPES.EBIKE);
    expect(normalizeVehicleType('Electric Bike')).toBe(VEHICLE_TYPES.EBIKE);
  });
  it('normalizes motorcycle labels', () => {
    expect(normalizeVehicleType('motorcycle')).toBe(VEHICLE_TYPES.MOTORCYCLE);
    expect(normalizeVehicleType('moto')).toBe(VEHICLE_TYPES.MOTORCYCLE);
  });
  it('returns null for unknown/null', () => {
    expect(normalizeVehicleType(null)).toBeNull();
    expect(normalizeVehicleType('helicopter')).toBeNull();
  });
});

describe('preferredVehiclesForDistance (dispatch preference, not mandatory)', () => {
  it('0–3 km prioritizes bicycle / e-bike', () => {
    const list = preferredVehiclesForDistance(2);
    expect(list[0].vehicleType).toBe(VEHICLE_TYPES.BICYCLE);
    expect(list[0].priority).toBeGreaterThan(list[list.length - 1].priority);
  });
  it('5–8 km prioritizes e-bike / motorcycle', () => {
    const list = preferredVehiclesForDistance(6);
    expect(list[0].vehicleType).toBe(VEHICLE_TYPES.EBIKE);
    expect(preferredVehicleForDistance(6)).toBe(VEHICLE_TYPES.EBIKE);
  });
  it('8+ km prioritizes motorcycle', () => {
    expect(preferredVehicleForDistance(9)).toBe(VEHICLE_TYPES.MOTORCYCLE);
  });
  it('a bicycle rider is still allowed on longer trips (list includes bicycle)', () => {
    const list = preferredVehiclesForDistance(9);
    expect(list.some((v) => v.vehicleType === VEHICLE_TYPES.BICYCLE)).toBe(true);
  });
});

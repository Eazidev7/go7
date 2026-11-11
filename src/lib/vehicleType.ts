/**
 * Go7 vehicle-type normalization + dispatch preference.
 *
 * Vehicle types are used by the RIDER/DISPATCH system — NOT a mandatory
 * customer selection. The customer always sees the Book Delivery fee.
 *
 * Accepted vehicle types: BICYCLE, EBIKE, MOTORCYCLE.
 */

export const VEHICLE_TYPES = {
  BICYCLE: 'BICYCLE',
  EBIKE: 'EBIKE',
  MOTORCYCLE: 'MOTORCYCLE',
} as const;
export type VehicleType = (typeof VEHICLE_TYPES)[keyof typeof VEHICLE_TYPES];

const ALIASES: Record<string, VehicleType> = {
  bicycle: VEHICLE_TYPES.BICYCLE,
  bike: VEHICLE_TYPES.BICYCLE,
  'push bike': VEHICLE_TYPES.BICYCLE,
  ebike: VEHICLE_TYPES.EBIKE,
  e_bike: VEHICLE_TYPES.EBIKE,
  'e-bike': VEHICLE_TYPES.EBIKE,
  electric_bike: VEHICLE_TYPES.EBIKE,
  electric: VEHICLE_TYPES.EBIKE,
  motorcycle: VEHICLE_TYPES.MOTORCYCLE,
  moto: VEHICLE_TYPES.MOTORCYCLE,
  bike_moto: VEHICLE_TYPES.MOTORCYCLE,
  'motor bike': VEHICLE_TYPES.MOTORCYCLE,
  okada: VEHICLE_TYPES.MOTORCYCLE,
};

/** Normalise a raw vehicle label to a canonical type (or null if unknown). */
export function normalizeVehicleType(raw: unknown): VehicleType | null {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  return ALIASES[key] || null;
}

export interface VehiclePreference {
  vehicleType: VehicleType;
  /** Soft priority — higher = more preferred. Not a hard restriction. */
  priority: number;
}

/**
 * Dispatch vehicle preference by distance. Purely advisory — a bicycle rider
 * can still take longer trips and a motorcycle can take short trips when needed.
 */
export function preferredVehiclesForDistance(distanceKm: number | string): VehiclePreference[] {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km < 0) return [];
  if (km < 3) {
    return [
      { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.EBIKE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 1 },
    ];
  }
  if (km < 5) {
    return [
      { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 2 },
      { vehicleType: VEHICLE_TYPES.EBIKE, priority: 2 },
      { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 2 },
    ];
  }
  if (km < 8) {
    return [
      { vehicleType: VEHICLE_TYPES.EBIKE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 3 },
      { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 1 },
    ];
  }
  return [
    { vehicleType: VEHICLE_TYPES.MOTORCYCLE, priority: 3 },
    { vehicleType: VEHICLE_TYPES.EBIKE, priority: 2 },
    { vehicleType: VEHICLE_TYPES.BICYCLE, priority: 1 },
  ];
}

/** Highest-preference vehicle for a distance (advisory). */
export function preferredVehicleForDistance(distanceKm: number | string): VehicleType | null {
  const list = preferredVehiclesForDistance(distanceKm);
  if (list.length === 0) return null;
  return list.reduce((a, b) => (b.priority > a.priority ? b : a)).vehicleType;
}

/** Fleet / vehicle type labels — single source for rider registration + admin */

export const FLEET_OPTIONS = [
  { value: 'bike', label: 'Motorcycle / Scooter' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'foot', label: 'Leg Fleet (Walking)' },
];

const BIKE_VALUES = new Set(['rider', 'bike', 'motorcycle', 'scooter', 'motor', 'motorbike']);
const BICYCLE_VALUES = new Set(['bicycle', 'cycle']);
const FOOT_VALUES = new Set(['leg-fleet', 'foot', 'walking', 'walk']);

/**
 * Normalize any stored fleet value to canonical { fleetType, vehicleType, vehicle }.
 * fleetType — legacy field used by registration (rider | bicycle | leg-fleet)
 * vehicleType — used by dispatch matching (bike | bicycle | foot)
 */
export function normalizeFleetType(raw) {
  const v = String(raw || 'bike').toLowerCase().trim();
  if (BICYCLE_VALUES.has(v)) {
    return { fleetType: 'bicycle', vehicleType: 'bicycle', vehicle: 'bicycle' };
  }
  if (FOOT_VALUES.has(v)) {
    return { fleetType: 'leg-fleet', vehicleType: 'foot', vehicle: 'foot' };
  }
  if (BIKE_VALUES.has(v)) {
    return { fleetType: 'rider', vehicleType: 'bike', vehicle: 'bike' };
  }
  return { fleetType: 'rider', vehicleType: 'bike', vehicle: 'bike' };
}

/** Human-readable label for admin UI */
export function formatFleetLabel(rider) {
  if (!rider) return '—';
  const raw = rider.fleetType || rider.vehicleType || rider.vehicle;
  const { fleetType, vehicleType } = normalizeFleetType(raw);
  if (fleetType === 'bicycle' || vehicleType === 'bicycle') return 'Bicycle';
  if (fleetType === 'leg-fleet' || vehicleType === 'foot') return 'Leg Fleet (Walking)';
  return 'Motorcycle / Scooter';
}

/** Value for admin edit dropdown */
export function fleetSelectValue(rider) {
  const raw = rider?.fleetType || rider?.vehicleType || rider?.vehicle;
  const { vehicleType } = normalizeFleetType(raw);
  if (vehicleType === 'bicycle') return 'bicycle';
  if (vehicleType === 'foot') return 'foot';
  return 'bike';
}

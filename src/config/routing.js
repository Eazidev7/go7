/** Shared road-routing config for BookDelivery + fare distance. */
const ORS_FALLBACK = '5b3ce3597851110001cf6248444780b66afcc7b98a7484c91c39529820591b41';

export const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || ORS_FALLBACK;

export const OSRM_ROUTE_BASE =
  import.meta.env.VITE_OSRM_URL ||
  import.meta.env.VITE_DIRECTIONS_URL ||
  'https://router.project-osrm.org/route/v1/driving';

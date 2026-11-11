import { roadDistanceKm } from "./mapbox";
import { haversineKm } from "../utils/distance";
// import { trackMapboxFallback } from './sentry.js';

const cache = new Map();

export async function resolveDistanceKm({ pickup, dropoff }) {
  const key = `${pickup.lat},${pickup.lng}->${dropoff.lat},${dropoff.lng}`;
  const hit = cache.get(key);
  if (hit && (Date.now() - hit.t < 5*60*1000)) return hit.km;
  
  try {
    const km = await roadDistanceKm({ pickup, dropoff });
    cache.set(key, { km, t: Date.now(), src: "road" });
    console.log("route: road", km);
    return km;
  } catch (error) {
    const km = haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    
    // Track the fallback to haversine with console logging
    console.error('Mapbox fallback to haversine:', error, { 
      pickup, 
      dropoff, 
      haversineDistance: km,
      fallbackReason: 'mapbox_api_failure'
    });
    
    cache.set(key, { km, t: Date.now(), src: "haversine" });
    console.log("route: haversine fallback", km, "error:", error.message);
    return km;
  }
}

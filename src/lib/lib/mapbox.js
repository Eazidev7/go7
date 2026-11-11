// import { trackMapboxFallback } from './sentry.js';

export async function roadDistanceKm({ pickup, dropoff }) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  
  if (!token) {
    const error = new Error('Mapbox token not configured');
    // trackMapboxFallback(error, { pickup, dropoff, reason: 'missing_token' });
    console.error('Mapbox Error:', error, { pickup, dropoff, reason: 'missing_token' });
    throw error;
  }
  
  const a = `${pickup.lng},${pickup.lat}`;
  const b = `${dropoff.lng},${dropoff.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${a};${b}?overview=false&access_token=${token}`;
  
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      const error = new Error(`Mapbox API error: ${res.status} ${res.statusText}`);
      // trackMapboxFallback(error, { 
      console.error('Mapbox Error:', error, {
        pickup, 
        dropoff, 
        status: res.status,
        statusText: res.statusText 
      });
      throw error;
    }
    
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    
    if (!meters) {
      const error = new Error('No route found in Mapbox response');
      // trackMapboxFallback(error, { 
      console.error('Mapbox Error:', error, {
        pickup, 
        dropoff, 
        response: data 
      });
      throw error;
    }
    
    return meters / 1000;
  } catch (error) {
    // Track the error for fallback monitoring
    console.error('Mapbox fallback error:', error, { pickup, dropoff });
    throw error;
  }
}

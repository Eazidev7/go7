/**
 * Server-side Google Distance Matrix proxy.
 * Avoids calling Google directly from the browser (which requires a public
 * CORS proxy and exposes the API key) — this callable does the lookup
 * server-to-server instead.
 */
const functions = require('firebase-functions/v1');
const axios = require('axios');

// Dedicated server-only key, scoped ONLY to the Distance Matrix API, no
// referrer restriction (safe — it's never sent to any browser). The
// go7.ng browser Maps key can't be used here because Google enforces its
// referrer restriction even on server-to-server calls, regardless of any
// Referer header we set manually.
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_DISTANCE_MATRIX_SERVER_KEY;

exports.getDistanceMatrix = functions.https.onCall(async (data) => {
  const { origin, destination } = data || {};

  if (
    !origin || !destination ||
    typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
    typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
  ) {
    throw new functions.https.HttpsError('invalid-argument', 'origin and destination {lat,lng} are required');
  }

  const originStr = `${origin.lat},${origin.lng}`;
  const destStr = `${destination.lat},${destination.lng}`;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    originStr
  )}&destinations=${encodeURIComponent(destStr)}&mode=driving&units=metric&region=ng&key=${GOOGLE_MAPS_API_KEY}`;

  if (!GOOGLE_MAPS_API_KEY) {
    return { success: false, error: 'GOOGLE_DISTANCE_MATRIX_SERVER_KEY not configured' };
  }

  try {
    const response = await axios.get(url, { timeout: 8000 });

    const body = response.data;
    if (body.status !== 'OK') {
      throw new Error(`Distance Matrix status: ${body.status} ${body.error_message || ''}`);
    }

    const element = body.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      throw new Error(`Distance Matrix element status: ${element?.status}`);
    }

    return {
      success: true,
      distanceMeters: element.distance.value,
      distanceKm: element.distance.value / 1000,
      durationSeconds: element.duration.value,
      durationMinutes: Math.round(element.duration.value / 60),
      distanceText: element.distance.text,
      durationText: element.duration.text,
    };
  } catch (err) {
    console.error('[getDistanceMatrix] failed:', err.message);
    return { success: false, error: err.message };
  }
});

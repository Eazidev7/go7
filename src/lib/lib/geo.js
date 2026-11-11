/**
 * Geolocation utilities for rider tracking
 */

let watchId = null;

/**
 * Start watching geolocation with high accuracy
 * @param {Function} onUpdate - Callback for position updates
 * @returns {Function} stop - Function to stop watching
 */
export function startGeoWatch(onUpdate) {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported, using fallback');
    // Fallback to Abeokuta coordinates
    const fallbackCoords = {
      lat: 7.1475,
      lng: 3.3619,
      acc: 1000,
      ts: Date.now()
    };
    onUpdate(fallbackCoords);
    return () => {}; // No-op stop function
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000
  };

  const handleSuccess = (position) => {
    const coords = normalizeCoords(position);
    onUpdate(coords);
  };

  const handleError = (error) => {
    console.warn('Geolocation error:', error.message);
    
    // On permission denied or error, use Abeokuta fallback
    const fallbackCoords = {
      lat: 7.1475,
      lng: 3.3619,
      acc: 1000,
      ts: Date.now(),
      error: error.message
    };
    onUpdate(fallbackCoords);
  };

  // Start watching
  watchId = navigator.geolocation.watchPosition(
    handleSuccess,
    handleError,
    options
  );

  // Return stop function
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };
}

/**
 * Normalize position data to consistent format
 * @param {GeolocationPosition} position
 * @returns {Object} { lat, lng, acc, ts }
 */
export function normalizeCoords(position) {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    acc: position.coords.accuracy,
    ts: position.timestamp || Date.now()
  };
}

/**
 * Get current position once (no watching)
 * @returns {Promise<Object>} normalized coordinates
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      resolve({
        lat: 7.1475,
        lng: 3.3619,
        acc: 1000,
        ts: Date.now(),
        fallback: true
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(normalizeCoords(position)),
      (error) => {
        console.warn('getCurrentPosition error:', error.message);
        resolve({
          lat: 7.1475,
          lng: 3.3619,
          acc: 1000,
          ts: Date.now(),
          fallback: true,
          error: error.message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

/**
 * Format accuracy for display
 * @param {number} accuracy - accuracy in meters
 * @returns {string} formatted string
 */
export function formatAccuracy(accuracy) {
  if (!accuracy) return 'Unknown';
  if (accuracy < 10) return 'Very High';
  if (accuracy < 50) return 'High';
  if (accuracy < 100) return 'Medium';
  return 'Low';
}

/**
 * Check if coordinates are the Abeokuta fallback
 * @param {Object} coords
 * @returns {boolean}
 */
export function isFallbackCoords(coords) {
  return coords?.lat === 7.1475 && coords?.lng === 3.3619;
}

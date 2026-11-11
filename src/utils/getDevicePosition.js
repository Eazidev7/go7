import { isCapacitorNative } from './nativePlatform';
import { logLocation } from './locationQuality';

/** Keep waits short — users abandon 30–45s GPS spinners */
const PRECISE_OPTS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

/**
 * One-shot precise device GPS for customer flows.
 * Capacitor native first (Android/iOS WebView); browser Geolocation otherwise.
 */
export async function getDevicePosition() {
  logLocation('gps:request', { native: isCapacitorNative() });

  if (isCapacitorNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      let status = perm?.location || perm?.coarseLocation;
      if (status !== 'granted') {
        const asked = await Geolocation.requestPermissions();
        status = asked?.location || asked?.coarseLocation;
      }
      if (status === 'denied') {
        const err = new Error('Location permission denied');
        err.code = 1;
        throw err;
      }

      const pos = await Geolocation.getCurrentPosition(PRECISE_OPTS);
      const result = {
        latitude: Number(pos.coords.latitude),
        longitude: Number(pos.coords.longitude),
        accuracy: pos.coords.accuracy != null ? Number(pos.coords.accuracy) : null,
        source: 'capacitor',
      };
      logLocation('gps:ok', result);
      return result;
    } catch (err) {
      if (err?.code === 1) throw err;
      logLocation('gps:capacitor-fail', { message: err?.message });
      console.warn('[Go7Location] Capacitor GPS failed, trying browser:', err);
    }
  }

  if (!navigator.geolocation) {
    const err = new Error('Geolocation not supported');
    err.code = 0;
    throw err;
  }

  if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
    const err = new Error('HTTPS required for GPS');
    err.code = 0;
    throw err;
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const result = {
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          accuracy: position.coords.accuracy != null ? Number(position.coords.accuracy) : null,
          source: 'browser',
        };
        logLocation('gps:ok', result);
        resolve(result);
      },
      (error) => {
        logLocation('gps:error', { code: error?.code, message: error?.message });
        // Single short retry only — then fail soft so UI stays usable
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const result = {
              latitude: Number(position.coords.latitude),
              longitude: Number(position.coords.longitude),
              accuracy: position.coords.accuracy != null ? Number(position.coords.accuracy) : null,
              source: 'browser-retry',
            };
            logLocation('gps:ok-retry', result);
            resolve(result);
          },
          reject,
          { ...PRECISE_OPTS, timeout: 8000 }
        );
      },
      PRECISE_OPTS
    );
  });
}

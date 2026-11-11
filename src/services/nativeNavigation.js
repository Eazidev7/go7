/**
 * Native turn-by-turn navigation bridge.
 *
 * Priority:
 * 1. Google Navigation SDK (Android/iOS) via capacitor-google-navigation — in-app Uber-style nav
 * 2. Open Google Maps app — works today on any Android phone
 * 3. Web — RiderJobMap in-app directions (no native SDK)
 */
import { Geolocation } from '@capacitor/geolocation';
import { isAndroidApp, isCapacitorNative, isIosApp } from '../utils/nativePlatform';
import { openGoogleMapsNavigation } from '../utils/riderJobUtils';

const TRAVEL_MODE_MAP = {
  TWO_WHEELER: 'TWO_WHEELER',
  DRIVING: 'DRIVING',
  WALKING: 'WALKING',
  CYCLING: 'CYCLING',
};

let navModulePromise = null;

async function getGoogleNavigationPlugin() {
  if (!isCapacitorNative()) return null;
  if (!navModulePromise) {
    navModulePromise = import('capacitor-google-navigation')
      .then((m) => m.GoogleNavigation)
      .catch(() => null);
  }
  return navModulePromise;
}

async function ensureLocationPermission() {
  const status = await Geolocation.checkPermissions();
  if (status.location === 'granted' || status.coordinates === 'granted') return true;
  const req = await Geolocation.requestPermissions();
  return req.location === 'granted' || req.coordinates === 'granted';
}

/**
 * @param {{ lat: number, lng: number, title?: string, travelMode?: string, origin?: { lat: number, lng: number } }} options
 * @returns {Promise<{ ok: boolean, mode: 'native-sdk' | 'google-maps-app' | 'unavailable' }>}
 */
export async function startNativeNavigation(options) {
  const { lat, lng, title, travelMode = 'TWO_WHEELER', origin } = options || {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, mode: 'unavailable' };
  }

  const destination = { lat, lng };
  const travel = TRAVEL_MODE_MAP[travelMode] || 'TWO_WHEELER';

  // ── 1. Google Navigation SDK (Capacitor native) ──
  const GoogleNavigation = await getGoogleNavigationPlugin();
  if (GoogleNavigation && (isAndroidApp() || isIosApp())) {
    try {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) {
        console.warn('[nav] Location permission denied');
        return fallbackToGoogleMapsApp(origin, destination, title);
      }

      await GoogleNavigation.initialize({});
      await GoogleNavigation.showNavigationView({ show: true });
      await GoogleNavigation.startNavigation({
        destinationLatitude: lat,
        destinationLongitude: lng,
        travelMode: travel,
      });

      return { ok: true, mode: 'native-sdk' };
    } catch (err) {
      console.warn('[nav] Native Navigation SDK failed, falling back:', err?.message || err);
      try {
        await GoogleNavigation?.showNavigationView?.({ show: false });
      } catch {
        /* ignore */
      }
      return fallbackToGoogleMapsApp(origin, destination, title);
    }
  }

  // ── 2. Android without SDK plugin — open Google Maps app ──
  if (isAndroidApp()) {
    return fallbackToGoogleMapsApp(origin, destination, title);
  }

  return { ok: false, mode: 'unavailable' };
}

function fallbackToGoogleMapsApp(origin, destination, title) {
  const opened = openGoogleMapsNavigation(origin, destination, title);
  return { ok: opened, mode: opened ? 'google-maps-app' : 'unavailable' };
}

/** Stop native guidance and hide overlay (call when delivery completes). */
export async function stopNativeNavigation() {
  const GoogleNavigation = await getGoogleNavigationPlugin();
  if (!GoogleNavigation) return;
  try {
    await GoogleNavigation.stopNavigation();
    await GoogleNavigation.showNavigationView({ show: false });
  } catch {
    /* ignore */
  }
}

/** Whether the device can use in-app Navigation SDK (after plugin + rebuild). */
export async function isNativeNavigationAvailable() {
  if (!isCapacitorNative()) return false;
  const plugin = await getGoogleNavigationPlugin();
  return Boolean(plugin);
}

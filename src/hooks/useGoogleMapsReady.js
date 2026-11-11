import { useEffect, useState } from 'react';

/**
 * Wait for Google Maps JS already loaded by index.html (or load once if missing).
 * Avoids useJsApiLoader TDZ/circular-init issues in @react-google-maps/api on iOS.
 *
 * Track / Book Delivery call this as soon as the map mounts — do not wait for the
 * deferred 4s home-page delay, or slow cellular looks like a network outage.
 */
export function useGoogleMapsReady() {
  const [isLoaded, setIsLoaded] = useState(() => Boolean(typeof window !== 'undefined' && window.google?.maps));
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (isLoaded) return undefined;

    let cancelled = false;
    let retried = false;

    const markReady = () => {
      if (!cancelled && window.google?.maps) {
        setIsLoaded(true);
        setLoadError(null);
      }
    };

    const ensureMaps = () => {
      try {
        if (typeof window.__GO7_ENSURE_MAPS__ === 'function') {
          window.__GO7_ENSURE_MAPS__();
        }
      } catch {
        /* ignore */
      }
    };

    ensureMaps();
    window.addEventListener('go7-maps-ready', markReady);

    const interval = window.setInterval(() => {
      if (window.google?.maps) {
        markReady();
        window.clearInterval(interval);
        return;
      }
      if (window.googleMapsApiFailed && !retried) {
        retried = true;
        window.googleMapsApiFailed = false;
        ensureMaps();
      }
    }, 200);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      if (!cancelled && !window.google?.maps) {
        setLoadError(
          new Error(
            window.googleMapsApiFailed
              ? 'Google Maps script failed to load'
              : 'Google Maps is taking too long to load'
          )
        );
      }
    }, 25000);

    return () => {
      cancelled = true;
      window.removeEventListener('go7-maps-ready', markReady);
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [isLoaded]);

  return { isLoaded, loadError };
}

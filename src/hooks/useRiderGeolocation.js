import { useEffect, useRef } from 'react';
import { isCapacitorNative } from '../utils/nativePlatform';

/**
 * High-accuracy rider GPS — uses Capacitor Geolocation on Android/iOS,
 * browser geolocation on web.
 */
export function useRiderGeolocation(onLocation, onError) {
  const watchIdRef = useRef(null);
  const capWatchRef = useRef(null);
  const onLocationRef = useRef(onLocation);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onLocationRef.current = onLocation;
    onErrorRef.current = onError;
  }, [onLocation, onError]);

  useEffect(() => {
    let cancelled = false;

    const emit = (coords) => {
      if (cancelled || !coords) return;
      onLocationRef.current?.({
        lat: coords.latitude ?? coords.lat,
        lng: coords.longitude ?? coords.lng,
        heading: coords.heading ?? coords.bearing ?? null,
        speed: coords.speed ?? null,
        accuracy: coords.accuracy ?? null,
      });
    };

    const handleError = (err) => {
      if (!cancelled) onErrorRef.current?.(err);
    };

    const startBrowserWatch = () => {
      if (!navigator.geolocation) {
        handleError(new Error('Geolocation not supported'));
        return;
      }

      const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 };

      navigator.geolocation.getCurrentPosition(
        (p) => emit(p.coords),
        (e) => handleError(e),
        opts
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (p) => emit(p.coords),
        (e) => handleError(e),
        opts
      );
    };

    const startCapacitorWatch = async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');

        const perm = await Geolocation.requestPermissions();
        if (perm.location === 'denied') {
          handleError(new Error('Location permission denied'));
          return;
        }

        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        emit(pos.coords);

        capWatchRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 15000 },
          (position, err) => {
            if (err) {
              handleError(err);
              return;
            }
            if (position) emit(position.coords);
          }
        );
      } catch (err) {
        console.warn('Capacitor geolocation unavailable, falling back to browser:', err);
        startBrowserWatch();
      }
    };

    if (isCapacitorNative()) {
      startCapacitorWatch();
    } else {
      startBrowserWatch();
    }

    return () => {
      cancelled = true;
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (capWatchRef.current != null) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: capWatchRef.current });
        }).catch(() => {});
      }
    };
  }, []);
}

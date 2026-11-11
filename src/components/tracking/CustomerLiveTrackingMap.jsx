import React, { useMemo, useState, useEffect, Suspense, lazy } from 'react';

const RiderJobMap = lazy(() => import('../rider/RiderJobMap'));

function MapLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Customer live tracking — map loads only when this screen is shown.
 */
export default function CustomerLiveTrackingMap({
  pickup,
  dropoff,
  riderLocation,
  routeCoords = [],
  riderProgress: _riderProgress = 0,
  className = '',
}) {
  const [mapsReady, setMapsReady] = useState(() => Boolean(typeof window !== 'undefined' && window.google?.maps));
  const [mapsFailed, setMapsFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (mapsReady) return undefined;
    setMapsFailed(false);
    try {
      if (typeof window.__GO7_ENSURE_MAPS__ === 'function') window.__GO7_ENSURE_MAPS__(true);
    } catch {
      /* ignore */
    }
    const onReady = () => {
      setMapsReady(true);
      setMapsFailed(false);
    };
    window.addEventListener('go7-maps-ready', onReady);
    const timer = window.setInterval(() => {
      if (window.google?.maps) {
        setMapsReady(true);
        setMapsFailed(false);
        window.clearInterval(timer);
      }
    }, 250);
    const timeout = window.setTimeout(() => {
      window.clearInterval(timer);
      if (!window.google?.maps) {
        setMapsFailed(true);
      }
    }, 12000);
    return () => {
      window.removeEventListener('go7-maps-ready', onReady);
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, [mapsReady, retryKey]);

  const job = useMemo(
    () => ({
      pickupCoords: pickup,
      dropoffCoords: dropoff,
      pickup,
      dropoff,
      status: 'in_transit',
    }),
    [pickup, dropoff]
  );

  const retryMaps = () => {
    setMapsFailed(false);
    setMapsReady(Boolean(window.google?.maps));
    setRetryKey((k) => k + 1);
  };

  return (
    <div className={`relative w-full h-full min-h-[280px] ${className}`}>
      {mapsReady ? (
        <Suspense fallback={<MapLoading />}>
          <RiderJobMap
            job={job}
            riderLocation={riderLocation}
            destinationMode="dropoff"
            navigationMode={false}
            viewMode="customer"
            routeEnabled={false}
            routeCoords={Array.isArray(routeCoords) ? routeCoords : []}
          />
        </Suspense>
      ) : mapsFailed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100 px-6 text-center">
          <p className="text-sm text-gray-600">Map could not load. Check your connection and try again.</p>
          <button
            type="button"
            onClick={retryMaps}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            Retry map
          </button>
        </div>
      ) : (
        <MapLoading />
      )}

      {!riderLocation && mapsReady && (
        <div className="absolute top-3 left-3 right-3 pointer-events-none z-10 flex justify-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-md text-xs font-medium text-gray-600">
            Waiting for rider GPS
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  Polyline,
  TrafficLayer,
} from '@react-google-maps/api';
import { Volume2, VolumeX } from 'lucide-react';
import { MAP_CONFIGS, MAP_TYPES } from '../../config/mapConfig';
import { getDropoffLabel, getPickupLabel, pickCoords } from '../../utils/riderJobUtils';
import {
  bearingDegrees,
  extractRouteSteps,
  findActiveStepIndex,
  formatStepDistance,
  haversineMeters,
  maneuverIcon,
} from '../../utils/navigationSteps';
import { useGoogleMapsReady } from '../../hooks/useGoogleMapsReady';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const NAV_ZOOM = 18;
const ROUTE_REFRESH_MS = 90000;
const ROUTE_REFRESH_DISTANCE_METERS = 150;

/**
 * In-app Google Maps navigation for riders (Uber-style).
 */
export default function RiderJobMap({
  job,
  riderLocation,
  destinationMode = 'dropoff',
  navigationMode = true,
  viewMode = 'rider',
  routeEnabled = true,
  routeCoords = [],
}) {
  const mapConfig =
    viewMode === 'customer'
      ? MAP_CONFIGS[MAP_TYPES.MOBILE_USER]
      : MAP_CONFIGS[MAP_TYPES.RIDER_NAV];
  const isCustomerView = viewMode === 'customer';
  const [directions, setDirections] = useState(null);
  const [etaText, setEtaText] = useState(null);
  const [distanceText, setDistanceText] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const mapRef = useRef(null);
  const hasFittedRef = useRef(false);
  const lastFitKeyRef = useRef('');
  const lastRouteOriginRef = useRef(null);
  const lastSpokenStepRef = useRef(-1);
  const prevLocationRef = useRef(null);

  const { isLoaded, loadError } = useGoogleMapsReady();

  const pickup = useMemo(() => pickCoords(job, 'pickup'), [job]);
  const dropoff = useMemo(() => pickCoords(job, 'dropoff'), [job]);
  const pickupLabel = useMemo(() => getPickupLabel(job), [job]);
  const dropoffLabel = useMemo(() => getDropoffLabel(job), [job]);
  const destination = destinationMode === 'pickup' ? pickup : dropoff;
  const destinationLabel = destinationMode === 'pickup' ? pickupLabel : dropoffLabel;
  const [geocodedDestination, setGeocodedDestination] = useState(null);

  const routeDestination = destination || geocodedDestination;
  const steps = useMemo(() => extractRouteSteps(directions), [directions]);
  const activeStep = steps[activeStepIndex] || null;

  const fetchRoute = useCallback(
    (from, to, { fitBounds = false } = {}) => {
      if (!isLoaded || !from || !to || !window.google?.maps) return;

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: from,
          destination: to,
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
          },
        },
        (result, status) => {
          if (status !== 'OK' || !result) return;
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          setEtaText(leg?.duration_in_traffic?.text || leg?.duration?.text || null);
          setDistanceText(leg?.distance?.text || null);
          if (fitBounds) hasFittedRef.current = false;
          lastRouteOriginRef.current = { lat: from.lat, lng: from.lng };
        }
      );
    },
    [isLoaded]
  );

  useEffect(() => {
    if (!routeEnabled || destination || !isLoaded || !destinationLabel || !window.google?.maps) {
      setGeocodedDestination(null);
      return;
    }

    let cancelled = false;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: `${destinationLabel}, Abeokuta, Nigeria` }, (results, status) => {
      if (cancelled || status !== 'OK' || !results?.[0]?.geometry?.location) return;
      const loc = results[0].geometry.location;
      setGeocodedDestination({ lat: loc.lat(), lng: loc.lng() });
    });

    return () => {
      cancelled = true;
    };
  }, [routeEnabled, destination, destinationLabel, isLoaded]);

  useEffect(() => {
    if (!routeEnabled) {
      setDirections(null);
      return;
    }
    if (!routeDestination) {
      setDirections(null);
      return;
    }
    const from = riderLocation || pickup;
    if (!from) return;
    fetchRoute(from, routeDestination, { fitBounds: !navigationMode });
    // Only re-route when destination changes — not on every GPS tick
  }, [
    routeDestination?.lat,
    routeDestination?.lng,
    pickup?.lat,
    pickup?.lng,
    navigationMode,
    routeEnabled,
    fetchRoute,
  ]);

  useEffect(() => {
    if (!routeEnabled || !riderLocation || !routeDestination || lastRouteOriginRef.current) return;
    fetchRoute(riderLocation, routeDestination);
  }, [routeEnabled, riderLocation?.lat, riderLocation?.lng, routeDestination, fetchRoute]);

  useEffect(() => {
    if (!routeEnabled || !navigationMode || !riderLocation || !routeDestination) return;

    const interval = setInterval(() => {
      const last = lastRouteOriginRef.current;
      if (!last) {
        fetchRoute(riderLocation, routeDestination);
        return;
      }
      const moved = haversineMeters(last, riderLocation);
      if (moved > ROUTE_REFRESH_DISTANCE_METERS) {
        fetchRoute(riderLocation, routeDestination);
      }
    }, ROUTE_REFRESH_MS);

    return () => clearInterval(interval);
  }, [routeEnabled, navigationMode, riderLocation, routeDestination, fetchRoute]);

  useEffect(() => {
    if (!steps.length || !riderLocation) return;
    setActiveStepIndex(findActiveStepIndex(steps, riderLocation));
  }, [steps, riderLocation?.lat, riderLocation?.lng]);

  useEffect(() => {
    if (!voiceEnabled || !activeStep || lastSpokenStepRef.current === activeStepIndex) return;
    if (!('speechSynthesis' in window)) return;

    lastSpokenStepRef.current = activeStepIndex;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${activeStep.distanceText}. ${activeStep.instruction}`
    );
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, activeStep, activeStepIndex]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    // Rider nav follows GPS; customer view should show the whole job.
    if (navigationMode && riderLocation && !isCustomerView) return;

    // Re-fit when pickup/dropoff resolve or rider GPS first appears — not every GPS tick.
    const fitKey = isCustomerView
      ? [
          pickup?.lat?.toFixed(4),
          pickup?.lng?.toFixed(4),
          dropoff?.lat?.toFixed(4),
          dropoff?.lng?.toFixed(4),
          riderLocation ? 'rider' : 'norider',
        ].join('|')
      : 'rider-nav';
    if (isCustomerView) {
      if (fitKey === lastFitKeyRef.current) return;
    } else if (hasFittedRef.current) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoint = false;
    const extend = (pt) => {
      if (pt?.lat == null || pt?.lng == null) return;
      bounds.extend(pt);
      hasPoint = true;
    };

    if (directions) {
      directions.routes[0]?.legs?.forEach((leg) => {
        if (leg.start_location) {
          bounds.extend(leg.start_location);
          hasPoint = true;
        }
        if (leg.end_location) {
          bounds.extend(leg.end_location);
          hasPoint = true;
        }
      });
    }
    extend(pickup);
    extend(dropoff);
    extend(routeDestination);
    extend(riderLocation);

    if (!hasPoint) return;

    const padding = isCustomerView
      ? { top: 72, right: 40, bottom: 48, left: 40 }
      : { top: 100, right: 48, bottom: 80, left: 48 };
    mapRef.current.fitBounds(bounds, padding);
    hasFittedRef.current = true;
    lastFitKeyRef.current = fitKey;
  }, [directions, pickup, dropoff, routeDestination, riderLocation, navigationMode, isCustomerView]);

  useEffect(() => {
    if (!mapRef.current || !riderLocation || !navigationMode) return;

    const map = mapRef.current;
    map.panTo(riderLocation);

    if (map.getZoom() < NAV_ZOOM) {
      map.setZoom(NAV_ZOOM);
    }

    let heading = riderLocation.heading;
    if (heading == null || Number.isNaN(heading) || heading < 0) {
      const prev = prevLocationRef.current;
      if (prev) {
        heading = bearingDegrees(prev, riderLocation);
      } else if (activeStep?.end) {
        heading = bearingDegrees(riderLocation, activeStep.end);
      }
    }

    if (heading != null && Number.isFinite(heading)) {
      try {
        map.setHeading(heading);
        map.setTilt(45);
      } catch {
        /* heading/tilt not supported on all map types */
      }
    }

    prevLocationRef.current = { lat: riderLocation.lat, lng: riderLocation.lng };
  }, [riderLocation?.lat, riderLocation?.lng, riderLocation?.heading, navigationMode, activeStep]);

  const center = riderLocation || routeDestination || pickup || dropoff || { lat: 7.1475, lng: 3.3619 };

  const distanceToTurn = activeStep?.end
    ? haversineMeters(riderLocation, activeStep.end)
    : null;

  if (loadError) {
    return (
      <div className="relative w-full h-full min-h-[320px] bg-gray-900 flex items-center justify-center text-white p-6 text-center">
        <p className="text-sm mb-3">Map could not load right now. Tracking data may still be updating above.</p>
        <button
          type="button"
          className="text-sm font-semibold bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg"
          onClick={() => {
            try {
              if (typeof window.__GO7_ENSURE_MAPS__ === 'function') window.__GO7_ENSURE_MAPS__();
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
        >
          Retry map
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-full min-h-[320px] bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[320px] bg-gray-900">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={navigationMode ? NAV_ZOOM : 15}
        options={{
          ...mapConfig.mapOptions,
          zoomControl: false,
          fullscreenControl: false,
          rotateControl: false,
          streetViewControl: false,
          gestureHandling: navigationMode ? 'greedy' : 'cooperative',
        }}
        onLoad={(map) => {
          mapRef.current = map;
          // Page slides in with a transform — tile grid can size wrong at
          // mount. Nudge a resize once the container settles.
          window.setTimeout(() => {
            try {
              window.google?.maps?.event?.trigger(map, 'resize');
              const c = map.getCenter();
              if (c) map.setCenter(c);
            } catch {
              /* ignore */
            }
          }, 450);
        }}
      >
        {/* Traffic clutter is for rider nav — keep customer map clean */}
        {!isCustomerView ? <TrafficLayer /> : null}

        {pickup && (
          <Marker
            position={pickup}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#22C55E',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            }}
            title="Pickup"
          />
        )}
        {dropoff && (
          <Marker
            position={dropoff}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#111827',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            }}
            title="Dropoff"
          />
        )}
        {riderLocation && (
          <Marker
            position={riderLocation}
            icon={
              isCustomerView
                ? {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#E53935',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3,
                  }
                : {
                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                    rotation: riderLocation.heading ?? 0,
                  }
            }
            title={isCustomerView ? 'Your rider' : 'You'}
          />
        )}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#E30613',
                strokeWeight: navigationMode ? 7 : 5,
                strokeOpacity: 0.95,
              },
            }}
          />
        )}
        {!directions && (routeCoords?.length ?? 0) > 1 && (
          <Polyline
            path={routeCoords.map((point) =>
              Array.isArray(point)
                ? { lat: Number(point[0]), lng: Number(point[1]) }
                : { lat: Number(point.lat), lng: Number(point.lng) }
            )}
            options={{
              strokeColor: '#E30613',
              strokeWeight: 5,
              strokeOpacity: 0.9,
            }}
          />
        )}
      </GoogleMap>

      {/* Turn-by-turn + voice: riders only (customer page has its own ETA chip) */}
      {!isCustomerView && navigationMode && activeStep && (
        <div className="go7-tracking-map-overlay-top absolute left-3 right-3 z-[500]">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden ml-11">
            <div className="flex items-stretch">
              <div className="flex items-center justify-center bg-red-600 px-4 text-3xl font-bold min-w-[56px]">
                {maneuverIcon(activeStep.maneuver)}
              </div>
              <div className="flex-1 px-4 py-3 min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-300 font-semibold">
                  {distanceToTurn != null ? `In ${formatStepDistance(distanceToTurn)}` : 'Next turn'}
                </p>
                <p className="text-base font-semibold leading-snug line-clamp-2">
                  {activeStep.instruction}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVoiceEnabled((v) => !v)}
                className="px-3 flex items-center justify-center text-gray-300 hover:text-white border-l border-gray-700"
                aria-label={voiceEnabled ? 'Mute voice' : 'Enable voice'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rider nav ETA card only — customer tracking sheet owns ETA copy */}
      {!isCustomerView && (etaText || distanceText) && (
        <div
          className={`absolute left-3 right-3 z-[500] pointer-events-none go7-tracking-map-overlay-top ${
            navigationMode && activeStep ? '!top-[calc(9.5rem+var(--go7-safe-top))]' : ''
          }`}
        >
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg px-4 py-2.5 flex items-center justify-between ml-11">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
                {destinationMode === 'pickup' ? 'To pickup' : 'To customer'}
              </p>
              <p className="text-base font-bold text-gray-900">{etaText || 'Calculating...'}</p>
            </div>
            {distanceText && (
              <div className="text-right">
                <p className="text-[10px] text-gray-500">Remaining</p>
                <p className="text-sm font-semibold text-gray-800">{distanceText}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

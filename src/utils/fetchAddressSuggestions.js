// ==========================================================
// GO7 ADDRESS SUGGESTIONS — Maps JS Places + hard rate limits
// Browser-safe (no CORS REST Places). OSM only if Google empty.
// Never invent Abeokuta city-center coords.
// ==========================================================

import {
  isWithinAbeokutaServiceArea,
  isWithinMetroRadius,
  mentionsAbeokutaArea,
} from './abeokutaServiceArea';
import { hasValidCoords } from './locationQuality';

const ABEOKUTA_CENTER = { lat: 7.1475, lng: 3.3619 }; // bias only — never a saved pin

/** fetch with a hard timeout so the location selector never hangs on slow networks */
function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  return fetch(url, { ...options, signal: controller?.signal })
    .finally(() => clearTimeout(timer));
}

const suggestionCache = new Map();
const detailsCache = new Map();
const geocodeCache = new Map();
const reverseCache = new Map();

const SUGGESTION_CACHE_MS = 10 * 60 * 1000;
const DETAILS_CACHE_MS = 24 * 60 * 60 * 1000;
const GEOCODE_CACHE_MS = 24 * 60 * 60 * 1000;

/** Hard caps per browser tab/session — protects Google bill */
const SESSION_LIMITS = {
  autocomplete: 30,
  details: 20,
  geocode: 15,
  reverse: 15,
};

/** Daily caps across tabs (localStorage) — second line of defense */
const DAILY_LIMITS = {
  autocomplete: 120,
  details: 80,
  geocode: 60,
  reverse: 60,
};

const MIN_AUTOCOMPLETE_INTERVAL_MS = 1000;

const sessionUsage = {
  autocomplete: 0,
  details: 0,
  geocode: 0,
  reverse: 0,
  lastAutocompleteAt: 0,
};

function loadSessionUsage() {
  try {
    const raw = sessionStorage.getItem('go7_maps_usage_v1');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      sessionUsage.autocomplete = Number(parsed.autocomplete) || 0;
      sessionUsage.details = Number(parsed.details) || 0;
      sessionUsage.geocode = Number(parsed.geocode) || 0;
      sessionUsage.reverse = Number(parsed.reverse) || 0;
    }
  } catch {
    /* private mode */
  }
}

function persistSessionUsage() {
  try {
    sessionStorage.setItem(
      'go7_maps_usage_v1',
      JSON.stringify({
        autocomplete: sessionUsage.autocomplete,
        details: sessionUsage.details,
        geocode: sessionUsage.geocode,
        reverse: sessionUsage.reverse,
      })
    );
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  loadSessionUsage();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadDailyUsage() {
  try {
    const raw = localStorage.getItem('go7_maps_daily_v1');
    if (!raw) return { day: todayKey(), autocomplete: 0, details: 0, geocode: 0, reverse: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.day !== todayKey()) {
      return { day: todayKey(), autocomplete: 0, details: 0, geocode: 0, reverse: 0 };
    }
    return {
      day: parsed.day,
      autocomplete: Number(parsed.autocomplete) || 0,
      details: Number(parsed.details) || 0,
      geocode: Number(parsed.geocode) || 0,
      reverse: Number(parsed.reverse) || 0,
    };
  } catch {
    return { day: todayKey(), autocomplete: 0, details: 0, geocode: 0, reverse: 0 };
  }
}

function persistDailyUsage(usage) {
  try {
    localStorage.setItem('go7_maps_daily_v1', JSON.stringify(usage));
  } catch {
    /* ignore */
  }
}

function canCall(kind) {
  const sessionLimit = SESSION_LIMITS[kind];
  if (sessionLimit && sessionUsage[kind] >= sessionLimit) {
    console.warn(`⚠️ GO7 Maps session limit: ${kind} (${sessionUsage[kind]}/${sessionLimit})`);
    return false;
  }
  const daily = loadDailyUsage();
  const dailyLimit = DAILY_LIMITS[kind];
  if (dailyLimit && (daily[kind] || 0) >= dailyLimit) {
    console.warn(`⚠️ GO7 Maps daily limit: ${kind} (${daily[kind]}/${dailyLimit})`);
    return false;
  }
  return true;
}

function recordCall(kind) {
  sessionUsage[kind] = (sessionUsage[kind] || 0) + 1;
  persistSessionUsage();
  const daily = loadDailyUsage();
  daily[kind] = (daily[kind] || 0) + 1;
  persistDailyUsage(daily);
}

function waitForGooglePlaces(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    if (window.google?.maps?.places) {
      resolve(window.google.maps.places);
      return;
    }
    try {
      if (typeof window.__GO7_ENSURE_MAPS__ === 'function') {
        window.__GO7_ENSURE_MAPS__();
      }
    } catch {
      /* ignore */
    }
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(timer);
        resolve(window.google.maps.places);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, 120);
  });
}

async function fetchGooglePlacesJs(query) {
  if (!canCall('autocomplete')) return [];

  const now = Date.now();
  const since = now - sessionUsage.lastAutocompleteAt;
  if (since < MIN_AUTOCOMPLETE_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_AUTOCOMPLETE_INTERVAL_MS - since));
  }

  const placesNs = await waitForGooglePlaces(3000);
  if (!placesNs || !window.google?.maps) return [];

  return new Promise((resolve) => {
    try {
      sessionUsage.lastAutocompleteAt = Date.now();
      recordCall('autocomplete');
      const service = new placesNs.AutocompleteService();
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'ng' },
          location: new window.google.maps.LatLng(ABEOKUTA_CENTER.lat, ABEOKUTA_CENTER.lng),
          radius: 45000,
        },
        (predictions, status) => {
          if (
            status !== placesNs.PlacesServiceStatus.OK ||
            !Array.isArray(predictions) ||
            predictions.length === 0
          ) {
            resolve([]);
            return;
          }
          resolve(
            predictions.map((prediction) => ({
              source: 'google',
              description: prediction.description,
              place_id: prediction.place_id,
              structured_formatting: prediction.structured_formatting,
              icon: '🔵',
            }))
          );
        }
      );
    } catch (error) {
      console.warn('Google Places JS autocomplete failed:', error);
      resolve([]);
    }
  });
}

async function getGooglePlaceGeometry(placeId) {
  if (!placeId) return null;

  const cached = detailsCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < DETAILS_CACHE_MS) {
    return cached.data;
  }

  if (!canCall('details')) return cached?.data || null;

  const placesNs = await waitForGooglePlaces();
  if (!placesNs || !window.google?.maps) return null;

  return new Promise((resolve) => {
    try {
      recordCall('details');
      const attribution = document.createElement('div');
      const service = new placesNs.PlacesService(attribution);
      service.getDetails(
        { placeId, fields: ['geometry', 'formatted_address', 'name'] },
        (place, status) => {
          if (
            status !== placesNs.PlacesServiceStatus.OK ||
            !place?.geometry?.location
          ) {
            resolve(null);
            return;
          }
          const data = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            formatted_address: place.formatted_address || place.name || null,
          };
          detailsCache.set(placeId, { data, timestamp: Date.now() });
          resolve(data);
        }
      );
    } catch (error) {
      console.warn('Google Places Details failed:', error);
      resolve(null);
    }
  });
}

async function geocodeWithGoogleJs(address) {
  const cacheKey = String(address || '').toLowerCase().trim();
  if (!cacheKey) return null;

  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GEOCODE_CACHE_MS) {
    return cached.data;
  }

  if (!canCall('geocode')) return cached?.data || null;

  await waitForGooglePlaces(4000);
  if (!window.google?.maps?.Geocoder) return null;

  return new Promise((resolve) => {
    try {
      recordCall('geocode');
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        {
          address,
          componentRestrictions: { country: 'NG' },
          region: 'ng',
        },
        (results, status) => {
          if (status !== 'OK' || !results?.[0]?.geometry?.location) {
            resolve(null);
            return;
          }
          const loc = results[0].geometry.location;
          const data = { lat: loc.lat(), lng: loc.lng() };
          geocodeCache.set(cacheKey, { data, timestamp: Date.now() });
          resolve(data);
        }
      );
    } catch (error) {
      console.warn('Google JS geocode failed:', error);
      resolve(null);
    }
  });
}

async function fetchOsmSuggestions(query) {
  try {
    const osmURL = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )},Abeokuta&format=json&addressdetails=1&limit=5&countrycodes=ng`;
    const osmRes = await fetchWithTimeout(osmURL, {
      headers: { 'User-Agent': 'Go7DeliveryApp/1.0' },
    }, 6000);
    const osmData = await osmRes.json();
    if (!Array.isArray(osmData)) return [];
    return osmData.map((place) => ({
      source: 'osm',
      description: place.display_name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      osm_id: place.osm_id,
      address: place.address,
      icon: '🟢',
    }));
  } catch (error) {
    console.warn('OSM Nominatim failed:', error);
    return [];
  }
}

/**
 * Fetch address suggestions — Google first; OSM only if Google returns nothing.
 */
async function fetchAddressSuggestions(query) {
  if (!query || query.length < 3) {
    return [];
  }

  const cacheKey = query.toLowerCase().trim();
  const cached = suggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SUGGESTION_CACHE_MS) {
    return cached.data;
  }

  // Hard cap so the selector never waits longer than ~8s regardless of provider.
  const run = async () => {
    let googleResults = await fetchGooglePlacesJs(query);
    let osmResults = [];

    // Only hit OSM when Google is empty (cuts parallel API usage + coarse pin wins)
    if (googleResults.length === 0) {
      osmResults = await fetchOsmSuggestions(query);
    }

    const results = [...googleResults, ...osmResults];

    const abeokutaFiltered = results.filter(
      (r) =>
        mentionsAbeokutaArea(r.description) ||
        (r.lat &&
          r.lon &&
          (isWithinAbeokutaServiceArea(r.lat, r.lon) ||
            isWithinMetroRadius(r.lat, r.lon))) ||
        (r.source === 'google' && /abeokuta|ogun|nigeria/i.test(r.description || ''))
    );

    // Drop coarse LGA-only hits (e.g. bare "Odeda" / "Ode Da") — they pin the wrong place
    const withoutCoarseLga = abeokutaFiltered.filter((r) => {
      const desc = r.description || r.display_name || '';
      const head = desc.split(',')[0]?.trim() || '';
      if (isOdedaLgaToken(head) && !/abeokuta|street|road|rd\b|avenue|close|estate/i.test(desc)) {
        return false;
      }
      return true;
    });

    const preferred = withoutCoarseLga.length > 0 ? withoutCoarseLga : abeokutaFiltered;

    const pool =
      preferred.length > 0
        ? preferred
        : googleResults.length > 0
          ? googleResults
          : results;

    const uniqueResults = deduplicateSuggestions(pool);
    const sortedResults = prioritizeAbeokutaResults(uniqueResults);
    const finalResults = sortedResults.slice(0, 7);

    suggestionCache.set(cacheKey, {
      data: finalResults,
      timestamp: Date.now(),
    });

    return finalResults;
  };

  try {
    return await Promise.race([
      run(),
      new Promise((resolve) => setTimeout(() => resolve([]), 8000)),
    ]);
  } catch (error) {
    console.error('Error fetching address suggestions:', error);
    return [];
  }
}

function deduplicateSuggestions(results) {
  const seen = new Set();
  const unique = [];

  for (const result of results) {
    const normalizedKey = (result.description || '')
      .toLowerCase()
      .replace(/[,.-]/g, '')
      .trim()
      .substring(0, 50);

    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      unique.push(result);
    }
  }

  return unique;
}

function prioritizeAbeokutaResults(results) {
  const abeokutaKeywords = [
    'abeokuta',
    'ogun state',
    'funaab',
    'ibara',
    'olomore',
    'omida',
    'isale igbein',
    'ijaiye',
    'lafenwa',
    'ita eko',
    'panseke',
    'kuto',
    'sapon',
    'quarry',
    'sokori',
    'obantoko',
    'adatan',
    'oke ilewo',
  ];

  return results.sort((a, b) => {
    const aText = (a.description || '').toLowerCase();
    const bText = (b.description || '').toLowerCase();

    const aHasKeyword = abeokutaKeywords.some((keyword) => aText.includes(keyword));
    const bHasKeyword = abeokutaKeywords.some((keyword) => bText.includes(keyword));

    if (aHasKeyword && !bHasKeyword) return -1;
    if (!aHasKeyword && bHasKeyword) return 1;

    if (a.source === 'google' && b.source === 'osm') return -1;
    if (a.source === 'osm' && b.source === 'google') return 1;

    return 0;
  });
}

/**
 * Get coordinates for a selected suggestion (Places Details preferred)
 */
export async function getCoordinatesFromSuggestion(suggestion) {
  try {
    if (!suggestion) return null;

    const placeId = suggestion.place_id || suggestion.placeId || null;
    const description =
      suggestion.description || suggestion.display_name || suggestion.address || '';

    // Google place_id → always Places Details (homepage must not use list/OSM centroids)
    if (placeId) {
      let geometry = await getGooglePlaceGeometry(placeId);
      if (!geometry?.lat) {
        await waitForGooglePlaces(4000);
        geometry = await getGooglePlaceGeometry(placeId);
      }
      if (geometry?.lat != null && geometry?.lng != null) {
        return rejectCityCenterPin({ lat: geometry.lat, lng: geometry.lng });
      }
    }

    // Prefer Google text geocode over list/OSM centroids (homepage LocationSelector)
    if (description) {
      const googled = await geocodeAddress(description);
      if (googled?.lat != null && googled?.lng != null) {
        return rejectCityCenterPin(googled);
      }
    }

    if (suggestion.coordinates?.lat && suggestion.coordinates?.lng) {
      return rejectCityCenterPin({
        lat: Number(suggestion.coordinates.lat),
        lng: Number(suggestion.coordinates.lng),
      });
    }

    if (suggestion.source === 'osm' && suggestion.lat && suggestion.lon) {
      return rejectCityCenterPin({
        lat: Number(suggestion.lat),
        lng: Number(suggestion.lon),
      });
    }

    return null;
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
}

/** Never persist invent / city-center pins as a delivery location */
function rejectCityCenterPin(coords) {
  if (!coords || coords.lat == null || coords.lng == null) return null;
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (!hasValidCoords({ lat, lng })) {
    console.warn('Rejected invent/seed delivery pin');
    return null;
  }
  return { lat, lng };
}

/**
 * Geocode an address string — Maps JS only (no CORS REST / no city-center invent)
 */
async function geocodeAddress(address) {
  try {
    const jsResult = await geocodeWithGoogleJs(address);
    if (jsResult?.lat != null && jsResult?.lng != null) {
      return jsResult;
    }

    const osmURL = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      address
    )},Abeokuta&format=json&limit=1&countrycodes=ng`;
    const osmResponse = await fetchWithTimeout(osmURL, {
      headers: { 'User-Agent': 'Go7DeliveryApp/1.0' },
    }, 6000);
    const osmData = await osmResponse.json();

    if (osmData?.[0]) {
      return {
        lat: parseFloat(osmData[0].lat),
        lng: parseFloat(osmData[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Prefer street-level reverse results over coarse LGAs like "Odeda" / "Ode Da"
 * (Google often labels Abeokuta pins as Odeda administrative_area_level_2).
 */
function pickBestReverseResult(results) {
  if (!Array.isArray(results) || results.length === 0) return null;
  const preferTypes = [
    'street_address',
    'premise',
    'subpremise',
    'route',
    'intersection',
    'neighborhood',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'locality',
    'point_of_interest',
    'establishment',
  ];
  for (const type of preferTypes) {
    const hit = results.find((r) => {
      if (!Array.isArray(r.types) || !r.types.includes(type)) return false;
      const head = r.formatted_address?.split(',')[0] || r.name || '';
      return !isOdedaLgaToken(head);
    });
    if (hit) return hit;
  }
  const nonCoarse = results.find((r) => {
    const head = r.formatted_address?.split(',')[0] || r.name || '';
    if (isOdedaLgaToken(head)) return false;
    if (!Array.isArray(r.types)) return true;
    return !r.types.every(
      (t) =>
        t.startsWith('administrative_area') ||
        t === 'political' ||
        t === 'plus_code' ||
        t === 'country' ||
        t === 'postal_code' ||
        t === 'village'
    );
  });
  return nonCoarse || results[0];
}

function componentName(result, type) {
  const c = result?.address_components?.find((x) => x.types?.includes(type));
  return c?.long_name || '';
}

/** Collapse "Ode Da" / "Ode-Da" / "Odeda" to one key for LGA detection */
function normalizePlaceKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '');
}

function isOdedaLgaToken(text) {
  const key = normalizePlaceKey(text);
  if (!key) return false;
  return (
    key === 'odeda' ||
    key.startsWith('odedalga') ||
    key.startsWith('odedalocalgovernment') ||
    key === 'odedaogun' ||
    key === 'odedaogunstate'
  );
}

const COARSE_OGUN_LGA_KEYS = new Set([
  'odeda',
  'obafemiowode',
  'ewekoro',
  'ifo',
  'adoodoota',
]);

/** Abeokuta neighborhoods/landmarks that are NOT street addresses by themselves */
const ABEOKUTA_AREA_ONLY_KEYS = new Set([
  'obantoko',
  'panseke',
  'kuto',
  'camp',
  'lafenwa',
  'ibara',
  'olomore',
  'funaab',
  'adatan',
  'sapon',
  'quarry',
  'sokori',
  'omida',
  'ijaiye',
  'isaleigbein',
  'itaeko',
  'okeilewo',
  'abeokuta',
  'ogun',
  'ogunstate',
]);

function hasStreetSignal(text) {
  const t = String(text || '');
  if (!t.trim()) return false;
  if (
    /\b(street|st\.?|road|rd\.?|avenue|ave\.?|close|crescent|lane|drive|way|estate|bypass|express|junction|bus\s*stop)\b/i.test(
      t
    )
  ) {
    return true;
  }
  // e.g. "12 Unity Road" / "Plot 4 ..."
  if (/\b(\d+|plot)\s+[a-z]/i.test(t)) return true;
  return false;
}

function isAreaOnlyLabel(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (hasStreetSignal(t)) return false;
  const first = (t.split(',')[0] || '').trim();
  const firstKey = normalizePlaceKey(first.replace(/\s*zone$/i, ''));
  if (ABEOKUTA_AREA_ONLY_KEYS.has(firstKey)) return true;
  // "Obantoko, Abeokuta, Ogun, Nigeria" with no street
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 1 && parts.length <= 4) {
    const headKey = normalizePlaceKey(parts[0].replace(/\s*zone$/i, ''));
    if (ABEOKUTA_AREA_ONLY_KEYS.has(headKey)) return true;
  }
  return false;
}

function isCoarseOgunLgaLabel(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  const first = (t.split(',')[0] || '').trim();
  const firstKey = normalizePlaceKey(first);
  if (isOdedaLgaToken(first)) return true;
  if (COARSE_OGUN_LGA_KEYS.has(firstKey)) return true;
  if (/^(obafemi owode|ewekoro|ifo|ado[- ]?odo[- ]?ota)(\s+(lga|local government))?$/i.test(first)) {
    return true;
  }
  const fullKey = normalizePlaceKey(t);
  if (fullKey === 'odeda' || fullKey.startsWith('odedaogun') || fullKey.startsWith('odedanigeria')) {
    return true;
  }
  if (
    /^(odeda|ode\s*da|obafemi owode|ewekoro|ifo|ado[- ]?odo[- ]?ota)(\s*,\s*(ogun(\s+state)?|nigeria))*$/i.test(
      t.toLowerCase()
    )
  ) {
    return true;
  }
  return false;
}

function logLocation(stage, detail) {
  try {
    console.info('[Go7Location]', stage, detail || '');
  } catch {
    /* ignore */
  }
}

/**
 * Rider-facing label: street when known; otherwise area + exact coords (never area alone).
 */
export function formatPinLabel({ street, area, lat, lng } = {}) {
  const latN = Number(lat);
  const lngN = Number(lng);
  const coords =
    Number.isFinite(latN) && Number.isFinite(lngN) ? `${latN.toFixed(5)}, ${lngN.toFixed(5)}` : null;
  const streetText = String(street || '').trim();
  const areaText = String(area || '')
    .replace(/\s*Zone$/i, '')
    .trim();

  if (streetText && hasStreetSignal(streetText) && !isAreaOnlyLabel(streetText)) {
    const bits = [streetText];
    if (areaText && !normalizePlaceKey(streetText).includes(normalizePlaceKey(areaText))) {
      bits.push(areaText);
    }
    if (!bits.some((b) => /abeokuta/i.test(b))) bits.push('Abeokuta');
    return bits.join(', ');
  }

  // Landmark/area alone is useless for riders — always attach the GPS pin
  if (areaText && coords) return `Near ${areaText} · ${coords}`;
  if (coords) return `Delivery pin · ${coords}`;
  if (areaText) return `Near ${areaText}, Abeokuta`;
  return 'Abeokuta';
}

/**
 * Never show bare LGA / landmark (Obantoko, Odeda, …) as the delivery address.
 * Prefer street; otherwise area + precise lat/lng so riders can navigate.
 */
export function sanitizeDeliveryLabel(label, lat, lng) {
  const zone =
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? detectLocalZone(Number(lat), Number(lng))
      : null;
  const zoneName = zone ? String(zone).replace(/\s*Zone$/i, '') : '';

  let text = String(label || '').trim();
  text = text.replace(/\bOde[\s-]*Da(\s+LGA|\s+Local Government Area|\s+Local Government)?\b/gi, zoneName || 'Abeokuta');
  text = text.replace(/\bOdeda(\s+LGA|\s+Local Government Area|\s+Local Government)?\b/gi, zoneName || 'Abeokuta');

  const first = (text.split(',')[0] || '').trim();
  const looksStreet = hasStreetSignal(text) && !isAreaOnlyLabel(first);

  if (looksStreet && !isCoarseOgunLgaLabel(text) && !isOdedaLgaToken(first)) {
    logLocation('sanitize:street-ok', { text, lat, lng });
    return text;
  }

  // Pull a possible area name from reverse label / zone (Obantoko, etc.)
  let areaHint = zoneName;
  if (isAreaOnlyLabel(text) || isCoarseOgunLgaLabel(text)) {
    const head = first.replace(/\s*Zone$/i, '');
    if (head && !isOdedaLgaToken(head)) areaHint = head || areaHint;
  } else if (text && !looksStreet) {
    areaHint = first || areaHint;
  }

  const pinLabel = formatPinLabel({ street: looksStreet ? text : '', area: areaHint, lat, lng });
  logLocation('sanitize:area→pin', { before: label, after: pinLabel, lat, lng });
  return pinLabel;
}

/**
 * Build a delivery-friendly label: street + suburb/locality, never village "Ode Da".
 */
export function formatReverseGeocodeLabel(result, lat, lng) {
  if (!result) return null;

  const streetNum = componentName(result, 'street_number');
  const route = componentName(result, 'route');
  const street = [streetNum, route].filter(Boolean).join(' ').trim();

  // Prefer suburb / neighborhood / sublocality over village (OSM/Google "Ode Da" village)
  const village = componentName(result, 'village') || componentName(result, 'hamlet');
  const hood =
    componentName(result, 'neighborhood') ||
    componentName(result, 'sublocality_level_1') ||
    componentName(result, 'sublocality') ||
    componentName(result, 'sublocality_level_2') ||
    componentName(result, 'administrative_area_level_3');

  let locality =
    componentName(result, 'locality') ||
    componentName(result, 'postal_town') ||
    componentName(result, 'administrative_area_level_2');

  const zone = Number.isFinite(lat) && Number.isFinite(lng) ? detectLocalZone(lat, lng) : null;
  const zoneName = zone ? String(zone).replace(/\s*Zone$/i, '') : '';

  if (isOdedaLgaToken(locality) || isOdedaLgaToken(village)) {
    locality = zoneName || (hood && !isOdedaLgaToken(hood) ? hood : '') || 'Abeokuta';
  }

  const parts = [];
  if (street) parts.push(street);
  else if (result.name && !isCoarseOgunLgaLabel(result.name) && !isOdedaLgaToken(result.name)) {
    parts.push(result.name);
  }

  if (hood && !isOdedaLgaToken(hood) && !parts.some((p) => p.toLowerCase().includes(hood.toLowerCase()))) {
    parts.push(hood);
  } else if (zoneName && !parts.some((p) => p.toLowerCase().includes(zoneName.toLowerCase()))) {
    parts.push(zoneName);
  } else if (
    village &&
    !isOdedaLgaToken(village) &&
    !parts.some((p) => p.toLowerCase().includes(village.toLowerCase()))
  ) {
    // Village only if it is not the Odeda LGA mislabel
    parts.push(village);
  }

  if (
    locality &&
    !isOdedaLgaToken(locality) &&
    !parts.some((p) => p.toLowerCase().includes(String(locality).toLowerCase()))
  ) {
    parts.push(locality);
  } else if (!parts.some((p) => /abeokuta/i.test(p))) {
    parts.push('Abeokuta');
  }

  const areaHint =
    (hood && !isOdedaLgaToken(hood) && !isAreaOnlyLabel(hood) ? hood : null) ||
    (locality && !isOdedaLgaToken(locality) ? locality : null) ||
    zoneName ||
    '';

  logLocation('formatReverse', {
    street,
    hood,
    village,
    locality,
    zoneName,
    formatted: result.formatted_address,
  });

  // Street-level only as a plain label; area-only becomes Near {area} · lat,lng via sanitize
  if (street && hasStreetSignal(street)) {
    return formatPinLabel({ street, area: areaHint || 'Abeokuta', lat, lng });
  }

  const formatted = result.formatted_address || '';
  if (formatted && hasStreetSignal(formatted) && !isAreaOnlyLabel(formatted.split(',')[0])) {
    return sanitizeDeliveryLabel(formatted, lat, lng);
  }

  return formatPinLabel({
    street: '',
    area: areaHint || zoneName || (isAreaOnlyLabel(formatted) ? formatted.split(',')[0] : ''),
    lat,
    lng,
  });
}

export async function reverseGeocode(lat, lng) {
  try {
    const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
    const cached = reverseCache.get(cacheKey);
    // Short TTL for reverse labels — stale "Ode Da" must not stick for 24h
    const reverseTtlMs = 10 * 60 * 1000;
    if (cached && Date.now() - cached.timestamp < reverseTtlMs) {
      const fromCache = sanitizeDeliveryLabel(cached.data, lat, lng);
      logLocation('reverse:cache', { cacheKey, cached: cached.data, cleaned: fromCache });
      return fromCache;
    }

    await waitForGooglePlaces(3000);
    if (window.google?.maps?.Geocoder && canCall('reverse')) {
      const jsRev = await new Promise((resolve) => {
        let settled = false;
        const done = (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);
          resolve(value);
        };
        const watchdog = setTimeout(() => done(null), 5000);
        try {
          recordCall('reverse');
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
            logLocation('reverse:google', {
              status,
              top: results?.[0]?.formatted_address,
              types: results?.[0]?.types,
            });
            if (status === 'OK' && results?.length) {
              const best = pickBestReverseResult(results);
              const label = formatReverseGeocodeLabel(best, lat, lng);
              done(label || best?.formatted_address || null);
            } else {
              done(null);
            }
          });
        } catch {
          done(null);
        }
      });
      if (jsRev) {
        const cleaned = sanitizeDeliveryLabel(jsRev, lat, lng);
        reverseCache.set(cacheKey, { data: cleaned, timestamp: Date.now() });
        logLocation('reverse:google→clean', { jsRev, cleaned });
        return cleaned;
      }
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const abortTimer = controller ? setTimeout(() => controller.abort(), 5000) : null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: { 'User-Agent': 'Go7DeliveryApp/1.0' },
          signal: controller?.signal,
        }
      );
      const data = await res.json();
      const addr = data.address || {};
      // Prefer suburb/neighbourhood/city over village (village is often "Ode Da")
      const area =
        addr.neighbourhood ||
        addr.suburb ||
        addr.city_district ||
        addr.quarter ||
        (addr.village && !isOdedaLgaToken(addr.village) ? addr.village : null) ||
        (addr.hamlet && !isOdedaLgaToken(addr.hamlet) ? addr.hamlet : null);
      const osmParts = [
        addr.road || addr.pedestrian || addr.residential,
        area,
        addr.city || addr.town || addr.municipality || 'Abeokuta',
      ].filter(Boolean);
      let label = osmParts.join(', ') || data.display_name || 'Unknown address';
      logLocation('reverse:osm', { raw: label, village: addr.village, suburb: addr.suburb });
      label = sanitizeDeliveryLabel(label, lat, lng);
      reverseCache.set(cacheKey, { data: label, timestamp: Date.now() });
      return label;
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
    }
  } catch (error) {
    console.error('[Go7Location] reverse error', error);
    return sanitizeDeliveryLabel(null, lat, lng);
  }
}

export function isCoarseDeliveryLabel(text) {
  // Area/landmark-only labels (Obantoko, Panseke, …) are not valid delivery addresses alone
  return isCoarseOgunLgaLabel(text) || isAreaOnlyLabel(text);
}

const GO7_LOCAL_ZONES = {
  Kuto: { lat: 7.1315, lng: 3.3622, radius: 1000 },
  Panseke: { lat: 7.1516, lng: 3.3467, radius: 800 },
  Camp: { lat: 7.16, lng: 3.345, radius: 1200 },
  Lafenwa: { lat: 7.1588, lng: 3.3784, radius: 900 },
  Ibara: { lat: 7.14, lng: 3.35, radius: 1500 },
  Olomore: { lat: 7.135, lng: 3.37, radius: 1000 },
  FUNAAB: { lat: 7.2194, lng: 3.4395, radius: 2000 },
};

export function detectLocalZone(lat, lng) {
  for (const [zoneName, zone] of Object.entries(GO7_LOCAL_ZONES)) {
    const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
    if (distance <= zone.radius) {
      return `${zoneName} Zone`;
    }
  }
  return null;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function clearSuggestionCache() {
  suggestionCache.clear();
  detailsCache.clear();
  geocodeCache.clear();
  reverseCache.clear();
}

export function getMapsUsageStats() {
  return {
    session: { ...sessionUsage },
    sessionLimits: { ...SESSION_LIMITS },
    daily: loadDailyUsage(),
    dailyLimits: { ...DAILY_LIMITS },
  };
}

export { geocodeAddress };
export default fetchAddressSuggestions;

/**
 * 🛠️ Strict tool registry for the Book Delivery AI.
 *
 * Every tool maps to a REAL Go7 backend capability. The LLM never gets
 * Firestore/Admin SDK/payment credentials/rider DB access — it may only
 * *request* a tool; this registry validates and executes it server-side.
 *
 * ctx = { uid, session, log } — session ownership is already enforced by the
 * controller; tools additionally validate state ordering + inputs.
 */

const admin = require('../adminInit');
const locationResolver = require('../locationResolver');
const deliveryFeeService = require('../deliveryFeeService');
const bookDeliveryOrder = require('../bookDeliveryOrder');

const db = admin.firestore();
const BOOK_DELIVERY_ORDER_TYPE = 'GENERAL_DELIVERY';
const MAX_CANDIDATES = 3;

class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Location matching — same canonical data source as locationResolver
// (delivery_areas + landmarks). Reuses its normalization; never invents
// coordinates or placeIds. When canonical data has no match at all, a
// server-side Google Geocoding fallback fills the gap — bounded to the
// Abeokuta service region and still confirmed by the customer before use.
// ---------------------------------------------------------------------------
const normalize = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');

const ABEOKUTA_CENTER = { lat: 7.1475, lng: 3.3619 };
// Sanity bound for Google-resolved places — keeps the answer inside the real
// service region even if Google matches a far-away namesake (e.g. Saanu, Oyo).
const GOOGLE_MAX_KM_FROM_CENTER = 30;

function kmFromCenter(lat, lng) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat - ABEOKUTA_CENTER.lat);
  const dLng = toRad(lng - ABEOKUTA_CENTER.lng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(ABEOKUTA_CENTER.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Google Geocoding fallback — uses the existing server-side Maps key. Returns
 * [] when the key lacks Geocoding access (REQUEST_DENIED), on any error, or
 * when results fall outside the service region — callers then degrade to the
 * popular-area suggestion path exactly as before.
 */
async function googleGeocodeCandidates(query) {
  const key = process.env.GOOGLE_GEOCODING_SERVER_KEY || process.env.GOOGLE_DISTANCE_MATRIX_SERVER_KEY;
  if (!key) return [];
  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json'
      + `?address=${encodeURIComponent(`${query}, Abeokuta, Ogun State, Nigeria`)}`
      + '&region=ng&bounds=6.95,3.10|7.40,3.60'
      + `&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await res.json().catch(() => null);
    if (!body || body.status !== 'OK' || !Array.isArray(body.results)) {
      if (body && body.status !== 'ZERO_RESULTS') {
        console.warn('[toolRegistry] google geocode', body.status, (body.error_message || '').slice(0, 120));
      }
      return [];
    }
    // Coarse guesses are worse than none: "saanu" fuzzy-matching the city
    // would silently pin Abeokuta centre — wrong fee, wrong rider target.
    const COARSE_TYPES = new Set([
      'locality', 'political', 'country',
      'administrative_area_level_1', 'administrative_area_level_2',
      'administrative_area_level_3', 'administrative_area_level_4', 'postal_code',
    ]);
    return body.results
      .filter((r) => r.geometry?.location_type !== 'APPROXIMATE')
      .filter((r) => (r.types || []).some((t) => !COARSE_TYPES.has(t)))
      .map((r) => ({
        id: null,
        name: String(r.formatted_address || '').replace(/,\s*Nigeria$/i, ''),
        lat: Number(r.geometry?.location?.lat),
        lng: Number(r.geometry?.location?.lng),
        type: 'place',
        source: 'google',
      }))
      .filter((c) => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lng))
      .filter((c) => kmFromCenter(c.lat, c.lng) <= GOOGLE_MAX_KM_FROM_CENTER)
      .slice(0, MAX_CANDIDATES);
  } catch (err) {
    console.warn('[toolRegistry] google geocode failed:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Google Places Autocomplete — server port of the manual page's proven
// pipeline (src/utils/fetchAddressSuggestions.js): country-restricted,
// Abeokuta-biased predictions, coarse-LGA filtering, dedup, and geometry
// resolved via Place Details ONLY at confirm time (saves quota and keeps the
// pin server-side until the customer picks a real place).
// ---------------------------------------------------------------------------
const COARSE_OGUN_LGA_KEYS = new Set([
  'odeda', 'obafemiowode', 'ewekoro', 'ifo', 'adoodoota',
]);
const ABEOKUTA_KEYWORDS = [
  'abeokuta', 'ogun state', 'funaab', 'ibara', 'olomore', 'omida',
  'isale igbein', 'ijaiye', 'lafenwa', 'ita eko', 'panseke', 'kuto',
  'sapon', 'quarry', 'sokori', 'obantoko', 'adatan', 'oke ilewo',
  'alabata', 'saan', 'adigbe', 'osiele',
];

function normalizePlaceKey(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isCoarseLgaHead(head) {
  const key = normalizePlaceKey(head);
  if (!key) return false;
  return COARSE_OGUN_LGA_KEYS.has(key)
    || key.startsWith('odedalga') || key.startsWith('odedalocalgovernment');
}

function googleKey() {
  return process.env.GOOGLE_GEOCODING_SERVER_KEY || process.env.GOOGLE_DISTANCE_MATRIX_SERVER_KEY;
}

/**
 * Autocomplete predictions for a query — same request shape as the manual
 * page (country:ng, Abeokuta centre bias, 45km radius). Coordinates are NOT
 * fetched here; candidates carry a placeId that confirm resolves.
 */
async function googleAutocompleteCandidates(query) {
  const key = googleKey();
  if (!key) return [];
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json'
      + `?input=${encodeURIComponent(query)}&components=country:ng`
      + `&location=${ABEOKUTA_CENTER.lat},${ABEOKUTA_CENTER.lng}&radius=45000`
      + `&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await res.json().catch(() => null);
    if (!body || body.status !== 'OK' || !Array.isArray(body.predictions)) return [];

    const seen = new Set();
    return body.predictions
      .filter((p) => {
        const desc = String(p.description || '');
        const head = desc.split(',')[0]?.trim() || '';
        // Same guards as the manual pipeline: drop coarse LGA-only hits
        // (bare "Odeda" pins the wrong place) and require an Abeokuta/Ogun
        // signal so a far-away namesake can't slip through.
        if (isCoarseLgaHead(head) && !/abeokuta|street|road|rd\b|avenue|close|estate/i.test(desc)) {
          return false;
        }
        return /abeokuta|ogun/i.test(desc)
          || ABEOKUTA_KEYWORDS.some((k) => desc.toLowerCase().includes(k));
      })
      .map((p) => {
        const main = p.structured_formatting?.main_text || '';
        const secondary = (p.structured_formatting?.secondary_text || '')
          .replace(/,\s*Nigeria$/i, '');
        return {
          id: null,
          name: secondary ? `${main} — ${secondary}` : (main || p.description),
          placeId: p.place_id,
          lat: null,
          lng: null,
          type: 'place',
          source: 'google',
        };
      })
      .filter((c) => {
        if (!c.name || !c.placeId) return false;
        const dedupKey = c.name.toLowerCase().replace(/[,.-]/g, '').substring(0, 50);
        if (seen.has(dedupKey)) return false;
        seen.add(dedupKey);
        return true;
      })
      .slice(0, MAX_CANDIDATES);
  } catch (err) {
    console.warn('[toolRegistry] google autocomplete failed:', err.message);
    return [];
  }
}

/**
 * Place Details → geometry. Called once, at confirm time — mirrors
 * getCoordinatesFromSuggestion in the manual pipeline. Returns null on any
 * failure or when the pin lands outside the service region.
 */
async function googlePlaceGeometry(placeId) {
  const key = googleKey();
  if (!key || !placeId) return null;
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json'
      + `?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,name`
      + `&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await res.json().catch(() => null);
    const loc = body?.result?.geometry?.location;
    if (body?.status !== 'OK' || !loc) return null;
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (kmFromCenter(lat, lng) > GOOGLE_MAX_KM_FROM_CENTER) return null;
    return { lat, lng };
  } catch (err) {
    console.warn('[toolRegistry] google place details failed:', err.message);
    return null;
  }
}

function scoreEntry(key, q) {
  if (!key || !q) return 0;
  if (key === q) return 100;
  if (key.startsWith(q) || q.startsWith(key)) return 80;
  if (key.includes(q) || q.includes(key)) return 60;

  // Word-level match: lets "kuto market", "the lafenwa junction",
  // "near oke ilewo" still resolve to their canonical place.
  const STOP = new Set(['the', 'a', 'an', 'at', 'in', 'on', 'near', 'area', 'my']);
  const qt = q.split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  const kt = key.split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  if (!qt.length || !kt.length) return 0;

  let hits = 0;
  for (const w of qt) {
    const head = w.slice(0, 4);
    if (kt.some((k) => k === w || k.startsWith(w) || w.startsWith(k) || (head.length >= 4 && k.startsWith(head)))) {
      hits += 1;
    }
  }
  // Require most query words to hit — "sapon market" must match both,
  // not just the generic word.
  const need = qt.length === 1 ? 1 : Math.ceil(qt.length * 0.66);
  if (hits >= need) return 40 + hits * 5;
  return 0;
}

async function findLocationCandidates(query) {
  const q = normalize(query);
  if (!q || q.length < 2) return [];
  const data = await locationResolver.loadLocations();
  const seen = new Set();
  const scored = [];
  const consider = (name, aliases, base) => {
    const keys = [name, ...(aliases || [])];
    let best = 0;
    for (const k of keys) best = Math.max(best, scoreEntry(normalize(k), q));
    if (best > 0 && !seen.has(base.id)) {
      seen.add(base.id);
      scored.push({ ...base, score: best, _keys: keys.map(normalize) });
    }
  };
  for (const a of data.areas || []) {
    consider(a.name, a.aliases, {
      id: a.id, name: a.name, lat: a.lat, lng: a.lng,
      type: a.type || 'area', source: 'area',
    });
  }
  for (const l of data.landmarks || []) {
    consider(l.name, l.aliases, {
      id: l.id, name: l.name, lat: l.lat, lng: l.lng,
      type: l.type || 'landmark', source: 'landmark',
    });
  }
  scored.sort((a, b) => b.score - a.score);
  const canon = scored.slice(0, MAX_CANDIDATES).map(({ score, ...c }) => c);
  if (canon.length) return canon;
  // Total canonical miss → same order as the manual page: Places
  // Autocomplete predictions first, Geocoding only when autocomplete is
  // empty (street/address queries it can't predict).
  const preds = await googleAutocompleteCandidates(query);
  if (preds.length) return preds;
  return googleGeocodeCandidates(query);
}

function publicLocation(c) {
  const out = { name: c.name, lat: c.lat, lng: c.lng, type: c.type, source: c.source, id: c.id };
  // Real Google placeIds pass through — needed so confirm can resolve
  // geometry via Place Details. Never fabricated for canonical entries.
  if (c.placeId) out.placeId = c.placeId;
  return out;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
const TOOLS = {
  /**
   * resolveDeliveryLocation({ query }) — canonical Go7 resolver only.
   */
  async resolveDeliveryLocation(ctx, input) {
    const query = String(input?.query || '').trim().slice(0, 120);
    if (!query) throw new ToolError('invalid-argument', 'A location query is required');

    const candidates = await findLocationCandidates(query);
    ctx.log('resolveDeliveryLocation', { query }, `candidates=${candidates.length}`);
    if (candidates.length === 0) return { status: 'not_found', query, candidates: [] };
    if (candidates.length === 1) return { status: 'resolved', query, candidates: [publicLocation(candidates[0])] };
    // An exact top hit outranks partial matches — still a single resolution.
    if ((candidates[0]._keys || []).includes(normalize(query))) {
      return { status: 'resolved', query, candidates: [publicLocation(candidates[0])] };
    }
    return { status: 'ambiguous', query, candidates: candidates.map(publicLocation) };
  },

  /**
   * confirmDeliveryLocation({ role, index }) — picks from server-stored
   * candidates only. The client/LLM can never inject coordinates directly.
   */
  async confirmDeliveryLocation(ctx, input) {
    const role = input?.role;
    if (!['pickup', 'dropoff'].includes(role)) {
      throw new ToolError('invalid-argument', 'role must be pickup or dropoff');
    }
    const slot = ctx.session[role];
    const candidates = slot?.candidates || [];
    if (!candidates.length) {
      throw new ToolError('failed-precondition', `No ${role} candidates to confirm — resolve first`);
    }
    const index = input?.index == null ? 0 : Number(input.index);
    const chosen = candidates[index];
    if (!chosen) throw new ToolError('invalid-argument', `Invalid candidate index ${index}`);

    // Google candidates carry a placeId instead of coordinates — resolve
    // geometry now, like getCoordinatesFromSuggestion in the manual flow.
    if (chosen.placeId && !Number.isFinite(chosen.lat)) {
      const geo = await googlePlaceGeometry(chosen.placeId);
      if (!geo) {
        throw new ToolError(
          'failed-precondition',
          `Couldn't pin "${chosen.name}" inside the service area — pick another location`
        );
      }
      chosen.lat = geo.lat;
      chosen.lng = geo.lng;
    }
    if (!Number.isFinite(chosen.lat) || !Number.isFinite(chosen.lng)) {
      throw new ToolError('failed-precondition', 'That location has no usable pin — pick another');
    }

    slot.canonicalLocation = publicLocation(chosen);
    slot.confirmed = true;
    slot.candidates = [];
    ctx.log('confirmDeliveryLocation', { role, index }, `confirmed=${chosen.name}`);
    return { confirmed: true, role, location: slot.canonicalLocation };
  },

  /**
   * getDeliveryQuote() — existing authoritative pricing engine. Server
   * recomputes distance/zone/fee; nothing monetary comes from the LLM.
   */
  async getDeliveryQuote(ctx) {
    const s = ctx.session;
    if (!s.pickup.confirmed || !s.dropoff.confirmed) {
      throw new ToolError('failed-precondition', 'Both locations must be confirmed before quoting');
    }
    const quote = await deliveryFeeService.computeDeliveryFee(
      {
        orderType: BOOK_DELIVERY_ORDER_TYPE,
        pickup: { lat: s.pickup.canonicalLocation.lat, lng: s.pickup.canonicalLocation.lng },
        destination: { lat: s.dropoff.canonicalLocation.lat, lng: s.dropoff.canonicalLocation.lng },
        // Canonical resolved keys help corridor endpoint matching (coordinate
        // proximity is still the authoritative check server-side).
        pickupLocationKey: s.pickup.canonicalLocation.key || s.pickup.canonicalLocation.id || null,
        dropoffLocationKey: s.dropoff.canonicalLocation.key || s.dropoff.canonicalLocation.id || null,
        clientOrderType: BOOK_DELIVERY_ORDER_TYPE,
      },
      { db }
    );
    const rates = await loadRates();
    const pricing = bookDeliveryOrder.buildServerOrderPricing(quote.deliveryFee, rates, quote);
    const stored = {
      deliveryFee: pricing.deliveryFee,
      platformFee: pricing.platformFee,
      grandTotal: pricing.grandTotal,
      totalKobo: pricing.grandTotal * 100,
      distanceKm: quote.distanceKm,
      zoneId: quote.zoneId || null,
      zoneName: quote.zoneName || null,
      corridorId: quote.corridorId || null,
      corridorName: quote.corridorName || null,
      pricingSource: quote.pricingSource || null,
      vehicleType: quote.vehicleType || null,
      preferredVehicleType: quote.preferredVehicleType || null,
      eligibleVehicles: quote.eligibleVehicles || [],
      vehicleSelectionReason: quote.vehicleSelectionReason || null,
      riderShareRate: quote.riderShareRate || null,
      platformShareRate: quote.platformShareRate || null,
      riderShareRule: quote.riderShareRule || null,
      riderPayout: pricing.riderPayout,
      go7DeliveryShare: pricing.go7DeliveryShare,
      pricingConfigVersion: quote.pricingConfigVersion,
      quotedAt: new Date().toISOString(),
    };
    s.quote = stored;
    ctx.log('getDeliveryQuote', {}, `fee=${stored.deliveryFee} total=${stored.grandTotal} km=${stored.distanceKm}`);
    return stored;
  },

  /**
   * createDeliveryBooking({ paymentMethod }) — the existing authoritative
   * creation path (same code as the deployed createBookDeliveryOrder
   * callable). Produces a pending booking; payment is verified separately.
   */
  async createDeliveryBooking(ctx, input) {
    const s = ctx.session;
    if (s.bookingId) {
      // Replay guard — one booking per session.
      ctx.log('createDeliveryBooking', {}, 'replayed — returning existing booking');
      return { bookingId: s.bookingId, replayed: true };
    }
    if (!s.quote) throw new ToolError('failed-precondition', 'Quote required before booking');
    if (!s.package.description) throw new ToolError('failed-precondition', 'Package description required');
    if (!s.recipient.name && !s.recipient.phone) throw new ToolError('failed-precondition', 'Recipient required');

    const method = String(input?.paymentMethod || '').toLowerCase();
    if (!['paystack', 'wallet', 'pod'].includes(method)) {
      throw new ToolError('invalid-argument', `Unsupported payment method: ${method}`);
    }

    // Sender identity comes from the authenticated user's profile — never
    // from chat text the LLM relayed.
    const userSnap = await db.collection('users').doc(ctx.uid).get();
    const u = userSnap.exists ? userSnap.data() : {};
    const senderName = u.displayName || u.name || u.fullName || 'Customer';
    const senderPhone = u.phoneNumber || u.phone || '';

    const result = await bookDeliveryOrder.createForUser(ctx.uid, {
      pickup: {
        address: s.pickup.canonicalLocation.name,
        lat: s.pickup.canonicalLocation.lat,
        lng: s.pickup.canonicalLocation.lng,
      },
      dropoff: {
        address: s.dropoff.canonicalLocation.name,
        lat: s.dropoff.canonicalLocation.lat,
        lng: s.dropoff.canonicalLocation.lng,
      },
      pickupLocationSource: `ai:${s.pickup.canonicalLocation.source}`,
      dropoffLocationSource: `ai:${s.dropoff.canonicalLocation.source}`,
      sender: { name: senderName, phone: senderPhone, email: u.email || '' },
      recipient: { name: s.recipient.name || '', phone: s.recipient.phone || '', email: '' },
      itemDescription: s.package.description,
      packageDetails: { name: s.package.description, size: 'medium', type: 'parcel' },
      deliveryMode: 'standard',
      specialNotes: s.instructions || '',
      paymentMethod: method,
      clientFee: s.quote.deliveryFee,
      clientDistanceKm: s.quote.distanceKm,
      clientZoneId: s.quote.zoneId,
      clientCorridorId: s.quote.corridorId,
    });

    s.bookingId = result.bookingId;
    s.vehicleType = result.vehicleType || null;
    s.preferredVehicleType = result.preferredVehicleType || null;
    s.eligibleVehicles = result.eligibleVehicles || [];
    s.riderShareRate = result.riderShareRate || null;
    s.riderShareRule = result.riderShareRule || null;
    s.paymentMethod = method;
    s.quote.grandTotal = result.grandTotal;
    s.quote.totalKobo = result.totalKobo;
    ctx.log('createDeliveryBooking', { method }, `booking=${result.bookingId}`);
    return result;
  },

  /**
   * getPaymentOptions() — real capabilities: wallet balance, POD eligibility.
   */
  async getPaymentOptions(ctx) {
    const [walletSnap, userSnap, vendorSnap] = await Promise.all([
      db.collection('wallets').doc(ctx.uid).get(),
      db.collection('users').doc(ctx.uid).get(),
      db.collection('vendors').doc(ctx.uid).get(),
    ]);
    const walletBalance = Math.max(
      Number(walletSnap.data()?.balance) || 0,
      Number(userSnap.data()?.walletBalance) || 0
    );
    const isVendor = userSnap.data()?.role === 'vendor' || vendorSnap.exists;
    const total = ctx.session.quote?.grandTotal || 0;
    const options = [
      { method: 'paystack', label: 'Pay with Card / Transfer', available: true },
      {
        method: 'wallet',
        label: `Go7 Wallet (₦${walletBalance.toLocaleString('en-NG')})`,
        available: walletBalance >= total && total > 0,
        balance: walletBalance,
      },
    ];
    if (isVendor) options.push({ method: 'pod', label: 'Pay on Delivery', available: true });
    ctx.log('getPaymentOptions', {}, `options=${options.map((o) => o.method).join(',')}`);
    return { options, totalKobo: (ctx.session.quote?.grandTotal || 0) * 100, bookingId: ctx.session.bookingId };
  },

  /**
   * getDeliveryStatus() — reads the canonical bookings doc server-side.
   */
  async getDeliveryStatus(ctx) {
    const bookingId = ctx.session.bookingId;
    if (!bookingId) throw new ToolError('failed-precondition', 'No booking in this session');
    const snap = await db.collection('bookings').doc(bookingId).get();
    if (!snap.exists) return { bookingId, status: 'pending_payment', paymentStatus: ctx.session.paymentStatus };
    const b = snap.data();
    // Ownership: session is uid-bound, and booking was created by this uid.
    const status = {
      bookingId,
      status: b.status,
      paymentStatus: b.paymentStatus,
      riderAssigned: Boolean(b.riderId),
      riderName: b.riderName || b.assignedRider?.name || null,
      riderPhone: b.riderPhone || null,
      riderVehicle: b.riderVehicle || null,
    };
    ctx.log('getDeliveryStatus', {}, `status=${status.status} rider=${status.riderAssigned}`);
    return status;
  },

  /**
   * getTrackingLink() — the existing Go7 tracking experience only.
   */
  async getTrackingLink(ctx) {
    const bookingId = ctx.session.bookingId;
    if (!bookingId) throw new ToolError('failed-precondition', 'No booking in this session');
    ctx.log('getTrackingLink', {}, `orderId=${bookingId}`);
    return {
      action: 'OPEN_TRACKING',
      orderId: bookingId,
      trackingUrl: `/track-order/${bookingId}`,
    };
  },
};

// Only the registry above can run — anything else is a hard reject.
async function runTool(ctx, name, input) {
  const tool = TOOLS[name];
  if (!tool) throw new ToolError('invalid-argument', `Unknown tool: ${name}`);
  return tool(ctx, input || {});
}

async function loadRates() {
  try {
    const snap = await db.collection('pricingSettings').doc('current').get();
    const s = snap.exists ? snap.data() || {} : {};
    return {
      platformFeeRateParcel: Number.isFinite(Number(s.platformFeeRateParcel)) ? Number(s.platformFeeRateParcel) : 0.1,
      riderDeliveryShare: Number.isFinite(Number(s.defaultRiderDeliveryShare)) ? Number(s.defaultRiderDeliveryShare) : 0.5,
    };
  } catch (_) {
    return { platformFeeRateParcel: 0.1, riderDeliveryShare: 0.5 };
  }
}

module.exports = { TOOLS, runTool, ToolError };

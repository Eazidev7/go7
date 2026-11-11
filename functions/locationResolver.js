/**
 * 🗺️ GO7 LOCATION RESOLVER — shared across the WhatsApp bot and the app.
 *
 * Resolves a free-text location ("drop me at the Ake Palace gate", "Panseke",
 * "Federal Medical Centre") to a { lat, lng, name, type } using:
 *   - `delivery_areas`  (neighbourhoods, from the Abeokuta areas catalog)
 *   - `landmarks`       (specific places people actually name)
 *   - `_extra` names    (village/area names that snap to Abeokuta centre)
 *
 * Data lives in Firestore so it can be curated/grown over time (seeded by
 * functions/seedLocations.js). Both the bot (server-side) and the app
 * (via the `resolveLocation` callable) use this one source of truth.
 */

const functions = require('firebase-functions/v1');
const admin = require('./adminInit');

const firestore = admin.firestore();

// Abeokuta centre — fallback for unmatched "extra" village names
const ABEOKUTA_CENTER = { lat: 7.1475, lng: 3.3619 };

// ---------------------------------------------------------------------------
// Normalisation + matching
// ---------------------------------------------------------------------------
const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

// Conversational noise + Nigerian/Pidgin phrasing that poisons the match.
// LLM output varies turn-to-turn ("obantoko" vs "i dey Obantoko junction") —
// strip it deterministically so the same intent always produces the same query.
const NOISE = /\b(i dey|dey|i wan|wan|i want to|i wanna|please|pls|help me|can you|could you|kindly|send|deliver|pick ?up|drop ?off|drop|take me to|carry me go|go to|going to|come pick|come and pick|from|at|in|inside|near|around|behind|front of|beside|opposite|junction|bustop|bus stop|my|me|for|to|the|a|an|and|address|location|area|is|it|this|that)\b/gi;

function normalizeQuery(text) {
  const stripped = String(text || '')
    .replace(NOISE, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // If stripping emptied the query, fall back to the raw normalized text —
  // e.g. "junction" alone is noise but should not produce an empty search.
  return stripped.length >= 2 ? stripped : normalize(text);
}

/**
 * Deterministic canonical resolver — one entry point for every channel
 * (chat assistant, WhatsApp bot, app callable). Normalizes and de-noises the
 * input BEFORE matching so extraction variance can never change the result.
 *
 * Returns { status: 'resolved'|'ambiguous'|'not_found', query, candidates }
 */
async function resolveGo7Location(locationText, context = {}) {
  const raw = String(locationText || '').trim();
  if (!raw) return { status: 'not_found', query: '', candidates: [] };

  const query = normalizeQuery(raw);
  const data = await loadLocations();
  const index = buildIndex(data.areas, data.landmarks);

  // Score every directory entry — deterministic ranked candidates.
  const scored = index
    .map((entry) => ({ ...entry, score: scoreLocation(normalize(entry.key), query) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);

  // Collapse duplicate ids (alias hits on the same doc).
  const seen = new Set();
  const candidates = [];
  for (const c of scored) {
    const id = c.id || c.key;
    if (seen.has(id)) continue;
    seen.add(id);
    candidates.push(c);
    if (candidates.length >= 5) break;
  }

  if (!candidates.length) {
    const hit = await resolveLocationText(query);
    if (hit) return { status: 'resolved', query, candidates: [hit] };
    return { status: 'not_found', query, candidates: [] };
  }
  if (candidates.length === 1 || candidates[0].score > candidates[1].score * 1.5) {
    return { status: 'resolved', query, candidates: [candidates[0]] };
  }
  return { status: 'ambiguous', query, candidates };
}

// 0 = no match · 1 = word-match · 2 = prefix · 3 = exact
// Word-boundary aware — "aro" must NOT match "kilimanjaro" (partial-word
// substring hits produced false resolutions like Kilimanjaro → Aro Hospital).
function scoreLocation(key, q) {
  if (!key || !q) return 0;
  if (key === q) return 3;
  if (key.startsWith(q) || q.startsWith(key)) return 2;
  const keyWords = key.split(' ');
  const qWords = q.split(' ');
  if (qWords.every((w) => keyWords.includes(w)) || keyWords.every((w) => qWords.includes(w))) return 1;
  return 0;
}

function buildIndex(areas, landmarks) {
  const index = [];
  const push = (key, entry) => {
    if (key) index.push({ key: normalize(key), ...entry });
  };
  for (const a of areas || []) {
    const base = { name: a.name, lat: a.lat, lng: a.lng, type: a.type || 'area', source: 'area', id: a.id };
    push(a.name, base);
    for (const alias of a.aliases || []) push(alias, base);
  }
  for (const l of landmarks || []) {
    const base = { name: l.name, lat: l.lat, lng: l.lng, type: l.type || 'landmark', source: 'landmark', id: l.id };
    push(l.name, base);
    for (const alias of l.aliases || []) push(alias, base);
  }
  return index;
}

function match(query, index) {
  const q = normalize(query);
  if (!q) return null;

  // 1. Exact
  const exact = index.find((i) => i.key === q);
  if (exact) return { ...exact, matched: q };

  // 2. Prefix (either direction)
  const prefix = index.find((i) => i.key.startsWith(q) || q.startsWith(i.key));
  if (prefix) return { ...prefix, matched: q };

  // 3. Word-match — whole-word containment only; "aro" must not match
  // "kilimanjaro" (partial-word substring hits caused false resolutions).
  const qWords = q.split(' ');
  const word = index.find((i) => {
    const kWords = i.key.split(' ');
    return qWords.every((w) => kWords.includes(w)) || kWords.every((w) => qWords.includes(w));
  });
  if (word) return { ...word, matched: q };

  return null;
}

// ---------------------------------------------------------------------------
// Firestore-backed loading (with a short per-instance cache)
// ---------------------------------------------------------------------------
let cache = { areas: null, landmarks: null, extra: [], loadedAt: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;

async function loadLocations(force = false) {
  if (!force && cache.areas && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache;
  }
  const [areasSnap, landmarksSnap, extraSnap] = await Promise.all([
    firestore.collection('delivery_areas').get(),
    firestore.collection('landmarks').get(),
    firestore.collection('delivery_areas').doc('_extra').get(),
  ]);
  const areas = areasSnap.docs
    .filter((d) => d.id !== '_extra')
    .map((d) => ({ id: d.id, ...d.data() }));
  const landmarks = landmarksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const extra = extraSnap.exists ? extraSnap.data().names || [] : [];
  cache = { areas, landmarks, extra, loadedAt: Date.now() };
  return cache;
}

/**
 * Resolve a free-text location string to a { lat, lng, name, type }.
 * Returns null when nothing matches.
 */
async function resolveLocationText(query) {
  const q = normalize(query);
  if (!q) return null;

  const data = await loadLocations();
  const index = buildIndex(data.areas, data.landmarks);

  const hit = match(q, index);
  if (hit) return hit;

  // A name can be LISTED as known (delivery_areas/_extra) without having any
  // coordinates of its own.
  //
  // This used to silently resolve every such name to the Abeokuta CENTRE pin.
  // That produced a wrong-but-valid destination — finite, non-zero, inside the
  // service area — so validation passed while the distance, the fee and the
  // rider's navigation target were all wrong. Silent, and impossible to notice.
  //
  // Accuracy rule: never invent a location. If we don't know where a place is,
  // say so and let the customer share a pin or pick a nearby area.
  const extraNames = new Set((data.extra || []).map(normalize));
  if (extraNames.has(q)) {
    console.warn(
      `[locationResolver] "${q}" is listed in delivery_areas/_extra but has no ` +
        'coordinates — refusing to guess. Add real lat/lng, or remove the name. ' +
        'Run `node scripts/report-location-gaps.mjs` to see every name in this state.'
    );
    return null;
  }
  return null;
}

/**
 * List popular areas/landmarks for quick-select menus (WhatsApp quick replies).
 */
async function listPopularLocations(limit = 12) {
  const data = await loadLocations();
  const popular = [...(data.areas || []), ...(data.landmarks || [])]
    .filter((l) => l.popular || l.type === 'area')
    .slice(0, limit)
    .map((l) => ({ name: l.name, lat: l.lat, lng: l.lng, type: l.type || 'area' }));
  return popular;
}

// ---------------------------------------------------------------------------
// Cloud callable — usable by the app (httpsCallable) and for testing
// ---------------------------------------------------------------------------
exports.resolveLocation = functions.https.onCall(async (data) => {
  const query = data?.query || '';
  const resolved = await resolveGo7Location(query);
  return { success: true, query, result: resolved.candidates[0] || null, status: resolved.status, candidates: resolved.candidates };
});

// Expose for server-side use (WhatsApp bot)
module.exports.resolveLocationText = resolveLocationText;
module.exports.resolveGo7Location = resolveGo7Location;
module.exports.normalizeQuery = normalizeQuery;
module.exports.listPopularLocations = listPopularLocations;
module.exports.loadLocations = loadLocations;

#!/usr/bin/env node
/**
 * Go7 location-data gap report.
 *
 * Location accuracy lives in the DATA, not the code. This tool makes the gaps
 * visible so they can be fixed and so they cannot silently come back.
 *
 * It reports:
 *   1. Names in `delivery_areas/_extra` that have NO coordinates of their own.
 *      These are the dangerous ones — the resolver used to snap every one of
 *      them to the Abeokuta centre pin, producing a wrong-but-valid destination.
 *      It now refuses to guess, so orders to these names fail loudly instead.
 *   2. Configured delivery areas that sit further than the effective max
 *      delivery distance — listed as deliverable, but actually refused.
 *   3. Coordinates that are invalid, 0,0, or outside the service area.
 *   4. Pins shared by several entries (neighbourhood-level precision).
 *
 * Usage
 *   node scripts/report-location-gaps.mjs                     # report
 *   node scripts/report-location-gaps.mjs --template gaps.json  # write a fill-in template
 *   node scripts/report-location-gaps.mjs --check filled.json   # validate supplied coords
 *
 * Credentials: uses ./sa-go7app.json when present, else Application Default
 * Credentials (gcloud / firebase login).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PROJECT_ID = 'go7-app-209e4';
const CENTER = { lat: 7.1475, lng: 3.3619 };
const BOUNDS = { south: 6.72, north: 7.58, west: 2.92, east: 3.88 };
const MAX_RADIUS_KM = 48;
/** Mirrors functions/pricingConfig.js DEFAULT_MAX_DISTANCE_KM. */
const DEFAULT_MAX_DISTANCE_KM = 20;

function credential() {
  const saPath = path.join(root, 'sa-go7app.json');
  if (fs.existsSync(saPath)) return cert(JSON.parse(fs.readFileSync(saPath, 'utf8')));
  return applicationDefault();
}

initializeApp({ credential: credential(), projectId: PROJECT_ID });
const db = getFirestore();

function haversine(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toCoord(raw) {
  const lat = Number(raw?.lat ?? raw?.latitude ?? raw?.location?.lat);
  const lng = Number(raw?.lng ?? raw?.longitude ?? raw?.location?.lng);
  return { lat, lng, finite: Number.isFinite(lat) && Number.isFinite(lng) };
}

function inBounds({ lat, lng }) {
  return lat >= BOUNDS.south && lat <= BOUNDS.north && lng >= BOUNDS.west && lng <= BOUNDS.east;
}

/** Validate a supplied coordinate. Returns array of problems (empty = good). */
function problems(lat, lng) {
  const out = [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ['not finite numbers'];
  if (lat === 0 && lng === 0) return ['0,0 placeholder'];
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) out.push('out of valid lat/lng range');
  if (!inBounds({ lat, lng })) out.push('outside Abeokuta service bounds');
  const km = haversine(CENTER, { lat, lng });
  if (km > MAX_RADIUS_KM) out.push(`${km.toFixed(1)} km from centre (beyond ${MAX_RADIUS_KM} km)`);
  return out;
}

async function loadData() {
  const areasSnap = await db.collection('delivery_areas').get();
  const areas = [];
  let extraNames = [];
  areasSnap.docs.forEach((doc) => {
    const d = doc.data() || {};
    if (doc.id === '_extra') {
      extraNames = (d.names || []).map((n) => String(n));
      return;
    }
    areas.push({ id: doc.id, name: d.name || doc.id, ...toCoord(d) });
  });

  const lmSnap = await db.collection('landmarks').get();
  const landmarks = lmSnap.docs.map((doc) => {
    const d = doc.data() || {};
    return { id: doc.id, name: d.name || doc.id, ...toCoord(d) };
  });

  return { areas, landmarks, extraNames };
}

async function report() {
  const { areas, landmarks, extraNames } = await loadData();
  const all = [...areas.map((a) => ({ ...a, kind: 'area' })), ...landmarks.map((l) => ({ ...l, kind: 'landmark' }))];

  console.log('\n============================================================');
  console.log(' GO7 LOCATION DATA GAP REPORT');
  console.log('============================================================');
  console.log(`delivery_areas (with coords) : ${areas.length}`);
  console.log(`landmarks                    : ${landmarks.length}`);
  console.log(`names with NO coordinates    : ${extraNames.length}`);
  console.log(`effective max road distance  : ${DEFAULT_MAX_DISTANCE_KM} km`);

  console.log('\n---- 1. NAMES WITH NO COORDINATES (orders to these now fail loudly) ----');
  if (!extraNames.length) {
    console.log('  none — every resolvable name has real coordinates.');
  } else {
    console.log('  These names resolve to NOTHING until real lat/lng is added.');
    console.log(`  ${extraNames.length} names:`);
    extraNames.slice(0, 40).forEach((n) => console.log(`     - ${n}`));
    if (extraNames.length > 40) console.log(`     … and ${extraNames.length - 40} more`);
    console.log('\n  Fix: add coordinates, or remove the name. Generate a template with:');
    console.log('     node scripts/report-location-gaps.mjs --template gaps.json');
  }

  console.log('\n---- 2. AREAS BEYOND THE EFFECTIVE MAX DISTANCE (listed but refused) ----');
  const tooFar = all
    .filter((l) => l.finite)
    .map((l) => ({ ...l, km: haversine(CENTER, l) }))
    .filter((l) => l.km > DEFAULT_MAX_DISTANCE_KM)
    .sort((a, b) => b.km - a.km);
  if (!tooFar.length) {
    console.log('  none — every configured location is within range.');
  } else {
    tooFar.forEach((l) =>
      console.log(`     ${l.kind} "${l.name}" — ${l.km.toFixed(1)} km (needs >${l.km.toFixed(0)} km)`)
    );
    console.log('\n  Either raise deliveryPricing.maxDistanceKm, or drop the location.');
  }

  console.log('\n---- 3. INVALID COORDINATES ----');
  const invalid = all.filter((l) => l.finite && problems(l.lat, l.lng).length);
  const nonFinite = all.filter((l) => !l.finite);
  if (!invalid.length && !nonFinite.length) {
    console.log('  none — every stored coordinate is valid and inside the service area.');
  } else {
    nonFinite.forEach((l) => console.log(`     ${l.kind} "${l.name}" — not finite`));
    invalid.forEach((l) => console.log(`     ${l.kind} "${l.name}" — ${problems(l.lat, l.lng).join(', ')}`));
  }

  console.log('\n---- 4. PINS SHARED BY SEVERAL ENTRIES ----');
  const byCoord = new Map();
  all.filter((l) => l.finite).forEach((l) => {
    const key = `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`;
    if (!byCoord.has(key)) byCoord.set(key, []);
    byCoord.get(key).push(l.name);
  });
  const shared = [...byCoord.entries()].filter(([, names]) => names.length > 1);
  console.log(`  ${shared.length} pins shared. Neighbourhood-level precision is fine for city`);
  console.log('  delivery, but these are not street-accurate:');
  shared
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([key, names]) => console.log(`     ${key} -> ${names.join(', ')}`));

  console.log('\n============================================================\n');
}

async function writeTemplate(outPath) {
  const { extraNames } = await loadData();
  const template = {};
  extraNames.forEach((n) => {
    template[n] = { lat: null, lng: null, note: '' };
  });
  fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
  console.log(`Wrote ${extraNames.length} names to ${outPath}`);
  console.log('Fill in lat/lng for each, then validate with:');
  console.log(`  node scripts/report-location-gaps.mjs --check ${outPath}`);
}

async function checkFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const ok = [];
  const stillMissing = [];
  const bad = [];

  for (const [name, val] of Object.entries(raw)) {
    const lat = Number(val?.lat);
    const lng = Number(val?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      stillMissing.push(name);
      continue;
    }
    const issues = problems(lat, lng);
    if (issues.length) bad.push({ name, lat, lng, issues });
    else ok.push({ name, lat, lng, km: haversine(CENTER, { lat, lng }) });
  }

  console.log(`\nusable      : ${ok.length}`);
  console.log(`still empty : ${stillMissing.length}`);
  console.log(`rejected    : ${bad.length}`);
  if (bad.length) {
    console.log('\nRejected (fix these before importing):');
    bad.slice(0, 30).forEach((b) => console.log(`  "${b.name}" ${b.lat},${b.lng} — ${b.issues.join(', ')}`));
  }
  if (ok.length) {
    console.log('\nUsable (furthest first — check the big ones are really Go7 locations):');
    ok.sort((a, b) => b.km - a.km).slice(0, 20).forEach((o) => console.log(`  "${o.name}" ${o.km.toFixed(1)} km from centre`));
  }
  console.log('');
}

const args = process.argv.slice(2);
try {
  if (args[0] === '--template') {
    await writeTemplate(args[1] || 'location-gaps.json');
  } else if (args[0] === '--check') {
    if (!args[1]) throw new Error('--check needs a file path');
    await checkFile(args[1]);
  } else {
    await report();
  }
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}

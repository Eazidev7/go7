/**
 * 🌱 GO7 LOCATION SEED SCRIPT
 *
 * Seeds Firestore with delivery areas (from the Abeokuta areas catalog) and
 * the starter landmarks (landmarkSeedData.js). Run from the repo ROOT so the
 * dynamic import of the ESM catalog resolves:
 *
 *   node functions/seedLocations.js
 *
 * Writes:
 *   - delivery_areas/{id}        → neighbourhoods (with aliases + coords)
 *   - delivery_areas/_extra      → extra village names (snap to Abeokuta centre)
 *   - landmarks/{id}             → specific places people name
 *
 * The location resolver (functions/locationResolver.js) reads these.
 */

const admin = require('./adminInit');
const landmarks = require('./landmarkSeedData');

const firestore = admin.firestore();

async function main() {
  // Dynamically import the ESM areas catalog (repo root has src/)
  const mod = await import('../src/data/abeokutaAreasCatalog.js');
  const areas = mod.ABEOKUTA_AREAS_CATALOG || [];
  const extraNames = mod.ABEOKUTA_EXTRA_AREA_NAMES || [];

  console.log(`Loaded ${areas.length} areas and ${landmarks.length} landmarks.`);

  // --- Areas ---
  let count = 0;
  for (const area of areas) {
    await firestore.collection('delivery_areas').doc(area.id).set(
      {
        name: area.name,
        aliases: area.aliases || [],
        lat: area.lat,
        lng: area.lng,
        zone: area.zone || 'south',
        type: 'area',
        approximate: false,
        popular: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    count++;
  }

  // --- Extra village names (single doc) ---
  await firestore.collection('delivery_areas').doc('_extra').set(
    {
      names: extraNames,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // --- Landmarks ---
  let landmarkCount = 0;
  for (const lm of landmarks) {
    await firestore.collection('landmarks').doc(lm.id).set(
      {
        name: lm.name,
        aliases: lm.aliases || [],
        lat: lm.lat,
        lng: lm.lng,
        type: lm.type || 'landmark',
        area: lm.area || '',
        approximate: true,
        popular: !!lm.popular,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    landmarkCount++;
  }

  console.log(`✅ Seeded ${count} areas, ${extraNames.length} extra names, ${landmarkCount} landmarks.`);
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });

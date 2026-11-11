/**
 * Placeholder delivery zones for Go7's Abeokota-area pilot.
 *
 * IMPORTANT (honesty): these polygons are APPROXIMATE placeholders derived
 * from the existing Abeokuta catalog coordinates (see src/data/abeokutaAreasCatalog.js).
 * They are NOT verified production boundaries. Each zone ships with
 * `boundsVerified: false` so the UI/system treats them as unverified until an
 * admin confirms the true boundary (via the admin zone editor / Firestore).
 */
export const DELIVERY_ZONES_SEED = [
  {
    id: 'funaab',
    name: 'FUNAAB',
    description: 'FUNAAB and immediate surrounding areas',
    enabled: true,
    priority: 1,
    baseFee: null, // no zone override — uses distance pricing
    boundsVerified: false,
    polygon: [
      [7.21, 3.43],
      [7.21, 3.45],
      [7.23, 3.45],
      [7.23, 3.43],
    ],
  },
  {
    id: 'camp',
    name: 'Camp / Abule Mecho',
    description: 'Camp, Abule Mecho and immediate surrounding areas',
    enabled: true,
    priority: 1,
    baseFee: null,
    boundsVerified: false,
    polygon: [
      [7.138, 3.35],
      [7.138, 3.37],
      [7.158, 3.37],
      [7.158, 3.35],
    ],
  },
  {
    id: 'alabata',
    name: 'Alabata',
    description: 'Alabata and immediate surrounding areas',
    enabled: true,
    priority: 1,
    baseFee: null,
    boundsVerified: false,
    polygon: [
      [7.195, 3.402],
      [7.195, 3.422],
      [7.215, 3.422],
      [7.215, 3.402],
    ],
  },
  {
    id: 'obantoko',
    name: 'Obantoko',
    description: 'Obantoko and immediate surrounding areas',
    enabled: true,
    priority: 1,
    baseFee: null,
    boundsVerified: false,
    polygon: [
      [7.155, 3.365],
      [7.155, 3.385],
      [7.175, 3.385],
      [7.175, 3.365],
    ],
  },
];

/**
 * Seed (or update) the deliveryZones collection. Intended for admin/ops use.
 * `db` is a Firestore instance that is authorized to write.
 */
export async function seedDeliveryZones(db) {
  const { setDoc, doc } = await import('firebase/firestore');
  const results = [];
  for (const z of DELIVERY_ZONES_SEED) {
    await setDoc(doc(db, 'deliveryZones', z.id), z, { merge: true });
    results.push(z.id);
  }
  return results;
}

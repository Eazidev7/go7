// One-time migration: move public delivery PIN fields into private
// deliverySecrets/{orderId} and delete them from customer/rider-readable docs.
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'go7-app-209e4' });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const PIN_FIELDS = ['deliveryPin', 'deliveryPIN', 'customerPIN', 'verificationCode', 'deliveryCode'];
const COLLECTIONS = ['bookings', 'deliveries', 'orders'];

(async () => {
  const seen = new Set();
  let migrated = 0, cleaned = 0, skipped = 0;

  for (const col of COLLECTIONS) {
    for (const field of PIN_FIELDS) {
      const snap = await db.collection(col).where(field, '!=', null).get().catch(() => null);
      if (!snap) continue;
      for (const doc of snap.docs) {
        const key = `${col}/${doc.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const data = doc.data();
        const pin = data.deliveryPin || data.deliveryPIN || data.customerPIN || data.verificationCode || data.deliveryCode;
        if (!pin) { skipped++; continue; }

        await db.collection('deliverySecrets').doc(doc.id).set({
          pin: String(pin),
          orderId: doc.id,
          migratedFrom: `${col}.${field}`,
          migratedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        migrated++;

        const del = { requiresDeliveryPin: true };
        for (const pf of PIN_FIELDS) if (data[pf] != null) del[pf] = FieldValue.delete();
        await doc.ref.update(del);
        cleaned++;
      }
    }
  }
  console.log({ migrated, cleaned, skipped });
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

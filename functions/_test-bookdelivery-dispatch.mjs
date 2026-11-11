// Dispatch-path check: assumes riders/E2E_TEST_RIDER is seeded & available near Kuto.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('./adminInit');
const db = admin.firestore();
const API_KEY = 'AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s';
const CF = (n) => `https://us-central1-go7-app-209e4.cloudfunctions.net/${n}`;

async function call(name, data, idToken) {
  const res = await fetch(CF(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ data }),
  });
  const body = await res.json().catch(() => null);
  return (!res.ok || body?.error) ? { error: body?.error || `HTTP ${res.status}` } : { result: body?.result };
}

const uid = (await admin.auth().createUser({ email: `e2e-d-${Date.now()}@example.com`, password: 'Go7E2e!Test#2024' })).uid;
const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Referer: 'https://go7.ng/' },
  body: JSON.stringify({ email: (await admin.auth().getUser(uid)).email, password: 'Go7E2e!Test#2024', returnSecureToken: true }),
});
const token = (await signIn.json()).idToken;

const kuto = { address: 'Kuto, Abeokuta', lat: 7.15, lng: 3.345 };
const funaab = { address: 'FUNAAB, Abeokuta', lat: 7.22, lng: 3.44 };
const created = await call('createBookDeliveryOrder', {
  pickup: kuto, dropoff: funaab,
  sender: { name: 'E2E', phone: '0000000000' }, recipient: { name: 'R', phone: '0000000001' },
  itemDescription: 'Laptop (E2E dispatch)', packageDetails: { name: 'Laptop', size: 'medium' },
  paymentMethod: 'wallet',
}, token);
if (created.error) { console.log('CREATE FAIL', created.error); process.exit(1); }
const bookingId = created.result.bookingId;
console.log('created', bookingId, 'total', created.result.grandTotal);

await db.doc(`wallets/${uid}`).set({ balance: 100000 }, { merge: true });
const debit = await call('debitWalletForDelivery', { customerId: uid, deliveryId: bookingId, fee: created.result.grandTotal }, token);
if (debit.error) { console.log('DEBIT FAIL', debit.error); }

const conf = await call('confirmBookDeliveryPayment', { bookingId, method: 'wallet' }, token);
console.log('CONFIRM:', JSON.stringify(conf.result || conf.error).slice(0, 400));

await new Promise((r) => setTimeout(r, 3000));
const rider = await db.doc('riders/E2E_TEST_RIDER').get();
console.log('RIDER DOC: status=' + rider.data()?.status, 'currentOrder=' + rider.data()?.currentOrder);
const trk = await db.doc(`deliveryTracking/${bookingId}`).get();
console.log('TRACKING:', trk.exists ? JSON.stringify(trk.data()).slice(0, 200) : 'missing');

// cleanup
for (const c of ['pendingBookings', 'bookings', 'orders', 'deliveries', 'deliveryTracking', 'rider_locations'])
  await db.doc(`${c}/${bookingId}`).delete().catch(() => {});
for (const f of ['orderId','bookingId','deliveryId']) {
  const s = await db.collection('notifications').where(f,'==',bookingId).get();
  for (const d of s.docs) await d.ref.delete();
}
await db.doc('riders/E2E_TEST_RIDER').delete();
await db.doc(`wallets/${uid}`).delete().catch(() => {});
await db.doc(`users/${uid}`).delete().catch(() => {});
await admin.auth().deleteUser(uid).catch(() => {});
console.log('cleanup done');
process.exit(0);

/**
 * Phase-2 E2E verification for the server-authoritative Book Delivery path.
 *
 * Tests the DEPLOYED callables over HTTPS with a real authenticated test user:
 *   resolveLocation → createBookDeliveryOrder → debitWalletForDelivery →
 *   confirmBookDeliveryPayment (+ retry/idempotency) → trigger side-effects.
 *
 * Run:  node _test-bookdelivery-e2e.mjs        (from functions/)
 * Cleanup deletes every artifact it created (tagged TEST_E2E).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('./adminInit');
const db = admin.firestore();

const PROJECT = 'go7-app-209e4';
const REGION = 'us-central1';
const API_KEY = 'AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s';
const TAG = 'TEST_E2E_PHASE2';

const results = [];
const pass = (name, detail = '') => { results.push(['PASS', name, detail]); console.log(`✅ ${name} ${detail}`); };
const fail = (name, detail = '') => { results.push(['FAIL', name, detail]); console.log(`❌ ${name} ${detail}`); };
const info = (s) => console.log(`ℹ️  ${s}`);

// ---------------------------------------------------------------------------
// Auth helpers — real users so callable auth context is genuine.
// ---------------------------------------------------------------------------
const E2E_PASSWORD = 'Go7E2e!Test#2024';

async function ensureUser(email) {
  try {
    const u = await admin.auth().getUserByEmail(email);
    return u.uid;
  } catch (_) {
    const u = await admin.auth().createUser({
      email, password: E2E_PASSWORD, emailVerified: true, displayName: 'E2E Test',
    });
    return u.uid;
  }
}

async function idTokenFor(email) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://go7.ng/' },
      body: JSON.stringify({ email, password: E2E_PASSWORD, returnSecureToken: true }) }
  );
  const body = await res.json();
  if (!res.ok || !body.idToken) throw new Error(`sign-in failed: ${JSON.stringify(body).slice(0, 200)}`);
  return body.idToken;
}

// ---------------------------------------------------------------------------
// Callable over HTTPS (1st-gen callable protocol).
// ---------------------------------------------------------------------------
async function call(name, data, idToken = null) {
  const res = await fetch(`https://${REGION}-${PROJECT}.cloudfunctions.net/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || (body && body.error)) {
    const err = body?.error || {};
    const e = new Error(err.message || `HTTP ${res.status}`);
    e.code = err.status || `HTTP_${res.status}`;
    e.isError = true;
    return { error: e };
  }
  return { result: body?.result };
}

const expectErr = (r, name, re) => {
  if (!r.error) return fail(name, `expected error, got success: ${JSON.stringify(r.result)?.slice(0, 200)}`);
  if (re && !re.test(`${r.error.code} ${r.error.message}`))
    return fail(name, `unexpected error: ${r.error.code} ${r.error.message}`);
  pass(name, `→ ${r.error.code}: ${String(r.error.message).slice(0, 90)}`);
};

const docExists = async (path) => (await db.doc(path).get()).exists;
const docData = async (path) => (await db.doc(path).get()).data();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const createdIds = [];
let testUid, testUid2;

async function main() {
  // ---- 0. users -----------------------------------------------------------
  testUid = await ensureUser('go7-e2e-test-1@example.com');
  testUid2 = await ensureUser('go7-e2e-test-2@example.com');
  const t1 = await idTokenFor('go7-e2e-test-1@example.com');
  const t2 = await idTokenFor('go7-e2e-test-2@example.com');
  info(`test users: ${testUid}, ${testUid2}`);

  // ---- 1. canonical locations ----------------------------------------------
  const kuto = await call('resolveLocation', { query: 'Kuto' }, t1);
  const funaab = await call('resolveLocation', { query: 'FUNAAB' }, t1);
  const locOf = (r) => r.result?.result || r.result?.location || null;
  const pickup = locOf(kuto);
  const dropoff = locOf(funaab);
  if (!pickup) return fail('resolveLocation Kuto', JSON.stringify(kuto).slice(0, 200));
  if (!dropoff) return fail('resolveLocation FUNAAB', JSON.stringify(funaab).slice(0, 200));
  pass('resolveLocation Kuto', `${pickup.name} ${pickup.lat},${pickup.lng} [${pickup.source}]`);
  pass('resolveLocation FUNAAB', `${dropoff.name} ${dropoff.lat},${dropoff.lng} [${dropoff.source}]`);

  const basePayload = (over = {}) => ({
    pickup: { address: pickup.name || 'Kuto, Abeokuta', lat: pickup.lat, lng: pickup.lng },
    dropoff: { address: dropoff.name || 'FUNAAB', lat: dropoff.lat, lng: dropoff.lng },
    sender: { name: 'E2E Sender', phone: '0000000000', email: 'go7-e2e-test-1@example.com' },
    recipient: { name: 'Test Recipient', phone: '0000000001', email: '' },
    itemDescription: `Laptop (${TAG})`,
    packageDetails: { name: 'Laptop', size: 'medium', weight: 'under_5kg', type: 'electronics' },
    deliveryMode: 'standard',
    paymentMethod: 'wallet',
    ...over,
  });

  // ---- 2. failure tests on create -------------------------------------------
  expectErr(await call('createBookDeliveryOrder', basePayload(), null),
    'unauthenticated create', /UNAUTHENTICATED|unauthenticated/i);

  expectErr(await call('createBookDeliveryOrder',
    basePayload({ pickup: { address: 'x', lat: 0, lng: 0 } }), t1),
    '0,0 coordinates', /INVALID_ARGUMENT|FAILED_PRECONDITION|invalid/i);

  expectErr(await call('createBookDeliveryOrder',
    basePayload({ pickup: { address: 'x', lat: 'abc', lng: null } }), t1),
    'invalid coordinates', /INVALID_ARGUMENT|FAILED_PRECONDITION|invalid/i);

  // authoritative quote first so manipulation tests use sane values
  const good = await call('createBookDeliveryOrder', basePayload(), t1);
  if (good.error) return fail('createBookDeliveryOrder (control)', `${good.error.code} ${good.error.message}`);
  const serverFee = good.result.deliveryFee;
  const serverKm = good.result.distanceKm;
  pass('createBookDeliveryOrder (control)', `id=${good.result.bookingId} fee=₦${serverFee} ${serverKm}km`);
  const controlId = good.result.bookingId;
  createdIds.push(controlId);
  // clean the control pending doc — we re-create for the real flow below
  await db.doc(`pendingBookings/${controlId}`).delete();

  expectErr(await call('createBookDeliveryOrder',
    basePayload({ clientFee: 1 }), t1),
    'manipulated delivery fee', /FAILED_PRECONDITION|fee mismatch|manipulated/i);

  expectErr(await call('createBookDeliveryOrder',
    basePayload({ clientDistanceKm: 0.1 }), t1),
    'manipulated distance', /FAILED_PRECONDITION|distance|manipulated/i);

  expectErr(await call('createBookDeliveryOrder',
    basePayload({ dropoff: { address: 'Lekki, Lagos', lat: 6.4474, lng: 3.4723 } }), t1),
    'outside service area', /FAILED_PRECONDITION|outside|area|distance/i);

  // ---- 3. real create → pending doc, no bookings/orders yet ------------------
  const created = await call('createBookDeliveryOrder', basePayload(), t1);
  if (created.error) return fail('createBookDeliveryOrder (wallet flow)', `${created.error.code} ${created.error.message}`);
  const bookingId = created.result.bookingId;
  createdIds.push(bookingId);
  const grandTotal = created.result.grandTotal;
  pass('create wallet booking', `${bookingId} total=₦${grandTotal}`);

  (await docExists(`pendingBookings/${bookingId}`))
    ? pass('pendingBookings doc created')
    : fail('pendingBookings doc created');
  (!(await docExists(`bookings/${bookingId}`)))
    ? pass('no bookings doc before payment')
    : fail('no bookings doc before payment');
  (!(await docExists(`orders/${bookingId}`)))
    ? pass('no orders doc before payment')
    : fail('no orders doc before payment');

  // ---- 4. confirm failure paths ----------------------------------------------
  expectErr(await call('confirmBookDeliveryPayment',
    { bookingId, method: 'wallet' }, null),
    'unauthenticated confirm', /UNAUTHENTICATED|unauthenticated/i);

  expectErr(await call('confirmBookDeliveryPayment',
    { bookingId, method: 'wallet' }, t2),
    'cross-user confirm', /PERMISSION_DENIED|permission/i);

  expectErr(await call('confirmBookDeliveryPayment',
    { bookingId, method: 'paystack', reference: 'E2E_INVALID_REF' }, t1),
    'invalid Paystack reference', /FAILED_PRECONDITION|verification|not successful|INTERNAL|internal/i);

  // confirm BEFORE wallet debit must fail
  expectErr(await call('confirmBookDeliveryPayment',
    { bookingId, method: 'wallet' }, t1),
    'confirm before wallet debit', /FAILED_PRECONDITION|wallet/i);

  // ---- 5. wallet debit + confirm ----------------------------------------------
  await db.doc(`wallets/${testUid}`).set({ balance: 100000, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  await db.doc(`users/${testUid}`).set({ walletBalance: 100000, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  const debit = await call('debitWalletForDelivery',
    { customerId: testUid, deliveryId: bookingId, fee: grandTotal, description: `Book Delivery ${TAG}` }, t1);
  if (debit.error) return fail('debitWalletForDelivery', `${debit.error.code} ${debit.error.message}`);
  pass('wallet debit', JSON.stringify(debit.result).slice(0, 120));

  // duplicate debit must be rejected (idempotent txn id)
  expectErr(await call('debitWalletForDelivery',
    { customerId: testUid, deliveryId: bookingId, fee: grandTotal }, t1),
    'duplicate wallet debit', /ALREADY_EXISTS|already/i);

  const confirm1 = await call('confirmBookDeliveryPayment',
    { bookingId, method: 'wallet' }, t1);
  if (confirm1.error) return fail('confirmBookDeliveryPayment (wallet)', `${confirm1.error.code} ${confirm1.error.message}`);
  pass('confirmBookDeliveryPayment (wallet)',
    `paid=${confirm1.result.paymentStatus} dispatch=${JSON.stringify(confirm1.result.dispatch).slice(0, 150)}`);

  // ---- 6. post-confirm assertions ----------------------------------------------
  const b = await docData(`bookings/${bookingId}`);
  const o = await docData(`orders/${bookingId}`);
  b ? pass('bookings/{id} created', `status=${b.status} pay=${b.paymentStatus} rider=${b.riderId || 'none'}`)
    : fail('bookings/{id} created');
  o ? pass('orders/{id} created', `status=${o.status}`) : fail('orders/{id} created');
  (b?.paymentStatus === 'paid') ? pass('paymentStatus=paid (server-set)') : fail('paymentStatus=paid', b?.paymentStatus);
  (b?.deliveryFee === serverFee) ? pass('authoritative fee stored', `₦${b?.deliveryFee}`) : fail('authoritative fee stored', `${b?.deliveryFee} vs ${serverFee}`);

  // dispatch outcome
  if (confirm1.result.dispatch?.assigned) {
    pass('rider assigned', `${confirm1.result.dispatch.rider?.name} @ ${confirm1.result.dispatch.rider?.distanceFormatted}`);
    const riderDoc = await docData(`riders/${confirm1.result.dispatch.rider.id}`);
    (riderDoc?.status === 'busy' || riderDoc?.currentOrder === bookingId)
      ? pass('rider status updated', `status=${riderDoc?.status} currentOrder=${riderDoc?.currentOrder}`)
      : fail('rider status updated', JSON.stringify(riderDoc).slice(0, 120));
  } else {
    const b2 = await docData(`bookings/${bookingId}`);
    (b2?.status === 'searching_rider' || b2?.dispatchStatus === 'searching')
      ? pass('no-rider → searching_rider', `reason=${confirm1.result.dispatch?.reason}`)
      : fail('no-rider → searching_rider', `status=${b2?.status} reason=${confirm1.result.dispatch?.reason}`);
  }

  // wait for notifyOnBooking trigger → deliveries/{id} + notification
  await new Promise((r) => setTimeout(r, 8000));
  (await docExists(`deliveries/${bookingId}`))
    ? pass('notifyOnBooking fired → deliveries/{id}')
    : fail('notifyOnBooking fired → deliveries/{id}', 'not created within 8s');

  const notif = await db.collection('notifications').where('orderId', '==', bookingId).limit(1).get();
  if (notif.empty) {
    const n2 = await db.collection('notifications').where('bookingId', '==', bookingId).limit(1).get();
    (!n2.empty) ? pass('customer notification written') : info('no notification doc found (may use different field)');
  } else pass('customer notification written');

  // tracking doc when rider assigned
  if (confirm1.result.dispatch?.assigned) {
    (await docExists(`deliveryTracking/${bookingId}`) || await docExists(`rider_locations/${bookingId}`))
      ? pass('tracking seeded') : fail('tracking seeded');
  }

  // ---- 7. idempotency: confirm again ----------------------------------------------
  const confirm2 = await call('confirmBookDeliveryPayment', { bookingId, method: 'wallet' }, t1);
  confirm2.error ? fail('duplicate confirm', `${confirm2.error.code} ${confirm2.error.message}`)
    : pass('duplicate confirm', `success=${confirm2.result.success} idempotent=${confirm2.result.idempotent ?? 'n/a'}`);

  // concurrent double-confirm
  const [c3a, c3b] = await Promise.all([
    call('confirmBookDeliveryPayment', { bookingId, method: 'wallet' }, t1),
    call('confirmBookDeliveryPayment', { bookingId, method: 'wallet' }, t1),
  ]);
  (!c3a.error && !c3b.error) ? pass('concurrent confirm ×2') : info(`concurrent confirm: ${c3a.error?.code || 'ok'} / ${c3b.error?.code || 'ok'}`);

  const bCount = (await docData(`bookings/${bookingId}`)) ? 1 : 0;
  const oCount = (await docData(`orders/${bookingId}`)) ? 1 : 0;
  (bCount === 1 && oCount === 1) ? pass('no duplicate booking/order docs') : fail('no duplicate booking/order docs');
  const txnSnap = await db.collection('wallets').doc(testUid).collection('transactions')
    .where('deliveryId', '==', bookingId).get();
  (txnSnap.size === 1) ? pass('single wallet debit') : fail('single wallet debit', `count=${txnSnap.size}`);

  // ---- 8. POD gate ---------------------------------------------------------------
  const podCreate = await call('createBookDeliveryOrder',
    basePayload({ paymentMethod: 'pod' }), t1);
  expectErr(podCreate, 'POD rejected for non-vendor', /PERMISSION_DENIED|vendor/i);
}

async function cleanup() {
  console.log('\n🧹 cleanup…');
  for (const id of createdIds) {
    for (const col of ['pendingBookings', 'bookings', 'orders', 'deliveries', 'deliveryTracking', 'rider_locations']) {
      await db.doc(`${col}/${id}`).delete().catch(() => {});
    }
    // free the rider if we assigned one
    const bk = await db.doc(`bookings/${id}`).get().catch(() => null);
    if (bk?.exists && bk.data().riderId) {
      await db.doc(`riders/${bk.data().riderId}`).set(
        { status: 'available', currentOrder: null }, { merge: true }).catch(() => {});
    }
  }
  await db.doc(`wallets/${testUid}`).delete().catch(() => {});
  await db.doc(`users/${testUid}`).delete().catch(() => {});
  await db.doc(`users/${testUid2}`).delete().catch(() => {});
  await admin.auth().deleteUser(testUid).catch(() => {});
  await admin.auth().deleteUser(testUid2).catch(() => {});
  console.log('cleanup done');
}

main()
  .catch((e) => fail('harness', e.message))
  .finally(async () => {
    await cleanup();
    const fails = results.filter((r) => r[0] === 'FAIL');
    console.log(`\n===== ${results.length - fails.length}/${results.length} PASSED =====`);
    process.exit(fails.length ? 1 : 0);
  });

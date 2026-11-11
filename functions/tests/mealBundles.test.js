/**
 * Tests for Scheduled Meal Bundles — Phase 1.
 * Run: node --test tests/mealBundles.test.js  (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mb = require('../mealBundles');

const FieldValue = { serverTimestamp: () => 'TS' };

function makeDb(seed = {}) {
  const store = new Map();
  for (const [p, d] of Object.entries(seed)) store.set(p, { ...d });
  let idCounter = 0;
  const docRef = (path) => ({
    id: path.split('/').pop(),
    ref: null,
    get: async () => ({ exists: store.has(path), data: () => store.get(path), id: path.split('/').pop(), ref: docRef(path) }),
    set: async (d) => store.set(path, { ...d }),
    update: async (d) => store.set(path, { ...(store.get(path) || {}), ...d }),
    collection: (sub) => col(`${path}/${sub}`),
  });
  docRef.ref = docRef;
  const snapOf = (p) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => store.get(p), exists: store.has(p) });
  const col = (name) => ({
    doc: (id) => id ? docRef(`${name}/${id}`) : docRef(`${name}/auto${++idCounter}`),
    where: (f, op, v) => ({
      limit: () => ({
        get: async () => {
          const docs = [...store.entries()].filter(([p]) => p.startsWith(`${name}/`) && store.get(p)?.[f] === v);
          return { empty: docs.length === 0, docs: docs.map(([p]) => snapOf(p)), size: docs.length };
        },
      }),
      get: async () => {
        const docs = [...store.entries()].filter(([p]) => p.startsWith(`${name}/`) && store.get(p)?.[f] === v);
        return { empty: docs.length === 0, docs: docs.map(([p]) => snapOf(p)), size: docs.length };
      },
    }),
    limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
  });
  return { collection: col, _store: store };
}

const VENDOR = { businessName: 'Test Kitchen', live: true, isOpen: true, lat: 7.14, lng: 3.35 };
const PRODUCT = { name: 'Jollof', priceKobo: 150000, available: true };
const future = (h) => new Date(Date.now() + h * 3600000).toISOString();
const leg = (over = {}) => ({
  vendorId: 'v1',
  items: [{ productId: 'p1', quantity: 2 }],
  scheduledFor: future(5),
  dropoff: { lat: 7.15, lng: 3.36, address: 'Kuto' },
  ...over,
});

test('validateLegs reprices items from the live catalog', async () => {
  const db = makeDb({ 'vendors/v1': VENDOR, 'vendors/v1/products/p1': PRODUCT });
  const legs = await mb.validateLegs(db, [leg()]);
  assert.equal(legs[0].subtotalKobo, 300000); // 2 × ₦1,500
  assert.equal(legs[0].items[0].priceKobo, 150000);
});

test('client-supplied price is ignored — server reprices', async () => {
  const db = makeDb({ 'vendors/v1': VENDOR, 'vendors/v1/products/p1': PRODUCT });
  const legs = await mb.validateLegs(db, [leg({ items: [{ productId: 'p1', quantity: 1, priceKobo: 1 }] })]);
  assert.equal(legs[0].subtotalKobo, 150000); // real price, not ₦1
});

test('leg scheduled too soon is rejected', async () => {
  const db = makeDb({ 'vendors/v1': VENDOR, 'vendors/v1/products/p1': PRODUCT });
  await assert.rejects(() => mb.validateLegs(db, [leg({ scheduledFor: future(0.1) })]), /at least 1 hour/);
});

test('closed vendor rejected', async () => {
  const db = makeDb({ 'vendors/v1': { ...VENDOR, live: false }, 'vendors/v1/products/p1': PRODUCT });
  await assert.rejects(() => mb.validateLegs(db, [leg()]), /closed/);
});

test('missing product rejected', async () => {
  const db = makeDb({ 'vendors/v1': VENDOR });
  await assert.rejects(() => mb.validateLegs(db, [leg()]), /item not found/);
});

test('fanOut materializes a due leg as a real order', async () => {
  const b = {
    'mealBundles/b1': {
      bundleId: 'b1', userId: 'u1', status: 'paid', paymentRef: 'ref123', paymentMethod: 'paystack',
      legs: [{
        legIndex: 0, vendorId: 'v1', vendorName: 'Test Kitchen',
        items: [{ productId: 'p1', name: 'Jollof', quantity: 1, priceKobo: 150000 }],
        scheduledFor: new Date(Date.now() + 30 * 60000).toISOString(), // due within window
        dropoff: { lat: 7.15, lng: 3.36, address: 'Kuto' },
        subtotalKobo: 150000, deliveryFeeKobo: 50000, status: 'scheduled', orderId: null,
      }],
    },
  };
  const db = makeDb(b);
  const res = await mb.fanOutDueLegs(db, FieldValue);
  assert.equal(res.dispatched, 1);
  const bundle = db._store.get('mealBundles/b1');
  assert.equal(bundle.legs[0].status, 'dispatched');
  const orderId = bundle.legs[0].orderId;
  const order = db._store.get(`orders/${orderId}`);
  assert.equal(order.status, 'pending');
  assert.equal(order.isBundleLeg, true);
  assert.equal(order.bundleId, 'b1');
  assert.equal(order.totalKobo, 200000);
  assert.ok(db._store.get([...db._store.keys()].find((k) => k.startsWith('notifications/'))));
});

test('fanOut skips legs scheduled beyond the window', async () => {
  const db = makeDb({
    'mealBundles/b1': {
      bundleId: 'b1', userId: 'u1', status: 'paid',
      legs: [{ legIndex: 0, vendorId: 'v1', items: [], scheduledFor: future(5), dropoff: {}, subtotalKobo: 1, deliveryFeeKobo: 0, status: 'scheduled', orderId: null }],
    },
  });
  const res = await mb.fanOutDueLegs(db, FieldValue);
  assert.equal(res.dispatched, 0);
});

test('unpaid bundle legs are not dispatched', async () => {
  const db = makeDb({
    'mealBundles/b1': {
      bundleId: 'b1', userId: 'u1', status: 'pending_payment',
      legs: [{ legIndex: 0, scheduledFor: new Date(Date.now() + 30 * 60000).toISOString(), status: 'scheduled', orderId: null }],
    },
  });
  const res = await mb.fanOutDueLegs(db, FieldValue);
  assert.equal(res.dispatched, 0);
});

test('already-dispatched leg is not re-dispatched (idempotent)', async () => {
  const db = makeDb({
    'mealBundles/b1': {
      bundleId: 'b1', userId: 'u1', status: 'paid',
      legs: [{ legIndex: 0, scheduledFor: new Date(Date.now() + 30 * 60000).toISOString(), status: 'dispatched', orderId: 'ord1' }],
    },
  });
  const res = await mb.fanOutDueLegs(db, FieldValue);
  assert.equal(res.dispatched, 0);
});

// --------------------------------------------------------------------------
// Refunds
// --------------------------------------------------------------------------

const FieldValueInc = {
  serverTimestamp: () => 'TS',
  increment: (n) => ({ increment: n }),
};

test('refundLegToWallet credits once and is idempotent', async () => {
  const store = new Map();
  const applyInc = (cur, v) => (v && v.increment ? (Number(cur) || 0) + v.increment : v);
  const docRef = (p) => ({
    get: async () => ({ exists: store.has(p), data: () => store.get(p) }),
    set: async (d, o) => {
      const cur = store.get(p) || {};
      const out = o && o.merge ? { ...cur } : {};
      for (const [k, v] of Object.entries(d)) out[k] = applyInc(cur[k], v);
      store.set(p, out);
    },
    collection: (s) => ({ doc: (id) => docRef(`${p}/${s}/${id}`) }),
  });
  const db = { collection: (n) => ({ doc: (id) => docRef(`${n}/${id}`) }), runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, d, o) => r.set(d, o) }) };
  const ctx = { db, FieldValue: FieldValueInc };
  const leg = { subtotalKobo: 150000, deliveryFeeKobo: 50000 };
  const bundle = { bundleId: 'b1', userId: 'u1' };

  const r1 = await mb.refundLegToWallet(ctx, bundle, 0, leg);
  assert.equal(r1.refunded, 200000);
  assert.equal(store.get('wallets/u1').balanceKobo, 200000);
  const r2 = await mb.refundLegToWallet(ctx, bundle, 0, leg);
  assert.equal(r2.refunded, 0); // idempotent — no double refund
  assert.equal(store.get('wallets/u1').balanceKobo, 200000);
});

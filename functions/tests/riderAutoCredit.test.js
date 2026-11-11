/**
 * Tests for idempotent rider earnings auto-credit (prevent recurrence).
 * Run: node --test tests/riderAutoCredit.test.js  (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { creditRiderIfEligible } = require('../riderAutoCredit');

const FieldValue = {
  serverTimestamp: () => ({ __serverTs: true }),
  increment: (n) => ({ increment: n }),
};

/** Minimal Firestore mock: refs carry their own get/set/update against the store. */
function makeDb() {
  const store = {
    orders: {
      O1: { id: 'O1', riderId: 'R1', riderPayout: 1000, status: 'delivered' },
    },
    rider_earnings: {
      R1: { totalEarned: 0, availableBalance: 0, completedDeliveries: 0, deliveryCount: 0 },
    },
  };

  const applyNumber = (data) => {
    if (data && typeof data === 'object' && 'increment' in data) return Number(data.increment) || 0;
    return Number(data) || 0;
  };

  const db = {
    store,
    collection(name) {
      return {
        doc: (id) => ({
          async get() {
            return { exists: !!store[name][id], data: () => store[name][id] || {} };
          },
          async set(data, opts) {
            store[name] = store[name] || {};
            const cur = store[name][id] || {};
            const merged = { ...cur, ...data };
            if (opts && opts.merge) {
              for (const k of Object.keys(data)) {
                if (data[k] && typeof data[k] === 'object' && 'increment' in data[k]) {
                  merged[k] = applyNumber(cur[k]) + applyNumber(data[k]);
                }
              }
            }
            store[name][id] = merged;
          },
          async update(fields) {
            store[name] = store[name] || {};
            store[name][id] = { ...(store[name][id] || {}), ...fields };
          },
        }),
      };
    },
    async runTransaction(cb) {
      const t = {
        async get(ref) { return ref.get(); },
        async set(ref, data, opts) { return ref.set(data, opts); },
        async update(ref, fields) { return ref.update(fields); },
      };
      await cb(t);
      return { success: true };
    },
  };
  return db;
}

test('auto-credit: eligible delivered order credits rider earnings once', async () => {
  const db = makeDb();
  const r = await creditRiderIfEligible({ db, FieldValue }, 'O1', db.store.orders.O1, 'orders');
  assert.equal(r.credited, true);
  const e = db.store.rider_earnings.R1;
  assert.equal(e.totalEarned, 1000);
  assert.equal(e.availableBalance, 1000);
  assert.equal(e.completedDeliveries, 1);
  assert.equal(db.store.orders.O1.riderEarningsCredited, true);
});

test('auto-credit: already-credited order does NOT double-pay', async () => {
  const db = makeDb();
  db.store.orders.O1.riderEarningsCredited = true;
  db.store.rider_earnings.R1.totalEarned = 1000;
  db.store.rider_earnings.R1.availableBalance = 1000;
  const r = await creditRiderIfEligible({ db, FieldValue }, 'O1', db.store.orders.O1, 'orders');
  assert.equal(r.credited, false);
  const e = db.store.rider_earnings.R1;
  assert.equal(e.totalEarned, 1000); // unchanged
  assert.equal(e.completedDeliveries, 0);
});

test('auto-credit: no riderId or payout → skipped', async () => {
  const db = makeDb();
  const r = await creditRiderIfEligible({ db, FieldValue }, 'O1', { status: 'delivered' }, 'orders');
  assert.equal(r.credited, false);
});

test('auto-credit: fuel order with payout credits once', async () => {
  const db = makeDb();
  db.store.fuelOrders = { F1: { id: 'F1', riderId: 'R1', riderPayout: 1249, status: 'delivered' } };
  const r = await creditRiderIfEligible({ db, FieldValue }, 'F1', db.store.fuelOrders.F1, 'fuelOrders');
  assert.equal(r.credited, true);
  assert.equal(db.store.rider_earnings.R1.totalEarned, 1249);
  assert.equal(db.store.fuelOrders.F1.riderEarningsCredited, true);
});

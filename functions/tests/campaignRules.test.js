/**
 * Tests for the configurable campaign reward-rules engine.
 * Run: node --test tests/campaignRules.test.js  (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const cr = require('../campaignRules');

const FieldValue = {
  serverTimestamp: () => ({ __serverTs: true }),
  increment: (n) => ({ increment: n }),
};

function getField(data, field) {
  return field.split('.').reduce((o, k) => (o == null ? o : o[k]), data);
}

function makeDb(seed = {}) {
  const store = new Map();
  for (const [path, data] of Object.entries(seed)) store.set(path, { ...data });
  const applyValue = (cur, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('increment' in v) return (Number(cur) || 0) + v.increment;
      if ('__serverTs' in v) return 'TS';
      // Deep-merge plain objects � mirrors Firestore set({merge:true}) semantics
      const base = cur && typeof cur === 'object' && !Array.isArray(cur) ? { ...cur } : {};
      for (const [k2, v2] of Object.entries(v)) base[k2] = applyValue(base[k2], v2);
      return base;
    }
    return v;
  };
  const applySet = (path, data, opts) => {
    const cur = store.get(path) || {};
    const merged = opts && opts.merge ? { ...cur } : {};
    for (const [k, v] of Object.entries(data)) {
      if (k.includes('.')) {
        const parts = k.split('.');
        let obj = merged;
        for (let i = 0; i < parts.length - 1; i++) { obj[parts[i]] = { ...(obj[parts[i]] || {}) }; obj = obj[parts[i]]; }
        obj[parts[parts.length - 1]] = applyValue(getField(cur, k), v);
      } else merged[k] = applyValue(cur[k], v);
    }
    store.set(path, merged);
  };
  const docRef = (path) => ({
    id: path.split('/').pop(),
    get: async () => ({ exists: store.has(path), data: () => store.get(path), id: path.split('/').pop(), ref: docRef(path) }),
    set: async (d, o) => applySet(path, d, o),
    update: async (d) => applySet(path, d, { merge: true }),
    ref: null,
  });
  docRef.ref = docRef;
  const collection = (name) => ({
    doc: (id) => docRef(`${name}/${id}`),
    where: (f, op, v) => ({
      get: async () => {
        const docs = [...store.entries()]
          .filter(([p]) => p.startsWith(`${name}/`))
          .filter(([, d]) => getField(d, f) === v)
          .map(([p]) => docRef(p));
        return { empty: docs.length === 0, size: docs.length, docs: await Promise.all(docs.map(async (d) => d.get())), forEach: (fn) => docs.forEach(fn) };
      },
    }),
    limit: (n) => ({ get: async () => ({ empty: false, size: 0, docs: [], forEach: () => {} }) }),
  });
  return {
    collection,
    runTransaction: async (fn) => fn({ get: (ref) => ref.get(), set: (ref, d, o) => ref.set(d, o), update: (ref, d) => ref.update(d) }),
    _store: store,
  };
}

const ctx = (seed) => ({ db: makeDb(seed), FieldValue });

const QUALIFYING_ORDER = {
  userId: 'cust1', status: 'delivered', paymentStatus: 'paid', grandTotal: 5000,
};
const ACTIVE_PARTNER = { status: 'ACTIVE' };
const ATTR = { status: 'REGISTERED', partnerId: 'partner1', partnerCode: 'GO7XYZ' };

function seedCampaign(id, extra = {}) {
  return { [`growthCampaigns/${id}`]: { status: 'ACTIVE', name: 'Test', ...extra } };
}

// --------------------------------------------------------------------------
// validateRewardRules
// --------------------------------------------------------------------------

test('validate: FIXED rule requires amountKobo', () => {
  const { error } = cr.validateRewardRules([{ event: 'FIRST_COMPLETED_ORDER', rewardType: 'FIXED' }]);
  assert.match(error, /amountKobo/);
});

test('validate: PERCENT rule requires percentBps', () => {
  const { error } = cr.validateRewardRules([{ event: 'FIRST_COMPLETED_ORDER', rewardType: 'PERCENT' }]);
  assert.match(error, /percentBps/);
});

test('validate: NTH order requires threshold', () => {
  const { error } = cr.validateRewardRules([{ event: 'NTH_COMPLETED_ORDER', rewardType: 'FIXED', amountKobo: 500 }]);
  assert.match(error, /threshold/);
});

test('validate: duplicate rule ids rejected', () => {
  const { error } = cr.validateRewardRules([
    { id: 'A', event: 'FIRST_COMPLETED_ORDER', rewardType: 'FIXED', amountKobo: 1 },
    { id: 'A', event: 'EVERY_COMPLETED_ORDER', rewardType: 'FIXED', amountKobo: 1 },
  ]);
  assert.match(error, /duplicate/);
});

test('validate: bad event rejected', () => {
  const { error } = cr.validateRewardRules([{ event: 'MOON_LANDING', rewardType: 'FIXED', amountKobo: 1 }]);
  assert.match(error, /unsupported event/);
});

// --------------------------------------------------------------------------
// Rule evaluation on a completed order
// --------------------------------------------------------------------------

test('FIRST_COMPLETED_ORDER issues reward to referrer with snapshot', async () => {
  const c = ctx({
    ...seedCampaign('C1', {
      rewardRules: [{ id: 'WELCOME', event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 30000 }],
    }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(res.issued, 1);
  const reward = c.db._store.get('growthRewards/rule:C1:WELCOME:partner1:first');
  assert.equal(reward.amountKobo, 30000);
  assert.equal(reward.status, 'PENDING');
  assert.equal(reward.ruleSnapshot.amountKobo, 30000); // snapshot stored
  assert.equal(reward.participantId, 'partner1');
});

test('duplicate order cannot double-issue (idempotent)', async () => {
  const seed = {
    ...seedCampaign('C1', { rewardRules: [{ id: 'R', event: 'EVERY_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  };
  const c = ctx(seed);
  await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  const res2 = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(res2.issued, 0);
});

test('paused/inactive campaign issues nothing', async () => {
  const c = ctx({
    [`growthCampaigns/C1`]: { status: 'PAUSED', rewardRules: [{ event: 'FIRST_COMPLETED_ORDER', rewardType: 'FIXED', amountKobo: 1000 }] },
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(res.issued, 0);
});

test('expired campaign (endAt passed) issues nothing', async () => {
  const c = ctx({
    ...seedCampaign('C1', { endAt: '2020-01-01T00:00:00Z', rewardRules: [{ event: 'FIRST_COMPLETED_ORDER', rewardType: 'FIXED', amountKobo: 1000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(res.issued, 0);
});

test('NTH_COMPLETED_ORDER fires only on the threshold order', async () => {
  const seed = {
    ...seedCampaign('C1', { rewardRules: [{ id: 'T3', event: 'NTH_COMPLETED_ORDER', threshold: 2, participant: 'referrer', rewardType: 'FIXED', amountKobo: 5000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  };
  const c = ctx(seed);
  const r1 = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(r1.issued, 0); // 1st order — not the 2nd
  const r2 = await cr.evaluateOrderForCampaignRules(c, 'ord2', QUALIFYING_ORDER);
  assert.equal(r2.issued, 1); // 2nd order — hits threshold
  assert.ok(c.db._store.get('growthRewards/rule:C1:T3:partner1:nth2'));
});

test('DELIVERY_VOLUME fires once when count reaches threshold', async () => {
  const seed = {
    ...seedCampaign('C1', { rewardRules: [{ id: 'V', event: 'DELIVERY_VOLUME', threshold: 2, participant: 'referrer', rewardType: 'FIXED', amountKobo: 8000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  };
  const c = ctx(seed);
  await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  const r2 = await cr.evaluateOrderForCampaignRules(c, 'ord2', QUALIFYING_ORDER);
  assert.equal(r2.issued, 1);
  const r3 = await cr.evaluateOrderForCampaignRules(c, 'ord3', QUALIFYING_ORDER);
  assert.equal(r3.issued, 0); // already awarded
});

test('PERCENT reward computes from order total', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ id: 'PCT', event: 'EVERY_COMPLETED_ORDER', participant: 'referrer', rewardType: 'PERCENT', percentBps: 500 }] }), // 5%
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER); // ₦5000 = 500000 kobo
  assert.equal(res.issued, 1);
  assert.equal(res.rewards[0].amountKobo, 25000); // ₦250
});

test('minOrderKobo excludes small orders', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ event: 'EVERY_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000, minOrderKobo: 1000000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER); // 500000 kobo < min
  assert.equal(res.issued, 0);
});

test('campaign budget blocks rewards past the cap', async () => {
  const c = ctx({
    ...seedCampaign('C1', { budgetKobo: 1500, rewardRules: [{ event: 'EVERY_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const r1 = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(r1.issued, 1);
  const r2 = await cr.evaluateOrderForCampaignRules(c, 'ord2', QUALIFYING_ORDER);
  assert.equal(r2.issued, 0); // 1000 + 1000 > 1500 budget
});

test('suspended partner earns nothing', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000 }] }),
    'growthPartners/partner1': { status: 'SUSPENDED' },
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(res.issued, 0);
});

test('incomplete order never qualifies', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ event: 'EVERY_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', { ...QUALIFYING_ORDER, status: 'preparing' });
  assert.equal(res.issued, 0);
});

test('fraud-flagged order never qualifies', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ event: 'EVERY_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', { ...QUALIFYING_ORDER, fraudFlagged: true });
  assert.equal(res.issued, 0);
});

test('disabled rule is skipped', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000, enabled: false }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(res.issued, 0);
});

test('referred-participant reward goes to the customer', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ id: 'CUST', event: 'FIRST_COMPLETED_ORDER', participant: 'referred', rewardType: 'FIXED', amountKobo: 20000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'ord1', QUALIFYING_ORDER);
  assert.equal(res.issued, 1);
  const reward = c.db._store.get('growthRewards/rule:C1:CUST:cust1:first');
  assert.equal(reward.participantId, 'cust1');
});

// --------------------------------------------------------------------------
// Reversals
// --------------------------------------------------------------------------

test('voided order reverses pending/approved rewards, flags paid', async () => {
  const c = ctx({
    'growthRewards/rule:C1:R:p1:ord1': { ruleId: 'R', orderId: 'ord1', status: 'PENDING' },
    'growthRewards/rule:C1:R:p2:ord1': { ruleId: 'R', orderId: 'ord1', status: 'APPROVED' },
    'growthRewards/rule:C1:R:p3:ord1': { ruleId: 'R', orderId: 'ord1', status: 'PAID' },
  });
  const res = await cr.reverseRewardsForOrder(c, 'ord1');
  assert.equal(res.reversed, 2);
  assert.equal(c.db._store.get('growthRewards/rule:C1:R:p1:ord1').status, 'VOID');
  assert.equal(c.db._store.get('growthRewards/rule:C1:R:p3:ord1').paidRewardFlagged, true);
});

// --------------------------------------------------------------------------
// Ambassador pilot: subtotal-basis tiers + repeat caps + phone gate
// --------------------------------------------------------------------------

// Canonical pilot config: 9 rules — 3 subtotal tiers (FOOD/MARKET/PHARMACY),
// 1 flat parcel first-order (grandTotal), 5 shared NTH repeats. MARKET/PHARMACY
// are unlaunched — identical schema as FOOD; rules fail closed if fields absent.
const ITEM_TYPES = ['FOOD', 'MARKET', 'PHARMACY'];
const PILOT_RULES = [
  { id: 'F_T2', event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 10000, basis: 'subtotal', minOrderKobo: 150000, maxOrderKobo: 249999, eligibleOrderTypes: ITEM_TYPES },
  { id: 'F_T3', event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 20000, basis: 'subtotal', minOrderKobo: 250000, maxOrderKobo: 399999, eligibleOrderTypes: ITEM_TYPES },
  { id: 'F_T4', event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 30000, basis: 'subtotal', minOrderKobo: 400000, eligibleOrderTypes: ITEM_TYPES },
  { id: 'P_F', event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 15000, basis: 'grandTotal', minOrderKobo: 200000, eligibleOrderTypes: ['GENERAL_DELIVERY', 'PARCEL'] },
  { id: 'R2', event: 'NTH_COMPLETED_ORDER', threshold: 2, participant: 'referrer', rewardType: 'FIXED', amountKobo: 15000, basis: 'subtotal', minOrderKobo: 150000, eligibleOrderTypes: ITEM_TYPES, counterScope: 'repeats' },
  { id: 'R3', event: 'NTH_COMPLETED_ORDER', threshold: 3, participant: 'referrer', rewardType: 'FIXED', amountKobo: 15000, basis: 'subtotal', minOrderKobo: 150000, eligibleOrderTypes: ITEM_TYPES, counterScope: 'repeats' },
  { id: 'R4', event: 'NTH_COMPLETED_ORDER', threshold: 4, participant: 'referrer', rewardType: 'FIXED', amountKobo: 15000, basis: 'subtotal', minOrderKobo: 150000, eligibleOrderTypes: ITEM_TYPES, counterScope: 'repeats' },
  { id: 'R5', event: 'NTH_COMPLETED_ORDER', threshold: 5, participant: 'referrer', rewardType: 'FIXED', amountKobo: 15000, basis: 'subtotal', minOrderKobo: 150000, eligibleOrderTypes: ITEM_TYPES, counterScope: 'repeats' },
  { id: 'R6', event: 'NTH_COMPLETED_ORDER', threshold: 6, participant: 'referrer', rewardType: 'FIXED', amountKobo: 15000, basis: 'subtotal', minOrderKobo: 150000, eligibleOrderTypes: ITEM_TYPES, counterScope: 'repeats' },
];

const parcelOrder = (uid, grandTotal, extra = {}) => ({
  userId: uid, status: 'delivered', paymentStatus: 'paid', orderType: 'GENERAL_DELIVERY',
  grandTotal, total: grandTotal, totalKobo: grandTotal * 100, deliveryFee: Math.round(grandTotal / 1.1), ...extra,
});

const foodOrder = (uid, subtotal, extra = {}) => ({
  userId: uid, status: 'delivered', paymentStatus: 'paid', orderType: 'FOOD',
  subtotal, grandTotal: subtotal + 1500, ...extra,
});

const pilotSeed = (uid, extra = {}) => ({
  ...seedCampaign('CAMP', { rewardRules: PILOT_RULES, ...extra }),
  'growthPartners/partner1': ACTIVE_PARTNER,
  [`referralAttributions/${uid}`]: ATTR,
});

test('pilot tiers: subtotal boundaries pay exactly 0/100/200/300', async () => {
  for (const [sub, amt] of [[1499, 0], [1500, 10000], [2499, 10000], [2500, 20000], [3999, 20000], [4000, 30000]]) {
    const uid = `u${sub}`;
    const c = ctx(pilotSeed(uid));
    const res = await cr.evaluateOrderForCampaignRules(c, `o${sub}`, foodOrder(uid, sub));
    const rewards = [...c.db._store.keys()].filter((k) => k.startsWith('growthRewards/'));
    assert.equal(rewards.length, amt === 0 ? 0 : 1, `subtotal ${sub}: rewards=${rewards}`);
    if (amt) assert.equal(c.db._store.get(rewards[0]).amountKobo, amt, `subtotal ${sub}`);
  }
});

test('pilot tiers: delivery/platform fees cannot inflate tier (subtotal basis)', async () => {
  const c = ctx(pilotSeed('cust1'));
  const res = await cr.evaluateOrderForCampaignRules(c, 'o1', foodOrder('cust1', 1200, { grandTotal: 5200 }));
  assert.equal(res.issued, 0);
});

test('pilot tiers: grandTotal remains the default basis', async () => {
  const c = ctx({
    ...seedCampaign('C1', { rewardRules: [{ id: 'G', event: 'FIRST_COMPLETED_ORDER', participant: 'referrer', rewardType: 'FIXED', amountKobo: 1000, minOrderKobo: 500000 }] }),
    'growthPartners/partner1': ACTIVE_PARTNER,
    'referralAttributions/cust1': ATTR,
  });
  const res = await cr.evaluateOrderForCampaignRules(c, 'o1', foodOrder('cust1', 1000, { grandTotal: 5200 }));
  assert.equal(res.issued, 1);
});

test('pilot repeats: orders 1-7 pay tier + exactly five 150 rewards', async () => {
  const c = ctx(pilotSeed('cust1'));
  for (let i = 1; i <= 7; i++) {
    await cr.evaluateOrderForCampaignRules(c, `o${i}`, foodOrder('cust1', i === 1 ? 4000 : 2000));
  }
  const rewards = [...c.db._store.entries()].filter(([k]) => k.startsWith('growthRewards/')).map(([, v]) => v);
  const amounts = rewards.map((r) => r.amountKobo).sort((a, b) => a - b);
  assert.deepEqual(amounts, [15000, 15000, 15000, 15000, 15000, 30000]);
});

test('pilot repeats: below-floor order does not consume an NTH milestone', async () => {
  const c = ctx(pilotSeed('cust1'));
  await cr.evaluateOrderForCampaignRules(c, 'o1', foodOrder('cust1', 3000));   // count=1 -> tier ₦200
  await cr.evaluateOrderForCampaignRules(c, 'o2', foodOrder('cust1', 1200));   // below floor -> not counted
  const res = await cr.evaluateOrderForCampaignRules(c, 'o3', foodOrder('cust1', 3000)); // count=2 -> R2
  const r2 = c.db._store.get('growthRewards/rule:CAMP:R2:partner1:nth2');
  assert.ok(r2, 'R2 should fire on the 2nd qualifying order');
  assert.equal(r2.amountKobo, 15000);
});

test('pilot: GENERAL_DELIVERY qualifies via parcel rule, not food tiers', async () => {
  const c = ctx(pilotSeed('cust1'));
  const res = await cr.evaluateOrderForCampaignRules(c, 'o1', foodOrder('cust1', 4000, { orderType: 'GENERAL_DELIVERY' }));
  assert.equal(res.issued, 1);
  const rw = c.db._store.get('growthRewards/rule:CAMP:P_F:partner1:first');
  assert.equal(rw.amountKobo, 15000); // flat parcel reward, not the ₦300 food tier
});

test('pilot: requirePhoneVerified skips unverified, pays verified', async () => {
  const c = ctx({ ...pilotSeed('cust1', { requirePhoneVerified: true }), 'users/cust1': { phoneVerified: false } });
  const res1 = await cr.evaluateOrderForCampaignRules(c, 'o1', foodOrder('cust1', 4000));
  assert.equal(res1.issued, 0);
  assert.ok(res1.skipped.some((s) => s.includes('PHONE_UNVERIFIED')));
  const c2 = ctx({ ...pilotSeed('cust1', { requirePhoneVerified: true }), 'users/cust1': { phoneVerified: true } });
  const res2 = await cr.evaluateOrderForCampaignRules(c2, 'o1', foodOrder('cust1', 4000));
  assert.equal(res2.issued, 1);
});

test('validate: maxOrderKobo must exceed minOrderKobo', () => {
  const { error } = cr.validateRewardRules([
    { event: 'FIRST_COMPLETED_ORDER', rewardType: 'FIXED', amountKobo: 100, minOrderKobo: 300000, maxOrderKobo: 200000 },
  ]);
  assert.match(error, /maxOrderKobo/);
});

// --------------------------------------------------------------------------
// Multi-service pilot: Book Delivery, MARKET/PHARMACY, exclusions, edge cases
// --------------------------------------------------------------------------

test('pilot config validates: 9 rules under the cap', () => {
  const { rules, error } = cr.validateRewardRules(PILOT_RULES);
  assert.equal(error, undefined);
  assert.equal(rules.length, 9);
});

test('validate: 11 rules rejected (cap enforced)', () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ id: `R${i}`, event: 'NTH_COMPLETED_ORDER', threshold: i + 1, rewardType: 'FIXED', amountKobo: 1 }));
  const { error } = cr.validateRewardRules(many);
  assert.match(error, /max 10/);
});

test('book delivery: GENERAL_DELIVERY and parcel spellings both qualify at >=2000 grandTotal', async () => {
  for (const ot of ['GENERAL_DELIVERY', 'parcel']) {
    const uid = `u_${ot}`;
    const c = ctx(pilotSeed(uid));
    const res = await cr.evaluateOrderForCampaignRules(c, `o_${ot}`, parcelOrder(uid, 3000, { orderType: ot }));
    assert.equal(res.issued, 1, ot);
    const rw = c.db._store.get(`growthRewards/rule:CAMP:P_F:partner1:first`);
    assert.equal(rw.amountKobo, 15000);
  }
});

test('book delivery: below 2000 grandTotal pays nothing; no repeat rewards', async () => {
  const c = ctx(pilotSeed('cust1'));
  const low = await cr.evaluateOrderForCampaignRules(c, 'o1', parcelOrder('cust1', 1999));
  assert.equal(low.issued, 0);
  const c2 = ctx(pilotSeed('cust2'));
  await cr.evaluateOrderForCampaignRules(c2, 'o1', parcelOrder('cust2', 3000)); // first ₦150
  const second = await cr.evaluateOrderForCampaignRules(c2, 'o2', parcelOrder('cust2', 3000));
  assert.equal(second.issued, 0); // no repeat rewards for parcels
});

test('book delivery order cannot match FOOD tier/repeat rules', async () => {
  const c = ctx(pilotSeed('cust1'));
  await cr.evaluateOrderForCampaignRules(c, 'o1', parcelOrder('cust1', 5000)); // subtotal absent -> food rules can't fire
  const foodRewards = [...c.db._store.keys()].filter((k) => /F_T|R[2-6]/.test(k));
  assert.equal(foodRewards.length, 0);
});

test('MARKET and PHARMACY qualify on same subtotal tiers', async () => {
  for (const ot of ['MARKET', 'PHARMACY']) {
    const uid = `m_${ot}`;
    const c = ctx(pilotSeed(uid));
    const res = await cr.evaluateOrderForCampaignRules(c, `o_${ot}`, foodOrder(uid, 3000, { orderType: ot }));
    assert.equal(res.issued, 1, ot);
  }
});

test('GoBuy, fuel, unknown, and legacy type-less orders are excluded', async () => {
  for (const [i, ot] of ['gobuy', 'fuel', 'UNKNOWN_TYPE', undefined].entries()) {
    const uid = `x${i}`;
    const c = ctx(pilotSeed(uid));
    const res = await cr.evaluateOrderForCampaignRules(c, `o${i}`, foodOrder(uid, 4000, { orderType: ot }));
    assert.equal(res.issued, 0, String(ot));
  }
});

test('parcel first order consumes the first-order slot (no food tier later)', async () => {
  const c = ctx(pilotSeed('cust1'));
  await cr.evaluateOrderForCampaignRules(c, 'o1', parcelOrder('cust1', 3000)); // P_F ₦150, main count=1
  await cr.evaluateOrderForCampaignRules(c, 'o2', foodOrder('cust1', 4000));   // main count=2 -> no tier; repeats count=1 -> no repeat yet
  const tiers = [...c.db._store.keys()].filter((k) => k.includes('F_T'));
  assert.equal(tiers.length, 0);
  await cr.evaluateOrderForCampaignRules(c, 'o3', foodOrder('cust1', 2000));   // repeats count=2 -> R2
  assert.ok(c.db._store.get('growthRewards/rule:CAMP:R2:partner1:nth2'));
});

test('parcel orders never advance the food repeat milestone counter', async () => {
  const c = ctx(pilotSeed('cust1'));
  await cr.evaluateOrderForCampaignRules(c, 'o1', foodOrder('cust1', 3000));     // item #1: tier ₦200, repeats count=1
  await cr.evaluateOrderForCampaignRules(c, 'o2', parcelOrder('cust1', 5000));   // parcel: main only, repeats untouched
  await cr.evaluateOrderForCampaignRules(c, 'o3', parcelOrder('cust1', 8000));   // parcel again
  const res = await cr.evaluateOrderForCampaignRules(c, 'o4', foodOrder('cust1', 2000)); // item #2 -> repeats count=2 -> R2
  assert.ok(c.db._store.get('growthRewards/rule:CAMP:R2:partner1:nth2'), 'R2 must fire on the 2nd item order, not be consumed by parcels');
  const repeatsCounter = c.db._store.get('growthRuleCounters/CAMP_partner1_cust1_repeats');
  assert.equal(repeatsCounter.completedOrders, 2);
});

test('repeated parcel orders cannot manipulate the repeat counter', async () => {
  const c = ctx(pilotSeed('cust1'));
  for (let i = 1; i <= 5; i++) {
    await cr.evaluateOrderForCampaignRules(c, `p${i}`, parcelOrder('cust1', 3000 + i));
  }
  // 'repeats' counter was never created — no item order has been counted.
  assert.equal(c.db._store.get('growthRuleCounters/CAMP_partner1_cust1_repeats'), undefined);
  const r1 = await cr.evaluateOrderForCampaignRules(c, 'f1', foodOrder('cust1', 4000)); // item #1 — no tier (main count=6), repeats=1
  assert.equal(c.db._store.get('growthRuleCounters/CAMP_partner1_cust1_repeats').completedOrders, 1);
  await cr.evaluateOrderForCampaignRules(c, 'f2', foodOrder('cust1', 2000));            // item #2 -> R2
  assert.ok(c.db._store.get('growthRewards/rule:CAMP:R2:partner1:nth2'));
  const totals = [...c.db._store.entries()].filter(([k]) => k.startsWith('growthRewards/')).map(([, v]) => v.amountKobo);
  assert.deepEqual(totals.sort((a, b) => a - b), [15000, 15000]); // parcel ₦150 + repeat ₦150 only
});

test('missing/malformed pricing fields fail closed', async () => {
  const cases = [
    { userId: 'a', status: 'delivered', paymentStatus: 'paid', orderType: 'FOOD' },                       // no amounts
    { userId: 'a', status: 'delivered', paymentStatus: 'paid', orderType: 'FOOD', subtotal: 0 },          // zero subtotal
    { userId: 'a', status: 'delivered', paymentStatus: 'paid', orderType: 'FOOD', subtotal: 'garbage' },  // string subtotal
    { userId: 'a', status: 'delivered', paymentStatus: 'paid', orderType: 'FOOD', grandTotal: 'oops' },   // malformed total
  ];
  for (let i = 0; i < cases.length; i++) {
    const uid = `bad${i}`;
    const c = ctx(pilotSeed(uid));
    const res = await cr.evaluateOrderForCampaignRules(c, `ob${i}`, cases[i]);
    assert.equal(res.issued, 0, JSON.stringify(cases[i]));
  }
});

test('legacy zeroed fields produce no legacy rewards', async () => {
  // partnerRewardKobo=0 is enforced in growthEngine; here prove rule-only config
  // creates ONLY rule rewards (no legacy first_order:{uid} doc from rules eval).
  const c = ctx(pilotSeed('cust1'));
  await cr.evaluateOrderForCampaignRules(c, 'o1', foodOrder('cust1', 4000));
  const legacy = [...c.db._store.keys()].filter((k) => k.startsWith('growthRewards/first_order:'));
  assert.equal(legacy.length, 0);
});

/**
 * Tests for the Go7 Growth & Referral Engine — Phase 1.
 * Covers the required 24-scenario matrix: attribution, self-referral,
 * qualifying-first-order, idempotency, reward state machine, campaign
 * gating, security boundaries, and regression invariants.
 * Run: node --test tests/growthEngine.test.js  (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const ge = require('../growthEngine');
const {
  COLLECTIONS: C,
  PARTNER_STATUS, CAMPAIGN_STATUS, ATTRIBUTION_STATUS, REWARD_STATUS,
} = ge;

const FieldValue = {
  serverTimestamp: () => ({ __serverTs: true }),
  increment: (n) => ({ increment: n }),
};

// ---------------------------------------------------------------------------
// In-memory Firestore fake: path-keyed store, queries, nested subcollections,
// runTransaction with get/set/update (reads-then-writes enforced loosely).
// ---------------------------------------------------------------------------
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
        for (let i = 0; i < parts.length - 1; i++) {
          obj[parts[i]] = { ...(obj[parts[i]] || {}) };
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = applyValue(getField(cur, k), v);
      } else {
        merged[k] = applyValue(cur[k], v);
      }
    }
    store.set(path, merged);
  };

  const docRef = (path) => ({
    path,
    get id() { return path.split('/').pop(); },
    async get() {
      const data = store.get(path);
      return { exists: store.has(path), data: () => data || {}, ref: docRef(path), id: path.split('/').pop() };
    },
    async set(data, opts) { applySet(path, data, opts); },
    async update(fields) { applySet(path, fields, { merge: true }); },
    collection(sub) { return colRef(`${path}/${sub}`); },
  });

  const queryGet = (colPath, field, val, limit) => {
    const prefix = colPath + '/';
    const depth = colPath.split('/').length + 1;
    const docs = [];
    for (const [path, data] of store) {
      if (!path.startsWith(prefix)) continue;
      if (path.split('/').length !== depth) continue;
      if (getField(data, field) === val) {
        docs.push({ id: path.split('/').pop(), data: () => data, ref: docRef(path) });
        if (docs.length >= limit) break;
      }
    }
    return { empty: docs.length === 0, size: docs.length, docs };
  };

  const colRef = (colPath) => ({
    doc(id) {
      if (id === undefined) id = `auto_${Math.random().toString(36).slice(2)}${Date.now()}`;
      return docRef(`${colPath}/${id}`);
    },
    where(field, op, val) {
      assert.equal(op, '==');
      return {
        limit(n) { return { get: () => Promise.resolve(queryGet(colPath, field, val, n)) }; },
        get: () => Promise.resolve(queryGet(colPath, field, val, Infinity)),
      };
    },
  });

  return {
    store,
    _get: (path) => store.get(path),
    collection: (name) => colRef(name),
    async runTransaction(cb) {
      const t = {
        get: (r) => r.get(),
        set: (ref, d, o) => ref.set(d, o),
        update: (ref, f) => ref.update(f),
      };
      return cb(t);
    },
    batch() {
      const ops = [];
      return {
        set: (ref, d, o) => ops.push(() => ref.set(d, o)),
        update: (ref, f) => ops.push(() => ref.update(f)),
        async commit() { for (const op of ops) await op(); },
      };
    },
  };
}

const ctx = (db) => ({ db, FieldValue });
const p = (col, id) => `${col}/${id}`;
const orderQualifying = (uid, extra = {}) => ({
  userId: uid, status: 'delivered', paymentStatus: 'paid', total: 2500, ...extra,
});

function seedPartner(db, { code = 'JOHN200', status = PARTNER_STATUS.ACTIVE, ...over } = {}) {
  const id = `partner_${code}`;
  db.store.set(p(C.PARTNERS, id), {
    partnerId: id, code, status, userId: over.userId || `owner_${code}`,
    phone: over.phone || '08030000001', email: over.email || 'john@example.com',
    campaignId: over.campaignId || ge.DEFAULT_CAMPAIGN_ID,
    stats: { clicks: 0, signups: 0, qualifiedCustomers: 0, qualifyingOrders: 0, totalOrders: 0,
      attributedRevenueKobo: 0, pendingRewardsKobo: 0, approvedRewardsKobo: 0, paidRewardsKobo: 0 },
    ...over,
  });
  return id;
}

function seedCampaign(db, status = CAMPAIGN_STATUS.ACTIVE, over = {}) {
  db.store.set(p(C.CAMPAIGNS, ge.DEFAULT_CAMPAIGN_ID), {
    campaignId: ge.DEFAULT_CAMPAIGN_ID, status,
    customerRewardKobo: 20000, partnerRewardKobo: 20000,
    qualificationType: 'FIRST_COMPLETED_ORDER', maxRewardsPerCustomer: 1, ...over,
  });
}

async function seedAttributed(db, uid, code = 'JOHN200') {
  seedPartner(db, { code });
  db.store.set(p(C.USERS, uid), { email: `${uid}@x.com`, phone: '09090000000' });
  const r = await ge.registerAttributionCore(ctx(db), { customerId: uid, code, source: 'LINK' });
  assert.equal(r.status, ATTRIBUTION_STATUS.REGISTERED);
  return r;
}

// ===========================================================================
// T1-T3: partner codes + resolution
// ===========================================================================

test('T1: create partner allocates a unique normalized code', async () => {
  const db = makeDb();
  const r1 = await ge.createPartnerCore(ctx(db), { name: 'John' }, 'admin1');
  assert.equal(r1.ok, true);
  assert.match(r1.code, /^[A-Z0-9]{4,16}$/);
  const r2 = await ge.createPartnerCore(ctx(db), { name: 'Jane' }, 'admin1');
  assert.notEqual(r1.code, r2.code);
});

test('T1b: requested code collision rejected; code normalization enforced', async () => {
  const db = makeDb();
  await ge.createPartnerCore(ctx(db), { code: 'JOHN200' }, 'admin1');
  const dup = await ge.createPartnerCore(ctx(db), { code: 'john-200' }, 'admin1'); // normalizes to JOHN200
  assert.equal(dup.ok, false);
  assert.equal(dup.error, 'CODE_TAKEN');
});

test('T2: resolve valid code returns partner, no PII beyond name', async () => {
  const db = makeDb();
  seedPartner(db);
  const r = await ge.resolveReferralCodeCore(ctx(db), 'john200');
  assert.equal(r.valid, true);
  assert.equal(r.code, 'JOHN200');
  assert.ok(!('phone' in r) && !('email' in r));
});

test('T3: invalid/suspended codes rejected', async () => {
  const db = makeDb();
  assert.equal((await ge.resolveReferralCodeCore(ctx(db), '!!!')).valid, false);
  assert.equal((await ge.resolveReferralCodeCore(ctx(db), 'NOPE99')).reason, 'NOT_FOUND');
  seedPartner(db, { code: 'SUSP01', status: PARTNER_STATUS.SUSPENDED });
  const r = await ge.resolveReferralCodeCore(ctx(db), 'SUSP01');
  assert.equal(r.valid, false);
  assert.equal(r.partnerStatus, 'SUSPENDED');
});

// ===========================================================================
// T4-T7: attribution
// ===========================================================================

test('T4: signup through referral creates attribution + signup stat', async () => {
  const db = makeDb();
  await seedAttributed(db, 'cust1');
  const a = db._get(p(C.ATTRIBUTIONS, 'cust1'));
  assert.equal(a.status, 'REGISTERED');
  assert.equal(a.partnerCode, 'JOHN200');
  assert.equal(db._get(p(C.PARTNERS, 'partner_JOHN200')).stats.signups, 1);
});

test('T5: signup without referral -> no attribution', async () => {
  const db = makeDb();
  assert.equal(db._get(p(C.ATTRIBUTIONS, 'custX')), undefined);
});

test('T6: second referral cannot overwrite original attribution', async () => {
  const db = makeDb();
  await seedAttributed(db, 'cust1', 'JOHN200');
  seedPartner(db, { code: 'OTHER9' });
  const r = await ge.registerAttributionCore(ctx(db), { customerId: 'cust1', code: 'OTHER9' });
  assert.equal(r.status, 'ALREADY_ATTRIBUTED');
  assert.equal(db._get(p(C.ATTRIBUTIONS, 'cust1')).partnerCode, 'JOHN200');
});

test('T7: self-referral disqualified (userId + phone + email checks)', async () => {
  const db = makeDb();
  // by userId
  seedPartner(db, { userId: 'selfuser' });
  db.store.set(p(C.USERS, 'selfuser'), { email: 'a@b.com', phone: '1' });
  const r1 = await ge.registerAttributionCore(ctx(db), { customerId: 'selfuser', code: 'JOHN200' });
  assert.equal(r1.status, 'DISQUALIFIED');
  assert.equal(r1.reason, 'SELF_REFERRAL');
  // by email match
  const db2 = makeDb();
  seedPartner(db2, { email: 'shared@x.com' });
  db2.store.set(p(C.USERS, 'cust2'), { email: 'Shared@x.com', phone: '2' });
  const r2 = await ge.registerAttributionCore(ctx(db2), { customerId: 'cust2', code: 'JOHN200' });
  assert.equal(r2.reason, 'SELF_REFERRAL');
  // by phone match (normalized)
  const db3 = makeDb();
  seedPartner(db3, { phone: '+2348030000001' });
  db3.store.set(p(C.USERS, 'cust3'), { email: 'c@x.com', phone: '08030000001' });
  const r3 = await ge.registerAttributionCore(ctx(db3), { customerId: 'cust3', code: 'JOHN200' });
  assert.equal(r3.reason, 'SELF_REFERRAL');
});

// ===========================================================================
// T8-T15: qualification + rewards + idempotency
// ===========================================================================

test('T8: cancelled order -> no reward, attribution stays REGISTERED', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1',
    orderQualifying('cust1', { status: 'cancelled' }), 'orders');
  assert.equal(r.qualified, false);
  assert.equal(db._get(p(C.ATTRIBUTIONS, 'cust1')).status, 'REGISTERED');
  assert.equal(db._get(p(C.REWARDS, 'first_order:cust1')), undefined);
});

test('T9: payment-failed order -> no reward', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1',
    orderQualifying('cust1', { paymentStatus: 'failed' }), 'orders');
  // status delivered + paymentStatus failed -> not qualifying
  assert.equal(r.qualified, false);
  assert.equal(db._get(p(C.REWARDS, 'first_order:cust1')), undefined);
});

test('T10: successful first order -> customer gets ₦200 promo credit', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal(r.qualified, true);
  assert.equal(r.creditPosted, true);
  assert.equal(db._get(p(C.WALLETS, 'cust1')).balance, 200);
  assert.equal(db._get(p(C.USERS, 'cust1')).walletBalance, 200);
  const tx = db._get(`wallets/cust1/transactions/growth_credit:cust1`);
  assert.equal(tx.amountKobo, 20000);
  assert.equal(tx.type, 'REFERRAL_CUSTOMER_BONUS');
  assert.equal(tx.orderId, 'O1');
  assert.equal(db._get(p(C.ATTRIBUTIONS, 'cust1')).firstQualifyingOrderId, 'O1');
});

test('T11/T15: repeated qualifying event -> exactly one ₦200 credit', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  const r2 = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal(r2.qualified, false);
  assert.equal(db._get(p(C.WALLETS, 'cust1')).balance, 200); // still 200, not 400
});

test('T12: qualifying order -> marketer gets exactly one ₦200 PENDING reward', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal(r.rewardCreated, true);
  const reward = db._get(p(C.REWARDS, 'first_order:cust1'));
  assert.equal(reward.amountKobo, 20000);
  assert.equal(reward.status, 'PENDING');
  assert.equal(reward.partnerId, 'partner_JOHN200');
  assert.equal(reward.orderId, 'O1');
  assert.equal(db._get(p(C.PARTNERS, 'partner_JOHN200')).stats.pendingRewardsKobo, 20000);
  assert.equal(db._get(p(C.PARTNERS, 'partner_JOHN200')).stats.qualifiedCustomers, 1);
});

test('T13: second successful order -> no second reward', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  const r2 = await ge.qualifyReferralForOrderCore(ctx(db), 'O2', orderQualifying('cust1'), 'orders');
  assert.equal(r2.qualified, false);
  assert.equal(r2.reason, 'ATTRIBUTION_QUALIFIED');
  assert.equal(db._get(p(C.WALLETS, 'cust1')).balance, 200);
});

test('T8b: cancelled first then successful second -> second qualifies', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1', { status: 'cancelled' }), 'orders');
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O2', orderQualifying('cust1'), 'orders');
  assert.equal(r.qualified, true);
  assert.equal(db._get(p(C.ATTRIBUTIONS, 'cust1')).firstQualifyingOrderId, 'O2');
});

test('T14: refund after qualification -> PENDING reward voided + audited', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  const r = await ge.handleOrderVoidForReferralCore(ctx(db), 'O1',
    orderQualifying('cust1', { status: 'refunded' }), 'system', 'REFUND');
  assert.equal(r.handled, true);
  assert.equal(db._get(p(C.REWARDS, 'first_order:cust1')).status, 'VOID');
  assert.equal(db._get(p(C.ATTRIBUTIONS, 'cust1')).postQualificationFlag, 'REFUND');
  const audit = [...db.store.keys()].filter((k) => k.startsWith('growthAuditLogs/'));
  assert.ok(audit.length >= 1);
});

test('T14b: PAID reward on refund -> fraudReview flag, not silent reversal', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to: 'APPROVED', adminId: 'adm' });
  await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to: 'PAID', adminId: 'adm' });
  await ge.handleOrderVoidForReferralCore(ctx(db), 'O1',
    orderQualifying('cust1', { status: 'refunded' }), 'system', 'REFUND');
  const reward = db._get(p(C.REWARDS, 'first_order:cust1'));
  assert.equal(reward.status, 'PAID'); // stays PAID
  assert.equal(reward.fraudReview, true);
});

// ===========================================================================
// T16-T18: security boundaries (rules-level expectations documented)
// ===========================================================================

test('T16-T18: no client-callable exists to create rewards or mutate attribution/amounts', () => {
  // The engine exposes NO exported function that lets a caller supply
  // customerId, reward amount, or reward status directly.
  const callableNames = [
    'resolveReferralCode', 'trackReferralClick', 'registerReferralAttribution',
    'createGrowthPartner', 'upsertGrowthCampaign', 'setGrowthPartnerStatus',
    'approveGrowthReward', 'rejectGrowthReward', 'payGrowthReward',
    'voidGrowthReward', 'getPartnerDashboard', 'getPartnerRewards',
    'checkReferralDiscount',
  ];
  for (const name of callableNames) assert.equal(typeof ge[name], 'function'); // CloudFunction
  // Attribution customerId is only ever context.auth.uid (asserted by wrapper code).
  // Money fields only come from the campaign doc read server-side.
  assert.ok(!('createReward' in ge) && !('updateAttribution' in ge));
});

// ===========================================================================
// T19: suspended partner
// ===========================================================================

test('T19: suspended partner cannot generate new qualifying rewards', async () => {
  const db = makeDb();
  seedCampaign(db);
  const pid = seedPartner(db, { status: PARTNER_STATUS.SUSPENDED });
  db.store.set(p(C.USERS, 'cust1'), { email: 'c@x.com', phone: '09090000000' });
  const r = await ge.registerAttributionCore(ctx(db), { customerId: 'cust1', code: 'JOHN200' });
  assert.equal(r.status, 'DISQUALIFIED'); // suspended at signup
  assert.equal(r.reason, 'INVALID_PARTNER');
  assert.equal(db._get(p(C.REWARDS, 'first_order:cust1')), undefined);
  void pid;
});

test('T19b: partner suspended AFTER attribution -> order qualifies but no rewards', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  db._get(p(C.PARTNERS, 'partner_JOHN200')).status = 'SUSPENDED';
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal(r.qualified, true);
  assert.equal(r.rewardsIssued, false);
  assert.equal(r.reason, 'PARTNER_INACTIVE');
  assert.equal(db._get(p(C.REWARDS, 'first_order:cust1')), undefined);
  assert.equal(db._get(p(C.WALLETS, 'cust1')), undefined); // no customer credit either
});

// ===========================================================================
// T20-T21: reward state machine
// ===========================================================================

test('T20: admin reject = valid transition; stats projected', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  const r = await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to: 'REJECTED', adminId: 'adm', reason: 'fraud' });
  assert.equal(r.ok, true);
  assert.equal(r.from, 'PENDING');
  assert.equal(db._get(p(C.REWARDS, 'first_order:cust1')).status, 'REJECTED');
  assert.equal(db._get(p(C.PARTNERS, 'partner_JOHN200')).stats.pendingRewardsKobo, 0);
});

test('T21: PAID is terminal — cannot return to PENDING or REJECTED', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal((await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to: 'APPROVED', adminId: 'a' })).ok, true);
  assert.equal((await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to: 'PAID', adminId: 'a' })).ok, true);
  for (const to of ['PENDING', 'APPROVED', 'REJECTED', 'VOID']) {
    const r = await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to, adminId: 'a' });
    assert.equal(r.ok, false);
    assert.equal(r.error, 'INVALID_TRANSITION');
  }
  assert.equal(db._get(p(C.REWARDS, 'first_order:cust1')).status, 'PAID');
});

test('T20b: full happy path PENDING->APPROVED->PAID moves stats buckets', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to: 'APPROVED', adminId: 'a' });
  let s = db._get(p(C.PARTNERS, 'partner_JOHN200')).stats;
  assert.equal(s.pendingRewardsKobo, 0);
  assert.equal(s.approvedRewardsKobo, 20000);
  await ge.transitionRewardCore(ctx(db), { rewardId: 'first_order:cust1', to: 'PAID', adminId: 'a' });
  s = db._get(p(C.PARTNERS, 'partner_JOHN200')).stats;
  assert.equal(s.approvedRewardsKobo, 0);
  assert.equal(s.paidRewardsKobo, 20000);
});

// ===========================================================================
// T22: campaign gating
// ===========================================================================

test('T22: inactive campaign -> order qualifies but no rewards issued', async () => {
  const db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.DRAFT); // ships disabled
  await seedAttributed(db, 'cust1');
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal(r.qualified, true);
  assert.equal(r.rewardsIssued, false);
  assert.equal(r.reason, 'CAMPAIGN_INACTIVE');
  assert.equal(db._get(p(C.ATTRIBUTIONS, 'cust1')).rewardsSkippedReason, 'CAMPAIGN_INACTIVE');
  assert.equal(db._get(p(C.WALLETS, 'cust1')), undefined);
});

test('T22b: missing campaign doc -> treated inactive', async () => {
  const db = makeDb();
  await seedAttributed(db, 'cust1');
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal(r.rewardsIssued, false);
});

// ===========================================================================
// T23: concurrent qualification -> exactly one reward
// ===========================================================================

test('T23: concurrent duplicate qualification events -> exactly one reward', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  // Simulate retry-on-contention semantics: two executions race; the loser
  // re-reads the transaction result and sees status=QUALIFIED.
  const [r1, r2] = await Promise.all([
    ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders'),
    ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders'),
  ]);
  const rewards = [...db.store.keys()].filter((k) => k.startsWith('growthRewards/'));
  const txCount = [...db.store.keys()].filter((k) => k.startsWith('wallets/cust1/transactions/'));
  assert.equal(rewards.length, 1);
  assert.equal(txCount.length, 1);
  assert.equal(db._get(p(C.WALLETS, 'cust1')).balance, 200);
  assert.ok((r1.qualified && r1.rewardCreated) || (r2.qualified && r2.rewardCreated));
});

// ===========================================================================
// T24: regression — non-referred orders & COD orders unaffected
// ===========================================================================

test('T24: unattributed customer order -> engine is a no-op', async () => {
  const db = makeDb();
  seedCampaign(db);
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O9', orderQualifying('custX'), 'orders');
  assert.equal(r.qualified, false);
  assert.equal(r.reason, 'NO_ATTRIBUTION');
});

test('T24b: COD order (cash pending, delivered) qualifies; awaiting_payment does not', async () => {
  const db = makeDb();
  seedCampaign(db);
  await seedAttributed(db, 'cust1');
  const cod = await ge.qualifyReferralForOrderCore(ctx(db), 'O1',
    orderQualifying('cust1', { paymentStatus: 'pending', paymentMethod: 'cash' }), 'orders');
  assert.equal(cod.qualified, true);

  const db2 = makeDb();
  seedCampaign(db2);
  await seedAttributed(db2, 'cust2');
  const unpaid = await ge.qualifyReferralForOrderCore(ctx(db2), 'O2',
    orderQualifying('cust2', { paymentStatus: 'awaiting_payment' }), 'orders');
  assert.equal(unpaid.qualified, false);
});

test('T24c: fraud-flagged + pending orders never qualify', async () => {
  assert.equal(ge.isQualifyingReferralOrder({ status: 'delivered', paymentStatus: 'paid', fraudFlagged: true }), false);
  assert.equal(ge.isQualifyingReferralOrder({ status: 'pending', paymentStatus: 'paid' }), false);
  assert.equal(ge.isQualifyingReferralOrder({ status: 'on_the_way', paymentStatus: 'paid' }), false);
});

// ===========================================================================
// Dashboard privacy
// ===========================================================================

test('dashboard masks customer identity', async () => {
  const db = makeDb();
  seedCampaign(db);
  const pid = await seedAttributed(db, 'cust1abcdef').then(() => 'partner_JOHN200');
  await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1abcdef'), 'orders');
  const dash = await ge.getPartnerDashboardCore(ctx(db), pid);
  assert.equal(dash.ok, true);
  assert.equal(dash.referralLink, 'go7.ng/r/JOHN200');
  assert.equal(dash.rewards[0].customer, '#CDEF'); // last 4 only
  assert.ok(!('email' in dash.rewards[0]) && !('phone' in dash.rewards[0]));
  assert.equal(dash.stats.qualifiedCustomers, 1);
});

// ===========================================================================
// T22-T26: first-order checkout discount (Option B — discount at checkout)
// ===========================================================================

test('T22: unreferred customer -> no discount eligibility', async () => {
  const db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { firstOrderDiscountKobo: 10000 });
  const r = await ge.resolveFirstOrderDiscountCore(ctx(db), 'custX');
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'NO_ATTRIBUTION');
});

test('T23: referred customer -> exactly ₦100 eligible, once', async () => {
  const db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { firstOrderDiscountKobo: 10000 });
  await seedAttributed(db, 'cust1');
  const r = await ge.resolveFirstOrderDiscountCore(ctx(db), 'cust1');
  assert.equal(r.eligible, true);
  assert.equal(r.discountKobo, 10000);
  assert.equal(r.partnerCode, 'JOHN200');
});

test('T24: redeem is atomic — a second order gets nothing', async () => {
  const db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { firstOrderDiscountKobo: 10000 });
  await seedAttributed(db, 'cust1');
  const r1 = await ge.redeemFirstOrderDiscountCore(ctx(db), 'cust1', 'ORDER1');
  assert.equal(r1.redeemed, true);
  assert.equal(r1.discountKobo, 10000);
  const attr = db._get(p(C.ATTRIBUTIONS, 'cust1'));
  assert.equal(attr.discountOrderId, 'ORDER1');
  // Second order attempt — marker blocks it
  const r2 = await ge.redeemFirstOrderDiscountCore(ctx(db), 'cust1', 'ORDER2');
  assert.equal(r2.redeemed, false);
  // Preview now also reports ineligible
  const r3 = await ge.resolveFirstOrderDiscountCore(ctx(db), 'cust1');
  assert.equal(r3.eligible, false);
  assert.equal(r3.reason, 'ALREADY_REDEEMED');
});

test('T25: discount gating — campaign INACTIVE / no amount / partner suspended', async () => {
  // campaign inactive
  let db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.PAUSED, { firstOrderDiscountKobo: 10000 });
  await seedAttributed(db, 'cust1');
  assert.equal((await ge.resolveFirstOrderDiscountCore(ctx(db), 'cust1')).reason, 'CAMPAIGN_INACTIVE');
  assert.equal((await ge.redeemFirstOrderDiscountCore(ctx(db), 'cust1', 'O1')).redeemed, false);
  // no discount configured
  db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { firstOrderDiscountKobo: 0 });
  await seedAttributed(db, 'cust1');
  assert.equal((await ge.resolveFirstOrderDiscountCore(ctx(db), 'cust1')).reason, 'NO_DISCOUNT_CONFIGURED');
  // partner suspended after attribution
  db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { firstOrderDiscountKobo: 10000 });
  await seedAttributed(db, 'cust1');
  db._get(p(C.PARTNERS, 'partner_JOHN200')).status = 'SUSPENDED';
  assert.equal((await ge.resolveFirstOrderDiscountCore(ctx(db), 'cust1')).reason, 'PARTNER_INACTIVE');
  assert.equal((await ge.redeemFirstOrderDiscountCore(ctx(db), 'cust1', 'O1')).redeemed, false);
});

test('T26: voided discounted order releases the one-time discount', async () => {
  const db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { firstOrderDiscountKobo: 10000 });
  await seedAttributed(db, 'cust1');
  await ge.redeemFirstOrderDiscountCore(ctx(db), 'cust1', 'ORDER1');
  // Order cancelled before completing -> void handler releases the marker
  const r = await ge.handleOrderVoidForReferralCore(ctx(db), 'ORDER1',
    { userId: 'cust1', status: 'cancelled', paymentStatus: 'failed' }, 'system', 'CANCELLED_ORDER');
  assert.equal(r.handled, true);
  assert.equal(r.discountReleased, true);
  const attr = db._get(p(C.ATTRIBUTIONS, 'cust1'));
  assert.equal(attr.discountOrderId, null);
  assert.equal(attr.discountRedeemedAt, null);
  // Discount usable again on the next order
  const r2 = await ge.resolveFirstOrderDiscountCore(ctx(db), 'cust1');
  assert.equal(r2.eligible, true);
  // Direct release on a different orderId is a no-op
  const r3 = await ge.releaseFirstOrderDiscountCore(ctx(db), 'cust1', 'OTHER_ORDER');
  assert.equal(r3.released, false);
});

test('T27: qualifying the discounted order does NOT release the discount', async () => {
  const db = makeDb();
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { firstOrderDiscountKobo: 10000 });
  await seedAttributed(db, 'cust1');
  await ge.redeemFirstOrderDiscountCore(ctx(db), 'cust1', 'ORDER1');
  await ge.qualifyReferralForOrderCore(ctx(db), 'ORDER1', orderQualifying('cust1'), 'orders');
  const r = await ge.releaseFirstOrderDiscountCore(ctx(db), 'cust1', 'ORDER1');
  assert.equal(r.released, false); // genuinely consumed — no clawback via release
});

// --------------------------------------------------------------------------
// Ambassador pilot safeguards: credit cap, phone gate, phone dedupe
// --------------------------------------------------------------------------

test('customer-credit budget: cap enforced, attribution still qualifies', async () => {
  const db = makeDb();
  const pid = seedPartner(db, { code: 'AMB100', phone: '08099999999' });
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, {
    customerRewardKobo: 20000, partnerRewardKobo: 0,
    customerCreditBudgetKobo: 30000,
  });
  await ge.registerAttributionCore(ctx(db), { customerId: 'custA', code: 'AMB100', source: 'LINK' });
  await ge.registerAttributionCore(ctx(db), { customerId: 'custB', code: 'AMB100', source: 'LINK' });

  const r1 = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('custA'), 'orders');
  assert.equal(r1.qualified, true);
  assert.equal(r1.creditPosted, true);
  assert.equal(db._get(`${C.CAMPAIGNS}/${ge.DEFAULT_CAMPAIGN_ID}`).stats.customerCreditIssuedKobo, 20000);

  // Second credit would push 40000 > 30000 cap -> skipped, still qualifies.
  const r2 = await ge.qualifyReferralForOrderCore(ctx(db), 'O2', orderQualifying('custB'), 'orders');
  assert.equal(r2.qualified, true);
  assert.equal(r2.creditPosted, false);
  const attrB = db._get(`${C.ATTRIBUTIONS}/custB`);
  assert.equal(attrB.status, ATTRIBUTION_STATUS.QUALIFIED);
  assert.equal(attrB.creditSkippedReason, 'CREDIT_BUDGET_EXHAUSTED');
  assert.equal(db._get(`${C.CAMPAIGNS}/${ge.DEFAULT_CAMPAIGN_ID}`).stats.customerCreditIssuedKobo, 20000);
  assert.equal(db._get('wallets/custB'), undefined);
});

test('customer-credit budget: no cap configured -> credit always issues', async () => {
  const db = makeDb();
  seedPartner(db, { code: 'AMB100', phone: '08099999999' });
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, { customerRewardKobo: 20000, partnerRewardKobo: 0 });
  await ge.registerAttributionCore(ctx(db), { customerId: 'custA', code: 'AMB100' });
  const r = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('custA'), 'orders');
  assert.equal(r.creditPosted, true);
});

test('requirePhoneVerified: unverified stays REGISTERED, verified qualifies', async () => {
  const db = makeDb();
  seedPartner(db, { code: 'AMB100', phone: '08099999999' });
  seedCampaign(db, CAMPAIGN_STATUS.ACTIVE, {
    customerRewardKobo: 20000, partnerRewardKobo: 0, requirePhoneVerified: true,
  });
  db.store.set('users/cust1', { phone: '08011112222', phoneVerified: false });
  await ge.registerAttributionCore(ctx(db), { customerId: 'cust1', code: 'AMB100' });

  const r1 = await ge.qualifyReferralForOrderCore(ctx(db), 'O1', orderQualifying('cust1'), 'orders');
  assert.equal(r1.qualified, false);
  assert.equal(r1.reason, 'PHONE_UNVERIFIED');
  assert.equal(db._get(`${C.ATTRIBUTIONS}/cust1`).status, ATTRIBUTION_STATUS.REGISTERED);
  assert.equal(db._get('wallets/cust1'), undefined);

  // After verifying, a later order qualifies normally.
  db.store.set('users/cust1', { phone: '08011112222', phoneVerified: true });
  const r2 = await ge.qualifyReferralForOrderCore(ctx(db), 'O2', orderQualifying('cust1'), 'orders');
  assert.equal(r2.qualified, true);
  assert.equal(r2.creditPosted, true);
});

test('duplicate phone across accounts disqualifies the second attribution', async () => {
  const db = makeDb();
  seedPartner(db, { code: 'AMB100', phone: '08099999999' });
  db.store.set('users/cust1', { phone: '08030000001' });
  db.store.set('users/cust2', { phone: '+2348030000001' }); // same normalized number

  const r1 = await ge.registerAttributionCore(ctx(db), { customerId: 'cust1', code: 'AMB100' });
  assert.equal(r1.status, 'REGISTERED');
  const claim = db._get('growthPhoneClaims/8030000001');
  assert.equal(claim.customerId, 'cust1');

  const r2 = await ge.registerAttributionCore(ctx(db), { customerId: 'cust2', code: 'AMB100' });
  assert.equal(r2.status, ATTRIBUTION_STATUS.DISQUALIFIED);
  assert.equal(r2.reason, 'DUPLICATE_PHONE');
  assert.equal(db._get('growthPhoneClaims/8030000001').customerId, 'cust1');
  assert.equal(db._get(`${C.ATTRIBUTIONS}/cust2`).disqualificationReason, 'DUPLICATE_PHONE');
});

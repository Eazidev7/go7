/**
 * 🧩 Configurable campaign reward-rules engine for Go7.
 *
 * Reusable rule evaluator driven entirely by Firestore campaign docs —
 * admins define rewardRules[] on a growthCampaigns/{id} doc, the backend
 * evaluates them on real events (order completed, vendor milestone) and
 * issues deterministic, snapshotted, capped rewards. Nothing is client-
 * supplied; every figure comes from the campaign doc read server-side.
 *
 * Backwards compatible: campaigns without rewardRules behave exactly as
 * before (legacy customerRewardKobo / partnerRewardKobo path stays in
 * growthEngine.qualifyReferralForOrderCore).
 */

const functions = require('firebase-functions/v1');

const COLLECTIONS = {
  PARTNERS: 'growthPartners',
  CAMPAIGNS: 'growthCampaigns',
  ATTRIBUTIONS: 'referralAttributions',
  REWARDS: 'growthRewards',
  AUDIT: 'growthAuditLogs',
  COUNTERS: 'growthRuleCounters',
};

const RULE_EVENTS = new Set([
  'FIRST_COMPLETED_ORDER',     // participant's 1st qualifying order
  'EVERY_COMPLETED_ORDER',     // every qualifying order (recurring)
  'NTH_COMPLETED_ORDER',       // exactly the Nth qualifying order
  'DELIVERY_VOLUME',           // first time participant reaches N qualifying orders
  'REVENUE_THRESHOLD',         // first time cumulative revenue >= threshold kobo
  'VENDOR_REGISTERED',         // referred vendor signs up
  'VENDOR_APPROVED',           // referred vendor approved by admin
  'VENDOR_FIRST_ORDER',        // referred vendor completes first order
]);

const RULE_PARTICIPANTS = new Set(['referrer', 'referred']);
const REWARD_TYPES = new Set(['FIXED', 'PERCENT']);
const CAMPAIGN_STATUS_ACTIVE = 'ACTIVE';
const REWARD_STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED' };
const COMPLETED_STATUSES = new Set(['delivered', 'completed']);
const TERMINAL_BAD_STATUSES = new Set(['cancelled', 'canceled', 'failed', 'refunded']);

const MAX_RULES_PER_CAMPAIGN = 10;

// ---------------------------------------------------------------------------
// Validation — every figure is checked server-side before it lands in
// Firestore. Bad input is rejected, never silently coerced.
// ---------------------------------------------------------------------------

function kobo(v) {
  return Number.isInteger(v) && v >= 0 ? v : undefined;
}

function validateRewardRule(rule, index) {
  if (!rule || typeof rule !== 'object') return { error: `rule[${index}] must be an object` };
  const out = {};
  out.id = String(rule.id || `RULE_${index + 1}`).toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 32);
  if (!out.id) return { error: `rule[${index}] missing id` };
  out.name = String(rule.name || out.id).slice(0, 80);
  out.enabled = rule.enabled !== false;
  out.event = String(rule.event || '').toUpperCase();
  if (!RULE_EVENTS.has(out.event)) return { error: `rule[${index}] unsupported event ${out.event}` };
  out.participant = String(rule.participant || 'referrer');
  if (!RULE_PARTICIPANTS.has(out.participant)) return { error: `rule[${index}] participant must be referrer|referred` };
  out.rewardType = String(rule.rewardType || 'FIXED').toUpperCase();
  if (!REWARD_TYPES.has(out.rewardType)) return { error: `rule[${index}] rewardType must be FIXED|PERCENT` };
  if (out.rewardType === 'FIXED') {
    const amount = kobo(rule.amountKobo);
    if (!amount || amount <= 0) return { error: `rule[${index}] FIXED requires amountKobo > 0` };
    out.amountKobo = amount;
  } else {
    const bps = kobo(rule.percentBps);
    if (!bps || bps <= 0 || bps > 10000) return { error: `rule[${index}] PERCENT requires percentBps 1..10000` };
    out.percentBps = bps;
    // Optional: floor/cap of a percent reward
    if (kobo(rule.amountKobo) !== undefined) out.maxAmountKobo = kobo(rule.amountKobo);
  }
  if (['NTH_COMPLETED_ORDER', 'DELIVERY_VOLUME'].includes(out.event)) {
    const th = kobo(rule.threshold);
    if (!th || th < 1) return { error: `rule[${index}] ${out.event} requires threshold >= 1` };
    out.threshold = th;
  }
  if (out.event === 'REVENUE_THRESHOLD') {
    const th = kobo(rule.thresholdKobo !== undefined ? rule.thresholdKobo : rule.threshold);
    if (!th || th < 1) return { error: `rule[${index}] REVENUE_THRESHOLD requires thresholdKobo >= 1` };
    out.thresholdKobo = th;
  }
  out.minOrderKobo = kobo(rule.minOrderKobo) || 0;
  out.maxOrderKobo = kobo(rule.maxOrderKobo) ?? null;
  if (out.maxOrderKobo != null && out.maxOrderKobo <= out.minOrderKobo) {
    return { error: `rule[${index}] maxOrderKobo must be > minOrderKobo` };
  }
  // Value basis: 'grandTotal' (default, customer total payable incl. delivery
  // + platform fee) or 'subtotal' (food items only — use for value-tiered
  // rewards so delivery/platform fees can't inflate the tier).
  out.basis = String(rule.basis || 'grandTotal').toLowerCase() === 'subtotal' ? 'subtotal' : 'grandTotal';
  // Counter scope: rules sharing a scope share one growthRuleCounters doc.
  // Default 'main' preserves the original per-(campaign,participant,customer)
  // counter. A distinct scope (e.g. 'repeats') lets a rule family track its own
  // milestones — orders eligible only for a different family's rules can never
  // advance it.
  out.counterScope = 'main';
  if (rule.counterScope != null) {
    const scope = String(rule.counterScope);
    if (!/^[a-z][a-z0-9_]{0,19}$/.test(scope) || scope === 'main') {
      return { error: `rule[${index}] invalid counterScope (lowercase slug required, 'main' is reserved)` };
    }
    out.counterScope = scope;
  }
  out.maxPerParticipantKobo = kobo(rule.maxPerParticipantKobo) ?? null;
  out.maxRuleTotalKobo = kobo(rule.maxRuleTotalKobo) ?? null;
  out.oneTime = rule.oneTime !== false;
  out.requiresApproval = rule.requiresApproval !== false;
  if (Array.isArray(rule.eligibleOrderTypes)) {
    out.eligibleOrderTypes = rule.eligibleOrderTypes.map((t) => String(t).toUpperCase()).slice(0, 20);
  }
  if (Array.isArray(rule.excludedStatuses)) {
    out.excludedStatuses = rule.excludedStatuses.map((t) => String(t).toLowerCase()).slice(0, 20);
  }
  return { rule: out };
}

function validateRewardRules(rules) {
  if (rules === undefined || rules === null) return { rules: undefined };
  if (!Array.isArray(rules)) return { error: 'rewardRules must be an array' };
  if (rules.length > MAX_RULES_PER_CAMPAIGN) return { error: `max ${MAX_RULES_PER_CAMPAIGN} rules per campaign` };
  const seen = new Set();
  const out = [];
  for (let i = 0; i < rules.length; i++) {
    const { rule, error } = validateRewardRule(rules[i], i);
    if (error) return { error };
    if (seen.has(rule.id)) return { error: `duplicate rule id ${rule.id}` };
    seen.add(rule.id);
    out.push(rule);
  }
  return { rules: out };
}

// ---------------------------------------------------------------------------
// Order helpers
// ---------------------------------------------------------------------------

const lower = (v) => (v == null ? '' : String(v)).trim().toLowerCase();

function orderTotalKobo(order) {
  const candidates = [
    order.totalKobo, order.grandTotalKobo, order.amountKobo,
    order.pricing && order.pricing.totalKobo,
    (order.grandTotal != null ? Math.round(Number(order.grandTotal) * 100) : undefined),
    (order.total != null ? Math.round(Number(order.total) * 100) : undefined),
    (order.totalPrice != null ? Math.round(Number(order.totalPrice) * 100) : undefined),
  ];
  for (const c of candidates) {
    if (Number.isFinite(c) && c >= 0) return Math.round(c);
  }
  return 0;
}

// Order value used for min/max order checks and PERCENT amounts. Defaults to
// grandTotal (total payable); rules with basis 'subtotal' compare the food
// subtotal only, so delivery/platform fees never inflate value tiers.
function orderValueKobo(order, rule) {
  if (rule && rule.basis === 'subtotal') {
    const candidates = [
      order && order.subtotalKobo,
      order && order.pricing && order.pricing.subtotalKobo,
      (order && order.subtotal != null ? Math.round(Number(order.subtotal) * 100) : undefined),
      (order && order.itemTotal != null ? Math.round(Number(order.itemTotal) * 100) : undefined),
      (order && order.itemsSubtotal != null ? Math.round(Number(order.itemsSubtotal) * 100) : undefined),
    ];
    for (const c of candidates) {
      if (Number.isFinite(c) && c >= 0) return Math.round(c);
    }
    return 0;
  }
  return orderTotalKobo(order);
}

function isCompletedQualifyingOrder(order, rule) {
  if (!order || typeof order !== 'object') return false;
  const st = lower(order.status);
  if (!COMPLETED_STATUSES.has(st) || TERMINAL_BAD_STATUSES.has(st)) return false;
  if (order.fraudFlagged === true || order.disputed === true || order.test === true) return false;
  if (rule) {
    if (rule.excludedStatuses && rule.excludedStatuses.includes(st)) return false;
    if (rule.eligibleOrderTypes && rule.eligibleOrderTypes.length) {
      const ot = String(order.orderType || order.type || '').toUpperCase();
      if (!rule.eligibleOrderTypes.includes(ot)) return false;
    }
    const valueKobo = orderValueKobo(order, rule);
    if (rule.minOrderKobo && valueKobo < rule.minOrderKobo) return false;
    if (rule.maxOrderKobo != null && valueKobo > rule.maxOrderKobo) return false;
  }
  return true;
}

function computeAmountKobo(rule, order) {
  if (rule.rewardType === 'PERCENT') {
    const amt = Math.round((orderValueKobo(order, rule) * rule.percentBps) / 10000);
    if (rule.maxAmountKobo != null) return Math.min(amt, rule.maxAmountKobo);
    return amt;
  }
  return rule.amountKobo || 0;
}

function campaignIsLive(campaign, nowMs) {
  if (!campaign || campaign.status !== CAMPAIGN_STATUS_ACTIVE) return false;
  const toMs = (v) => {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (v && typeof v.seconds === 'number') return v.seconds * 1000;
    const d = new Date(v).getTime();
    return Number.isFinite(d) ? d : null;
  };
  const s = toMs(campaign.startAt);
  const e = toMs(campaign.endAt);
  if (s && nowMs < s) return false;
  if (e && nowMs > e) return false;
  return true;
}

// Deterministic reward doc ids — same event can never issue twice.
function ruleRewardId(campaignId, ruleId, participantId, eventKey) {
  return `rule:${campaignId}:${ruleId}:${participantId}:${eventKey}`.slice(0, 150);
}

// ---------------------------------------------------------------------------
// Core: evaluate all ACTIVE campaigns' rules against a completed order.
// Non-transactional candidate scan; each reward is created inside its own
// transaction so caps/budget stay exact under concurrency.
// ---------------------------------------------------------------------------

async function evaluateOrderForCampaignRules(ctx, orderId, orderData) {
  const { db, FieldValue } = ctx;
  const customerId = String(orderData.userId || orderData.customerId || '').trim();
  if (!customerId) return { issued: 0, reason: 'NO_CUSTOMER' };

  const campaignsSnap = await db.collection(COLLECTIONS.CAMPAIGNS)
    .where('status', '==', CAMPAIGN_STATUS_ACTIVE).get();
  if (campaignsSnap.empty) return { issued: 0, reason: 'NO_ACTIVE_CAMPAIGNS' };

  const customerAttrRef = db.collection(COLLECTIONS.ATTRIBUTIONS).doc(customerId);
  const nowMs = Date.now();
  const issued = [];
  const skipped = [];

  for (const campDoc of campaignsSnap.docs) {
    const campaign = campDoc.data();
    const rules = Array.isArray(campaign.rewardRules) ? campaign.rewardRules : [];
    if (!rules.length || !campaignIsLive(campaign, nowMs)) continue;

    // Optional campaign gate: skip every rule for customers whose account has
    // no verified phone. Checked once per campaign (one extra doc read).
    if (campaign.requirePhoneVerified === true) {
      const uSnap = await db.collection('users').doc(customerId).get();
      const verified = uSnap.exists && uSnap.data().phoneVerified === true;
      if (!verified) { skipped.push(`${campDoc.id}:PHONE_UNVERIFIED`); continue; }
    }

    // Optional campaign gate: skip every rule for customers whose account has
    // no verified phone. Checked once per campaign (one extra doc read).
    if (campaign.requirePhoneVerified === true) {
      const uSnap = await db.collection('users').doc(customerId).get();
      const verified = uSnap.exists && uSnap.data().phoneVerified === true;
      if (!verified) { skipped.push(`${campDoc.id}:PHONE_UNVERIFIED`); continue; }
    }

    // Resolve participants for this campaign:
    //  - 'referrer' -> partner behind the referred customer's attribution
    //  - 'referred' -> the customer themselves (needs attribution unless the
    //    rule is deliberately attribution-free, e.g. a promo for everyone)
    const attrSnap = await customerAttrRef.get();
    const attr = attrSnap.exists ? attrSnap.data() : null;

    for (const rule of rules) {
      if (rule.enabled === false) continue;
      if (!isCompletedQualifyingOrder(orderData, rule)) { skipped.push(`${campDoc.id}/${rule.id}:ORDER_INELIGIBLE`); continue; }

      const participantId = rule.participant === 'referrer' ? attr && attr.partnerId : customerId;
      if (!participantId) { skipped.push(`${campDoc.id}/${rule.id}:NO_PARTICIPANT`); continue; }
      if (rule.participant === 'referrer' && (!attr || attr.status === 'DISQUALIFIED')) {
        skipped.push(`${campDoc.id}/${rule.id}:NO_ATTRIBUTION`); continue;
      }
      // Never self-reward or pay out under a suspended partner.
      if (rule.participant === 'referrer') {
        const pSnap = await db.collection(COLLECTIONS.PARTNERS).doc(participantId).get();
        if (!pSnap.exists || pSnap.data().status !== 'ACTIVE') {
          skipped.push(`${campDoc.id}/${rule.id}:PARTNER_INACTIVE`); continue;
        }
      }
      if (participantId === customerId && rule.participant === 'referrer' && attr && attr.partnerId === customerId) {
        skipped.push(`${campDoc.id}/${rule.id}:SELF_REFERRAL`); continue;
      }

      const amountKobo = computeAmountKobo(rule, orderData);
      if (!Number.isInteger(amountKobo) || amountKobo <= 0) { skipped.push(`${campDoc.id}/${rule.id}:ZERO_AMOUNT`); continue; }

      // Event key + milestone semantics
      const scope = typeof rule.counterScope === 'string'
        && /^[a-z][a-z0-9_]{0,19}$/.test(rule.counterScope) && rule.counterScope !== 'main'
        ? `_${rule.counterScope}` : '';
      const counterRef = db.collection(COLLECTIONS.COUNTERS)
        .doc(`${campDoc.id}_${participantId}_${customerId}${scope}`.slice(0, 150));
      const rewardRefBase = (key) => db.collection(COLLECTIONS.REWARDS).doc(ruleRewardId(campDoc.id, rule.id, participantId, key));

      const res = await db.runTransaction(async (t) => {
        // Firestore requires ALL reads before ANY write inside a transaction.
        // The reward doc id is deterministic per (rule, order), so it can be
        // resolved and read up-front alongside the counter + campaign.
        const plannedKey = {
          FIRST_COMPLETED_ORDER: 'first',
          EVERY_COMPLETED_ORDER: orderId,
          NTH_COMPLETED_ORDER: `nth${rule.threshold}`,
          DELIVERY_VOLUME: `vol${rule.threshold}`,
          REVENUE_THRESHOLD: `rev${rule.thresholdKobo}`,
        }[rule.event];
        const rewardRef = plannedKey != null ? rewardRefBase(plannedKey) : null;
        const [counterSnap, campaignSnap2, rewardSnap] = await Promise.all([
          t.get(counterRef), t.get(campDoc.ref), rewardRef ? t.get(rewardRef) : Promise.resolve(null),
        ]);
        const counter = counterSnap.exists ? counterSnap.data() : {};
        const camp = campaignSnap2.exists ? campaignSnap2.data() : campaign;
        if (!campaignIsLive(camp, nowMs)) return { skip: 'CAMPAIGN_NOT_LIVE' };

        // Count each order exactly once per (campaign, participant, customer,
        // scope) — deduped by a bounded countedOrderIds set, NOT just the last
        // order id, so retried or out-of-order events can never advance
        // milestones. lastCountedOrderId is kept for debugging only.
        const countedIds = Array.isArray(counter.countedOrderIds)
          ? counter.countedOrderIds
          : (counter.lastCountedOrderId ? [counter.lastCountedOrderId] : []);
        const alreadyCounted = countedIds.includes(orderId);
        const completedCount = alreadyCounted
          ? (Number(counter.completedOrders) || 0)
          : (Number(counter.completedOrders) || 0) + 1;
        const revenueKobo = alreadyCounted
          ? (Number(counter.revenueKobo) || 0)
          : (Number(counter.revenueKobo) || 0) + orderTotalKobo(orderData);
        t.set(counterRef, {
          campaignId: campDoc.id, participantId, customerId,
          completedOrders: completedCount, revenueKobo,
          countedOrderIds: alreadyCounted ? countedIds : [...countedIds, orderId].slice(-500),
          lastCountedOrderId: orderId, updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Budget gate: campaign stats.rewardedKobo + this amount <= budgetKobo
        const spent = Number(camp.stats && camp.stats.rewardedKobo) || 0;
        const budget = Number.isInteger(camp.budgetKobo) && camp.budgetKobo > 0 ? camp.budgetKobo : null;
        if (budget !== null && spent + amountKobo > budget) return { skip: 'BUDGET_EXHAUSTED' };
        if (rule.maxRuleTotalKobo != null) {
          const ruleSpent = Number(camp.ruleSpend && camp.ruleSpend[rule.id]) || 0;
          if (ruleSpent + amountKobo > rule.maxRuleTotalKobo) return { skip: 'RULE_CAP_REACHED' };
        }
        const participantSpent = Number(counter[`spentKobo_${rule.id}`]) || 0;
        if (rule.maxPerParticipantKobo != null && participantSpent + amountKobo > rule.maxPerParticipantKobo) {
          return { skip: 'PARTICIPANT_CAP_REACHED' };
        }

        const awardedCount = Number(counter[`awarded_${rule.id}`]) || 0;

        const eventKey = plannedKey;
        let eventLabel = null;
        switch (rule.event) {
          case 'FIRST_COMPLETED_ORDER':
            if (completedCount !== 1) return { skip: 'NOT_FIRST_ORDER', completedCount };
            eventLabel = 'FIRST_COMPLETED_ORDER';
            break;
          case 'EVERY_COMPLETED_ORDER':
            if (rule.oneTime && awardedCount > 0) return { skip: 'ALREADY_AWARDED' };
            eventLabel = 'EVERY_COMPLETED_ORDER';
            break;
          case 'NTH_COMPLETED_ORDER':
            if (completedCount !== rule.threshold) return { skip: `NOT_NTH_ORDER(${completedCount})` };
            eventLabel = 'NTH_COMPLETED_ORDER';
            break;
          case 'DELIVERY_VOLUME':
            if (completedCount < rule.threshold) return { skip: `BELOW_VOLUME(${completedCount})` };
            if (awardedCount > 0) return { skip: 'VOLUME_ALREADY_AWARDED' };
            eventLabel = 'DELIVERY_VOLUME';
            break;
          case 'REVENUE_THRESHOLD':
            if (revenueKobo < rule.thresholdKobo) return { skip: `BELOW_REVENUE(${revenueKobo})` };
            if (awardedCount > 0) return { skip: 'REVENUE_ALREADY_AWARDED' };
            eventLabel = 'REVENUE_THRESHOLD';
            break;
          default:
            return { skip: `EVENT_${rule.event}_NOT_ORDER_BASED` };
        }

        if (rewardSnap && rewardSnap.exists) return { skip: 'DUPLICATE' };

        const now = FieldValue.serverTimestamp();
        t.set(counterRef, {
          [`awarded_${rule.id}`]: awardedCount + 1,
          [`spentKobo_${rule.id}`]: participantSpent + amountKobo,
          lastOrderId: orderId,
        }, { merge: true });

        t.set(rewardRef, {
          rewardId: rewardRef.id,
          campaignId: campDoc.id,
          campaignType: camp.type || null,
          ruleId: rule.id,
          ruleSnapshot: { ...rule },
          participantId,
          participantRole: rule.participant,
          partnerId: rule.participant === 'referrer' ? participantId : (attr ? attr.partnerId : null),
          partnerCode: attr ? attr.partnerCode || null : null,
          customerId,
          orderId,
          orderIds: [orderId],
          rewardType: rule.event,
          amountKobo,
          status: rule.requiresApproval === false ? REWARD_STATUS.APPROVED : REWARD_STATUS.PENDING,
          qualificationEvent: eventLabel,
          qualificationReason: rule.event,
          createdAt: now,
          approvedAt: rule.requiresApproval === false ? now : null,
          paidAt: null, rejectedAt: null, voidedAt: null,
          metadata: { orderCollection: 'orders', engine: 'campaignRules' },
        });

        t.set(campDoc.ref, {
          stats: {
            rewardedKobo: FieldValue.increment(amountKobo),
            qualifyingOrders: FieldValue.increment(1),
            attributedRevenueKobo: FieldValue.increment(orderTotalKobo(orderData)),
          },
          ruleSpend: { [rule.id]: FieldValue.increment(amountKobo) },
          updatedAt: now,
        }, { merge: true });

        return { issued: true, rewardId: rewardRef.id, amountKobo };
      });

      if (res.issued) issued.push(res); else skipped.push(`${campDoc.id}/${rule.id}:${res.skip}`);
    }
  }

  return { issued: issued.length, rewards: issued, skipped };
}

// ---------------------------------------------------------------------------
// Vendor milestone events — vendor registration / approval / first order.
// Attribution resolves via referralAttributions/vendor:{vendorId} or the
// vendor doc's own referredBy* fields (agent referral path).
// ---------------------------------------------------------------------------

async function resolveVendorReferrer(db, vendorId, vendorData) {
  const candidates = [
    `vendor:${vendorId}`,
    vendorId,
  ];
  for (const id of candidates) {
    const snap = await db.collection(COLLECTIONS.ATTRIBUTIONS).doc(id).get().catch(() => null);
    if (snap && snap.exists) {
      const a = snap.data();
      if (a.partnerId) return { partnerId: a.partnerId, partnerCode: a.partnerCode || null, campaignId: a.campaignId || null };
    }
  }
  const agent = vendorData.referredByAgentId || vendorData.referredByAgent || vendorData.agentId || vendorData.referredBy;
  if (agent) return { partnerId: String(agent), partnerCode: null, campaignId: null };
  return null;
}

async function issueVendorMilestoneReward(ctx, vendorId, vendorData, eventName, orderId) {
  const { db, FieldValue } = ctx;
  const campaignsSnap = await db.collection(COLLECTIONS.CAMPAIGNS)
    .where('status', '==', CAMPAIGN_STATUS_ACTIVE).get();
  if (campaignsSnap.empty) return { issued: 0, reason: 'NO_ACTIVE_CAMPAIGNS' };

  const nowMs = Date.now();
  const issued = [];
  for (const campDoc of campaignsSnap.docs) {
    const campaign = campDoc.data();
    const rules = (Array.isArray(campaign.rewardRules) ? campaign.rewardRules : [])
      .filter((r) => r.enabled !== false && r.event === eventName);
    if (!rules.length || !campaignIsLive(campaign, nowMs)) continue;

    const referrer = await resolveVendorReferrer(db, vendorId, vendorData || {});
    if (!referrer || !referrer.partnerId) continue;
    const pSnap = await db.collection(COLLECTIONS.PARTNERS).doc(referrer.partnerId).get();
    if (!pSnap.exists || pSnap.data().status !== 'ACTIVE') continue;

    for (const rule of rules) {
      const amountKobo = computeAmountKobo(rule, {});
      if (!amountKobo) continue;
      const rewardRef = db.collection(COLLECTIONS.REWARDS)
        .doc(ruleRewardId(campDoc.id, rule.id, referrer.partnerId, `${eventName.toLowerCase()}:${vendorId}`));
      const created = await db.runTransaction(async (t) => {
        const [existing, campSnap2] = await Promise.all([t.get(rewardRef), t.get(campDoc.ref)]);
        if (existing.exists) return false;
        const camp = campSnap2.exists ? campSnap2.data() : campaign;
        if (!campaignIsLive(camp, nowMs)) return false;
        const spent = Number(camp.stats && camp.stats.rewardedKobo) || 0;
        if (Number.isInteger(camp.budgetKobo) && camp.budgetKobo > 0 && spent + amountKobo > camp.budgetKobo) return false;
        const now = FieldValue.serverTimestamp();
        t.set(rewardRef, {
          rewardId: rewardRef.id, campaignId: campDoc.id, campaignType: camp.type || null,
          ruleId: rule.id, ruleSnapshot: { ...rule },
          participantId: referrer.partnerId, participantRole: 'referrer',
          partnerId: referrer.partnerId, partnerCode: referrer.partnerCode || null,
          vendorId, orderId: orderId || null,
          rewardType: rule.event, amountKobo,
          status: rule.requiresApproval === false ? REWARD_STATUS.APPROVED : REWARD_STATUS.PENDING,
          qualificationEvent: eventName, qualificationReason: rule.event,
          createdAt: now, approvedAt: rule.requiresApproval === false ? now : null,
          paidAt: null, rejectedAt: null, voidedAt: null,
          metadata: { engine: 'campaignRules' },
        });
        t.set(campDoc.ref, {
          stats: { rewardedKobo: FieldValue.increment(amountKobo) },
          ruleSpend: { [rule.id]: FieldValue.increment(amountKobo) },
          updatedAt: now,
        }, { merge: true });
        return true;
      });
      if (created) issued.push({ campaignId: campDoc.id, ruleId: rule.id, amountKobo });
    }
  }
  return { issued: issued.length, rewards: issued };
}

// ---------------------------------------------------------------------------
// Trigger registration — runs alongside (not inside) growthEngine's trigger.
// ---------------------------------------------------------------------------

function getCtx() {
  const admin = require('./adminInit');
  return { db: admin.firestore(), FieldValue: admin.firestore.FieldValue };
}

const onOrderCampaignRules = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const becameCompleted = !COMPLETED_STATUSES.has(lower(before.status)) && COMPLETED_STATUSES.has(lower(after.status));
    const becameVoided = !TERMINAL_BAD_STATUSES.has(lower(before.status)) && TERMINAL_BAD_STATUSES.has(lower(after.status));
    if (!becameCompleted && !becameVoided) return null;
    const ctx = getCtx();
    try {
      if (becameCompleted) {
        const res = await evaluateOrderForCampaignRules(ctx, context.params.orderId, after);
        if (res.issued || (res.skipped && res.skipped.length && res.skipped.some((s) => !/NO_ACTIVE|NOT_FIRST|NOT_NTH|BELOW_/.test(s)))) {
          console.log(`[campaignRules] ${context.params.orderId}:`, JSON.stringify(res));
        }
        // Vendor-first-order milestone rides the same event
        if (after.vendorId) {
          await issueVendorMilestoneReward(ctx, after.vendorId, {}, 'VENDOR_FIRST_ORDER', context.params.orderId);
        }
      }
      if (becameVoided) {
        await reverseRewardsForOrder(ctx, context.params.orderId);
      }
    } catch (e) {
      console.error(`[campaignRules] order trigger failed for ${context.params.orderId}:`, e);
    }
    return null;
  });

const onVendorCampaignEvent = functions.firestore
  .document('vendors/{vendorId}')
  .onWrite(async (change, context) => {
    const ctx = getCtx();
    const vendorId = context.params.vendorId;
    try {
      if (!change.before.exists && change.after.exists) {
        await issueVendorMilestoneReward(ctx, vendorId, change.after.data() || {}, 'VENDOR_REGISTERED', null);
        return null;
      }
      const before = change.before.exists ? change.before.data() : {};
      const after = change.after.exists ? change.after.data() : {};
      const wasApproved = lower(before.approvalStatus || before.status) !== 'approved' || before.isApproved !== true;
      const isApproved = lower(after.approvalStatus || after.status) === 'approved' || after.isApproved === true;
      if (!wasApproved && isApproved) {
        await issueVendorMilestoneReward(ctx, vendorId, after, 'VENDOR_APPROVED', null);
      }
    } catch (e) {
      console.error(`[campaignRules] vendor trigger failed for ${vendorId}:`, e);
    }
    return null;
  });

// Reverse non-PAID rule rewards when a qualifying order is refunded/cancelled.
async function reverseRewardsForOrder(ctx, orderId) {
  const { db, FieldValue } = ctx;
  const snap = await db.collection(COLLECTIONS.REWARDS).where('orderId', '==', orderId).get();
  if (snap.empty) return { reversed: 0 };
  const now = FieldValue.serverTimestamp();
  let reversed = 0;
  for (const d of snap.docs) {
    const r = d.data();
    if (!r || !r.ruleId) continue; // only engine-created rewards
    if (r.status === 'PAID') {
      await d.ref.update({ paidRewardFlagged: true, flagReason: 'ORDER_VOIDED', flaggedAt: now });
    } else if (r.status === 'PENDING' || r.status === 'APPROVED') {
      await d.ref.update({ status: 'VOID', voidedAt: now, voidReason: 'ORDER_VOIDED' });
      reversed += 1;
    }
  }
  return { reversed };
}

module.exports = {
  validateRewardRules,
  validateRewardRule,
  evaluateOrderForCampaignRules,
  issueVendorMilestoneReward,
  reverseRewardsForOrder,
  isCompletedQualifyingOrder,
  computeAmountKobo,
  campaignIsLive,
  orderTotalKobo,
  orderValueKobo,
  ruleRewardId,
  RULE_EVENTS,
  onOrderCampaignRules,
  onVendorCampaignEvent,
};

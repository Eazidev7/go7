/**
 * Go7 Growth & Referral Engine — Phase 1.
 *
 * Server-authoritative referral attribution + qualifying-first-order + reward
 * ledger. Generic campaign/partner model (not hard-coded to TikTok).
 *
 * Design:
 *  - ONE attribution per customer: doc id = customerId in referralAttributions.
 *    Created once via create() inside a transaction; never overwritten.
 *  - ONE reward ledger: growthRewards/{first_order:{customerId}} — deterministic
 *    id makes duplicate qualification events idempotent.
 *  - ONE qualification decision: qualification happens inside a single
 *    transaction that atomically flips attribution status REGISTERED->QUALIFIED.
 *    Only that transaction's winner issues rewards.
 *  - Customer ₦200 credit reuses the canonical wallet ledger
 *    (wallets/{uid}/transactions/{reference}) — deterministic reference id
 *    `growth_credit:{customerId}` gives free idempotency; balances mirror into
 *    users/{uid}.walletBalance exactly like functions/wallet.js.
 *  - Money is integer KOBO internally (20000) — never floats.
 *
 * Pure core functions take injected { db, FieldValue } for unit tests.
 * Callable wrappers + Firestore trigger construct admin lazily (cloud-only),
 * never at module load.
 *
 * NOT deployed automatically — campaign ships status DRAFT until Go7 enables it.
 */
const functions = require('firebase-functions/v1');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLECTIONS = {
  PARTNERS: 'growthPartners',
  CAMPAIGNS: 'growthCampaigns',
  ATTRIBUTIONS: 'referralAttributions',
  REWARDS: 'growthRewards',
  CLICKS: 'growthClicks',
  AUDIT: 'growthAuditLogs',
  WALLETS: 'wallets',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  PHONE_CLAIMS: 'growthPhoneClaims',
};

const PARTNER_STATUS = { PENDING: 'PENDING', ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' };
const CAMPAIGN_STATUS = { DRAFT: 'DRAFT', ACTIVE: 'ACTIVE', PAUSED: 'PAUSED', ENDED: 'ENDED' };
const ATTRIBUTION_STATUS = {
  ATTRIBUTED: 'ATTRIBUTED',
  REGISTERED: 'REGISTERED',
  QUALIFIED: 'QUALIFIED',
  DISQUALIFIED: 'DISQUALIFIED',
};
const REWARD_STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED', PAID: 'PAID', REJECTED: 'REJECTED', VOID: 'VOID' };

// Strict reward state machine — PAID/REJECTED are terminal.
const REWARD_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'VOID'],
};

const DEFAULT_CAMPAIGN_ID = 'REFERRAL_LAUNCH';
const CUSTOMER_CREDIT_TYPE = 'REFERRAL_CUSTOMER_BONUS';

// Safe alphabet — no ambiguous chars (0/O, 1/I/L), uppercase only.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_REGEX = /^[A-Z0-9]{4,16}$/;

// Terminal/invalid order states for qualification.
const TERMINAL_BAD_STATUSES = new Set(['cancelled', 'canceled', 'failed', 'refunded']);
const COMPLETED_STATUSES = new Set(['delivered', 'completed']);
const PAID_STATUSES = new Set(['paid', 'completed', 'pay_on_delivery']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a referral code: trim, uppercase, strip anything non-alphanumeric. */
function normalizePartnerCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return CODE_REGEX.test(code) ? code : null;
}

/** Server-side code generation: safe alphabet, no ambiguous chars. */
function generatePartnerCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `GO7${code}`;
}

function normStr(v) {
  return (v == null ? '' : String(v)).trim();
}

function normPhone(v) {
  return normStr(v).replace(/\D/g, '').replace(/^0+/, '').replace(/^234/, '');
}

function lower(s) {
  return normStr(s).toLowerCase();
}

function statusOf(order) {
  return lower(order && order.status);
}

function customerOf(order) {
  return normStr(order && (order.userId || order.customerId)) || null;
}

/**
 * Authoritative qualification check on an order doc.
 * Requires: completed status + successful/valid payment (paid, pay_on_delivery,
 * or cash-on-delivery completed) + not cancelled/refunded/failed/fraud-flagged.
 */
function isQualifyingReferralOrder(order) {
  if (!order || typeof order !== 'object') return false;
  const st = statusOf(order);
  if (!COMPLETED_STATUSES.has(st)) return false;
  if (TERMINAL_BAD_STATUSES.has(st)) return false;
  if (order.fraudFlagged === true || order.disputed === true) return false;

  const ps = lower(order.paymentStatus);
  const pm = lower(order.paymentMethod || order.payment?.method);
  if (PAID_STATUSES.has(ps)) return true;
  // Cash orders: delivered = cash collected.
  if ((pm === 'cash' || pm === 'cod' || ps === 'pay_on_delivery') && st === 'delivered') return true;
  return false;
}

/** Terminal-void check: order became cancelled/refunded/failed after completion. */
function isVoidedOrder(order) {
  if (!order || typeof order !== 'object') return false;
  return TERMINAL_BAD_STATUSES.has(statusOf(order)) || lower(order.paymentStatus) === 'refunded';
}

function deterministicRewardId(customerId) {
  return `first_order:${customerId}`;
}

function deterministicCreditRef(customerId) {
  return `growth_credit:${customerId}`;
}

// ---------------------------------------------------------------------------
// Core: resolve a referral code (public-safe; returns no PII)
// ---------------------------------------------------------------------------

async function resolveReferralCodeCore(ctx, rawCode) {
  const { db } = ctx;
  const code = normalizePartnerCode(rawCode);
  if (!code) return { valid: false, reason: 'INVALID_FORMAT' };

  const snap = await db.collection(COLLECTIONS.PARTNERS).where('code', '==', code).limit(2).get();
  if (snap.empty) return { valid: false, reason: 'NOT_FOUND' };
  if (snap.size > 1) return { valid: false, reason: 'CODE_COLLISION' };

  const doc = snap.docs[0];
  const p = doc.data();
  if (p.status !== PARTNER_STATUS.ACTIVE) {
    return { valid: false, reason: 'PARTNER_INACTIVE', partnerStatus: p.status };
  }
  return {
    valid: true,
    code,
    partnerId: doc.id,
    partnerName: p.name || null,
    campaignId: p.campaignId || DEFAULT_CAMPAIGN_ID,
  };
}

// ---------------------------------------------------------------------------
// Core: register attribution (one per customer, immutable)
// ---------------------------------------------------------------------------

/**
 * Creates referralAttributions/{customerId} exactly once.
 * customerId always comes from auth — never client input.
 * Returns { status, attributionId, reason? }.
 */
async function registerAttributionCore(ctx, { customerId, code, source, metadata }) {
  const { db } = ctx;
  const FieldValue = ctx.FieldValue;
  const normalized = normalizePartnerCode(code);
  if (!normalized) return { status: 'REJECTED', reason: 'INVALID_FORMAT' };
  if (!customerId) return { status: 'REJECTED', reason: 'NO_CUSTOMER' };

  const attrRef = db.collection(COLLECTIONS.ATTRIBUTIONS).doc(customerId);
  const userRef = db.collection(COLLECTIONS.USERS).doc(customerId);

  return db.runTransaction(async (t) => {
    const existing = await t.get(attrRef);
    if (existing.exists) {
      const d = existing.data();
      return {
        status: 'ALREADY_ATTRIBUTED',
        attributionId: attrRef.id,
        partnerCode: d.partnerCode,
        attributionStatus: d.status,
      };
    }

    const partnerSnap = await t.get(
      db.collection(COLLECTIONS.PARTNERS).where('code', '==', normalized).limit(2)
    );
    if (partnerSnap.empty || partnerSnap.size > 1) {
      return { status: 'REJECTED', reason: partnerSnap.empty ? 'PARTNER_NOT_FOUND' : 'CODE_COLLISION' };
    }
    const partnerDoc = partnerSnap.docs[0];
    const partner = partnerDoc.data();

    const userSnap = await t.get(userRef);
    const user = userSnap.exists ? userSnap.data() : {};

    // Cross-account dedupe: growthPhoneClaims/{normalizedPhone} is claimed by
    // the first customer to register an attribution — a second account using
    // the same number can never earn referral rewards or the customer credit.
    const phoneKey = normPhone(user.phone || user.phoneNumber) || null;
    const claimRef = phoneKey ? db.collection(COLLECTIONS.PHONE_CLAIMS).doc(phoneKey) : null;
    const claimSnap = claimRef ? await t.get(claimRef) : null;

    const now = FieldValue.serverTimestamp();
    const base = {
      partnerId: partnerDoc.id,
      partnerCode: normalized,
      customerId,
      phoneKey,
      source: source || 'MANUAL',
      campaignId: partner.campaignId || DEFAULT_CAMPAIGN_ID,
      attributedAt: now,
      registeredAt: now,
      qualifiedAt: null,
      disqualifiedAt: null,
      disqualificationReason: null,
      firstQualifyingOrderId: null,
      rewardsSkippedReason: null,
      metadata: {
        landingSource: normStr(metadata && metadata.landingSource) || null,
        utmSource: normStr(metadata && metadata.utmSource) || null,
        utmMedium: normStr(metadata && metadata.utmMedium) || null,
        utmCampaign: normStr(metadata && metadata.utmCampaign) || null,
      },
    };

    // Duplicate phone across accounts: another customer already claimed this
    // number — disqualify rather than pay two welcome credits to one person.
    if (claimSnap && claimSnap.exists && claimSnap.data().customerId !== customerId) {
      t.set(attrRef, {
        ...base,
        status: ATTRIBUTION_STATUS.DISQUALIFIED,
        disqualifiedAt: now,
        disqualificationReason: 'DUPLICATE_PHONE',
      });
      return { status: ATTRIBUTION_STATUS.DISQUALIFIED, attributionId: attrRef.id, reason: 'DUPLICATE_PHONE' };
    }

    // Self-referral: same user, or verified phone/email match.
    const self =
      partner.userId === customerId ||
      (normPhone(partner.phone) && normPhone(partner.phone) === normPhone(user.phone || user.phoneNumber)) ||
      (lower(partner.email) && lower(partner.email) === lower(user.email));

    if (self) {
      t.set(attrRef, {
        ...base,
        status: ATTRIBUTION_STATUS.DISQUALIFIED,
        disqualifiedAt: now,
        disqualificationReason: 'SELF_REFERRAL',
      });
      return { status: ATTRIBUTION_STATUS.DISQUALIFIED, attributionId: attrRef.id, reason: 'SELF_REFERRAL' };
    }

    if (partner.status !== PARTNER_STATUS.ACTIVE) {
      t.set(attrRef, {
        ...base,
        status: ATTRIBUTION_STATUS.DISQUALIFIED,
        disqualifiedAt: now,
        disqualificationReason: 'INVALID_PARTNER',
      });
      return { status: ATTRIBUTION_STATUS.DISQUALIFIED, attributionId: attrRef.id, reason: 'INVALID_PARTNER' };
    }

    t.set(attrRef, { ...base, status: ATTRIBUTION_STATUS.REGISTERED });
    if (claimRef) {
      t.set(claimRef, { customerId, attributionId: attrRef.id, createdAt: now });
    }
    t.set(partnerDoc.ref, { stats: { signups: FieldValue.increment(1) }, updatedAt: now }, { merge: true });
    return { status: ATTRIBUTION_STATUS.REGISTERED, attributionId: attrRef.id, partnerId: partnerDoc.id };
  });
}

// ---------------------------------------------------------------------------
// Core: qualify on first completed order + issue rewards (atomic)
// ---------------------------------------------------------------------------

/**
 * One authoritative qualification decision. Runs in a transaction:
 *  1. Read attribution (doc id = customerId). Must be REGISTERED (or ATTRIBUTED).
 *  2. Load campaign. If not ACTIVE -> mark QUALIFIED with rewardsSkippedReason
 *     (order consumed; deterministic, no retro-pay).
 *  3. Credit customer via canonical wallet ledger (idempotent ref).
 *  4. Create growthRewards/first_order:{customerId} PENDING.
 *  5. Increment partner stats.
 * Losing concurrent transactions see status != REGISTERED and exit.
 */
async function qualifyReferralForOrderCore(ctx, orderId, orderData, collectionName) {
  const { db } = ctx;
  const FieldValue = ctx.FieldValue;
  const customerId = customerOf(orderData);
  if (!customerId) return { qualified: false, reason: 'NO_CUSTOMER' };
  if (!isQualifyingReferralOrder(orderData)) return { qualified: false, reason: 'ORDER_NOT_QUALIFYING' };

  const attrRef = db.collection(COLLECTIONS.ATTRIBUTIONS).doc(customerId);
  const rewardRef = db.collection(COLLECTIONS.REWARDS).doc(deterministicRewardId(customerId));
  const walletRef = db.collection(COLLECTIONS.WALLETS).doc(customerId);
  const walletTxRef = walletRef.collection('transactions').doc(deterministicCreditRef(customerId));
  const userRef = db.collection(COLLECTIONS.USERS).doc(customerId);

  return db.runTransaction(async (t) => {
    const attrSnap = await t.get(attrRef);
    if (!attrSnap.exists) return { qualified: false, reason: 'NO_ATTRIBUTION' };
    const attr = attrSnap.data();
    if (attr.status !== ATTRIBUTION_STATUS.REGISTERED && attr.status !== ATTRIBUTION_STATUS.ATTRIBUTED) {
      return { qualified: false, reason: `ATTRIBUTION_${attr.status}`, attributionStatus: attr.status };
    }
    if (attr.firstQualifyingOrderId) {
      return { qualified: false, reason: 'ALREADY_QUALIFIED', orderId: attr.firstQualifyingOrderId };
    }

    const now = FieldValue.serverTimestamp();
    const campaignRef = db.collection(COLLECTIONS.CAMPAIGNS).doc(attr.campaignId || DEFAULT_CAMPAIGN_ID);
    const [campaignSnap, userSnap] = await Promise.all([t.get(campaignRef), t.get(userRef)]);
    const campaign = campaignSnap.exists ? campaignSnap.data() : null;
    const campaignActive = campaign && campaign.status === CAMPAIGN_STATUS.ACTIVE;
    const userDoc = userSnap.exists ? userSnap.data() : {};

    if (!campaignActive) {
      t.update(attrRef, {
        status: ATTRIBUTION_STATUS.QUALIFIED,
        qualifiedAt: now,
        firstQualifyingOrderId: orderId,
        rewardsSkippedReason: 'CAMPAIGN_INACTIVE',
      });
      return { qualified: true, rewardsIssued: false, reason: 'CAMPAIGN_INACTIVE', campaignStatus: campaign ? campaign.status : 'MISSING' };
    }

    // Phone-verification gate (campaign opt-in): an unverified account never
    // consumes its first qualifying order — the attribution stays REGISTERED
    // so a later order can qualify once the customer verifies their phone.
    if (campaign.requirePhoneVerified === true && userDoc.phoneVerified !== true) {
      return { qualified: false, reason: 'PHONE_UNVERIFIED' };
    }

    const customerRewardKobo = Number.isInteger(campaign.customerRewardKobo) && campaign.customerRewardKobo > 0
      ? campaign.customerRewardKobo : 0;
    const partnerRewardKobo = Number.isInteger(campaign.partnerRewardKobo) && campaign.partnerRewardKobo > 0
      ? campaign.partnerRewardKobo : 0;
    const partnerRef = db.collection(COLLECTIONS.PARTNERS).doc(attr.partnerId);

    // Firestore transactions require ALL reads before ANY write.
    const [partnerSnap, walletTxSnap, walletSnap, rewardSnap] = await Promise.all([
      t.get(partnerRef),
      t.get(walletTxRef),
      t.get(walletRef),
      t.get(rewardRef),
    ]);
    const partner = partnerSnap.exists ? partnerSnap.data() : null;

    // Suspended partners cannot generate new rewards even with an old attribution.
    if (!partner || partner.status !== PARTNER_STATUS.ACTIVE) {
      t.update(attrRef, {
        status: ATTRIBUTION_STATUS.QUALIFIED,
        qualifiedAt: now,
        firstQualifyingOrderId: orderId,
        rewardsSkippedReason: 'PARTNER_INACTIVE',
      });
      return { qualified: true, rewardsIssued: false, reason: 'PARTNER_INACTIVE' };
    }

    // --- Customer credit: canonical wallet ledger, idempotent by ref doc id ---
    // Hard budget: stats.customerCreditIssuedKobo is read and incremented inside
    // THIS transaction, so concurrent qualifications can never push issued
    // credit past customerCreditBudgetKobo. Exhausted budget still qualifies
    // the customer (attribution + partner reward) but skips the wallet credit.
    const creditBudgetKobo = Number.isInteger(campaign.customerCreditBudgetKobo) && campaign.customerCreditBudgetKobo > 0
      ? campaign.customerCreditBudgetKobo
      : null;
    const creditIssuedKobo = Number(campaign.stats && campaign.stats.customerCreditIssuedKobo) || 0;
    const creditAllowed = creditBudgetKobo === null
      || creditIssuedKobo + customerRewardKobo <= creditBudgetKobo;
    let creditPosted = false;
    let creditSkippedReason = null;
    if (customerRewardKobo > 0 && !walletTxSnap.exists && creditAllowed) {
      const naira = Math.round(customerRewardKobo / 100);
      const newBalance = ((walletSnap.exists ? Number(walletSnap.data().balance) : 0) || 0) + naira;
      t.set(walletRef, { balance: newBalance, updatedAt: now }, { merge: true });
      t.set(userRef, { walletBalance: newBalance }, { merge: true });
      t.set(walletTxRef, {
        type: CUSTOMER_CREDIT_TYPE,
        amount: naira,
        amountKobo: customerRewardKobo,
        status: 'POSTED',
        reference: deterministicCreditRef(customerId),
        attributionId: attrRef.id,
        campaignId: attr.campaignId || DEFAULT_CAMPAIGN_ID,
        orderId,
        reason: 'Go7 referral welcome credit',
        createdAt: now,
      });
      // Increment inside the same commit — the counter can never record credit
      // that didn't land, and concurrent retries see the updated total.
      t.set(campaignRef, {
        stats: { customerCreditIssuedKobo: FieldValue.increment(customerRewardKobo) },
        updatedAt: now,
      }, { merge: true });
      creditPosted = true;
    } else if (customerRewardKobo > 0 && !walletTxSnap.exists && !creditAllowed) {
      creditSkippedReason = 'CREDIT_BUDGET_EXHAUSTED';
    }

    // --- Marketer reward: deterministic ledger id = free idempotency ---
    let rewardCreated = false;
    if (partnerRewardKobo > 0 && !rewardSnap.exists) {
      t.set(rewardRef, {
        rewardId: rewardRef.id,
        partnerId: attr.partnerId,
        partnerCode: attr.partnerCode || null,
        customerId,
        attributionId: attrRef.id,
        orderId,
        rewardType: 'QUALIFYING_FIRST_ORDER',
        qualificationReason: 'FIRST_COMPLETED_ORDER',
        amountKobo: partnerRewardKobo,
        status: REWARD_STATUS.PENDING,
        campaignId: attr.campaignId || DEFAULT_CAMPAIGN_ID,
        createdAt: now,
        approvedAt: null,
        paidAt: null,
        rejectedAt: null,
        voidedAt: null,
        metadata: { orderCollection: collectionName || 'orders' },
      });
      rewardCreated = true;
    }

    // --- Claim qualification + stats (atomic projection) ---
    t.update(attrRef, {
      status: ATTRIBUTION_STATUS.QUALIFIED,
      qualifiedAt: now,
      firstQualifyingOrderId: orderId,
      rewardsSkippedReason: null,
      creditSkippedReason,
    });
    t.set(partnerRef, {
      stats: {
        qualifiedCustomers: FieldValue.increment(1),
        qualifyingOrders: FieldValue.increment(1),
        totalOrders: FieldValue.increment(1),
        attributedRevenueKobo: FieldValue.increment(
          Math.round((Number(orderData.total || orderData.totalAmount || orderData.amount || 0) || 0) * 100)
        ),
        pendingRewardsKobo: FieldValue.increment(rewardCreated ? partnerRewardKobo : 0),
      },
      updatedAt: now,
    }, { merge: true });

    return {
      qualified: true,
      rewardsIssued: creditPosted || rewardCreated,
      creditPosted,
      rewardCreated,
      rewardId: rewardRef.id,
      partnerId: attr.partnerId,
      customerRewardKobo,
      partnerRewardKobo,
    };
  });
}

// ---------------------------------------------------------------------------
// Core: first-order checkout discount (Option B — discount at checkout,
// not a post-order wallet credit)
// ---------------------------------------------------------------------------

/**
 * Preview (non-transactional): is this customer eligible for the referral
 * first-order discount, and for how much?
 * Eligible = attribution REGISTERED + discount not yet redeemed + campaign
 * ACTIVE with firstOrderDiscountKobo > 0 + partner still ACTIVE.
 */
async function resolveFirstOrderDiscountCore(ctx, customerId) {
  const { db } = ctx;
  if (!customerId) return { eligible: false, reason: 'NO_CUSTOMER' };

  const attrSnap = await db.collection(COLLECTIONS.ATTRIBUTIONS).doc(customerId).get();
  if (!attrSnap.exists) return { eligible: false, reason: 'NO_ATTRIBUTION' };
  const attr = attrSnap.data();
  if (attr.status !== ATTRIBUTION_STATUS.REGISTERED && attr.status !== ATTRIBUTION_STATUS.ATTRIBUTED) {
    return { eligible: false, reason: `ATTRIBUTION_${attr.status}` };
  }
  if (attr.discountRedeemedAt || attr.discountOrderId) {
    return { eligible: false, reason: 'ALREADY_REDEEMED' };
  }

  const campaignSnap = await db
    .collection(COLLECTIONS.CAMPAIGNS)
    .doc(attr.campaignId || DEFAULT_CAMPAIGN_ID)
    .get();
  const campaign = campaignSnap.exists ? campaignSnap.data() : null;
  if (!campaign || campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
    return { eligible: false, reason: 'CAMPAIGN_INACTIVE' };
  }
  const discountKobo = Number.isInteger(campaign.firstOrderDiscountKobo) && campaign.firstOrderDiscountKobo > 0
    ? campaign.firstOrderDiscountKobo : 0;
  if (!discountKobo) return { eligible: false, reason: 'NO_DISCOUNT_CONFIGURED' };

  const partnerSnap = await db.collection(COLLECTIONS.PARTNERS).doc(attr.partnerId).get();
  if (!partnerSnap.exists || partnerSnap.data().status !== PARTNER_STATUS.ACTIVE) {
    return { eligible: false, reason: 'PARTNER_INACTIVE' };
  }

  return {
    eligible: true,
    discountKobo,
    partnerId: attr.partnerId,
    partnerCode: attr.partnerCode || null,
    campaignId: attr.campaignId || DEFAULT_CAMPAIGN_ID,
  };
}

/**
 * Atomic redeem — runs inside a transaction at order creation. Marks the
 * attribution so a concurrent/second order can never claim the discount twice.
 * Returns the discount info or { redeemed:false }.
 */
async function redeemFirstOrderDiscountCore(ctx, customerId, orderId) {
  const { db } = ctx;
  const FieldValue = ctx.FieldValue;
  if (!customerId || !orderId) return { redeemed: false };

  const attrRef = db.collection(COLLECTIONS.ATTRIBUTIONS).doc(customerId);
  return db.runTransaction(async (t) => {
    const attrSnap = await t.get(attrRef);
    if (!attrSnap.exists) return { redeemed: false };
    const attr = attrSnap.data();
    if (attr.status !== ATTRIBUTION_STATUS.REGISTERED && attr.status !== ATTRIBUTION_STATUS.ATTRIBUTED) {
      return { redeemed: false };
    }
    if (attr.discountRedeemedAt || attr.discountOrderId) return { redeemed: false };

    const campaignSnap = await t.get(
      db.collection(COLLECTIONS.CAMPAIGNS).doc(attr.campaignId || DEFAULT_CAMPAIGN_ID)
    );
    const campaign = campaignSnap.exists ? campaignSnap.data() : null;
    if (!campaign || campaign.status !== CAMPAIGN_STATUS.ACTIVE) return { redeemed: false };
    const discountKobo = Number.isInteger(campaign.firstOrderDiscountKobo) && campaign.firstOrderDiscountKobo > 0
      ? campaign.firstOrderDiscountKobo : 0;
    if (!discountKobo) return { redeemed: false };

    const partnerSnap = await t.get(db.collection(COLLECTIONS.PARTNERS).doc(attr.partnerId));
    if (!partnerSnap.exists || partnerSnap.data().status !== PARTNER_STATUS.ACTIVE) {
      return { redeemed: false };
    }

    t.update(attrRef, {
      discountRedeemedAt: FieldValue.serverTimestamp(),
      discountOrderId: orderId,
      discountKobo,
    });
    return {
      redeemed: true,
      discountKobo,
      partnerId: attr.partnerId,
      partnerCode: attr.partnerCode || null,
      campaignId: attr.campaignId || DEFAULT_CAMPAIGN_ID,
    };
  });
}

/**
 * Release a redeemed discount — called when the discounted order is voided
 * before completing, so the customer can still use it on a later order.
 */
async function releaseFirstOrderDiscountCore(ctx, customerId, orderId) {
  const { db } = ctx;
  if (!customerId || !orderId) return { released: false };
  const attrRef = db.collection(COLLECTIONS.ATTRIBUTIONS).doc(customerId);
  return db.runTransaction(async (t) => {
    const attrSnap = await t.get(attrRef);
    if (!attrSnap.exists) return { released: false };
    const attr = attrSnap.data();
    if (attr.discountOrderId !== orderId) return { released: false };
    // Don't un-redeem a discount whose order already qualified — that path is
    // handled by reward voiding, and the discount was genuinely consumed.
    if (attr.firstQualifyingOrderId === orderId) return { released: false };
    t.update(attrRef, {
      discountRedeemedAt: null,
      discountOrderId: null,
      discountKobo: null,
    });
    return { released: true };
  });
}

// ---------------------------------------------------------------------------
// Core: order voided AFTER qualification (refund/cancel post-delivery)
// ---------------------------------------------------------------------------

/**
 * If an order that produced a reward is later cancelled/refunded:
 *  - PENDING/APPROVED reward -> VOID (audited)
 *  - PAID reward -> fraudReview flag + audit (no silent clawback)
 *  - attribution flagged postQualificationFlag; customer credit stays
 *    (promotional credit policy) but is flagged in the audit log.
 */
async function handleOrderVoidForReferralCore(ctx, orderId, orderData, actor, reason) {
  const { db } = ctx;
  const FieldValue = ctx.FieldValue;
  const customerId = customerOf(orderData);
  if (!customerId) return { handled: false, reason: 'NO_CUSTOMER' };
  if (!isVoidedOrder(orderData)) return { handled: false, reason: 'ORDER_NOT_VOIDED' };

  const attrRef = db.collection(COLLECTIONS.ATTRIBUTIONS).doc(customerId);
  const attrSnap = await attrRef.get();
  if (!attrSnap.exists) return { handled: false, reason: 'NO_ATTRIBUTION' };
  const attr = attrSnap.data();

  // Voided BEFORE qualifying: release any first-order checkout discount that
  // was redeemed against this order so the customer keeps their one-time bonus.
  if (attr.discountOrderId === orderId && attr.firstQualifyingOrderId !== orderId) {
    const released = await releaseFirstOrderDiscountCore(ctx, customerId, orderId);
    return { handled: true, discountReleased: released.released === true };
  }

  if (attr.status !== ATTRIBUTION_STATUS.QUALIFIED || attr.firstQualifyingOrderId !== orderId) {
    return { handled: false, reason: 'NOT_QUALIFYING_ORDER' };
  }

  const now = FieldValue.serverTimestamp();
  const rewardRef = db.collection(COLLECTIONS.REWARDS).doc(deterministicRewardId(customerId));
  const auditRef = db.collection(COLLECTIONS.AUDIT).doc();
  const voidReason = reason || (lower(orderData.paymentStatus) === 'refunded' ? 'REFUND' : 'CANCELLED_ORDER');

  await db.runTransaction(async (t) => {
    const rewardSnap = await t.get(rewardRef);
    const reward = rewardSnap.exists ? rewardSnap.data() : null;
    let action = 'NO_REWARD';
    let before = null;
    let after = null;

    if (reward && (reward.status === REWARD_STATUS.PENDING || reward.status === REWARD_STATUS.APPROVED)) {
      before = { status: reward.status };
      after = { status: REWARD_STATUS.VOID };
      t.update(rewardRef, { status: REWARD_STATUS.VOID, voidedAt: now, voidReason });
      action = 'REWARD_VOIDED';
    } else if (reward && reward.status === REWARD_STATUS.PAID) {
      before = { fraudReview: reward.fraudReview || false };
      after = { fraudReview: true };
      t.update(rewardRef, { fraudReview: true, fraudReviewReason: voidReason, fraudReviewAt: now });
      action = 'PAID_REWARD_FLAGGED';
    }

    t.update(attrRef, { postQualificationFlag: voidReason, postQualificationFlagAt: now });
    t.set(auditRef, {
      adminId: actor || 'system',
      action,
      targetType: 'reward',
      targetId: rewardRef.id,
      orderId,
      customerId,
      partnerId: attr.partnerId,
      reason: voidReason,
      before,
      after,
      customerCreditNote: 'Promotional credit retained; flagged for review.',
      createdAt: now,
    });
  });

  return { handled: true };
}

// ---------------------------------------------------------------------------
// Core: reward state machine (admin, audited)
// ---------------------------------------------------------------------------

async function transitionRewardCore(ctx, { rewardId, to, adminId, reason }) {
  const { db } = ctx;
  const FieldValue = ctx.FieldValue;
  const allowed = Object.values(REWARD_STATUS);
  if (!allowed.includes(to)) return { ok: false, error: 'INVALID_STATUS' };
  if (!adminId) return { ok: false, error: 'NO_ADMIN' };

  const rewardRef = db.collection(COLLECTIONS.REWARDS).doc(rewardId);
  const auditRef = db.collection(COLLECTIONS.AUDIT).doc();

  return db.runTransaction(async (t) => {
    const snap = await t.get(rewardRef);
    if (!snap.exists) return { ok: false, error: 'NOT_FOUND' };
    const reward = snap.data();
    const from = reward.status;
    const next = (REWARD_TRANSITIONS[from] || []);
    if (!next.includes(to)) {
      return { ok: false, error: 'INVALID_TRANSITION', from, to };
    }

    const now = FieldValue.serverTimestamp();
    const stampField = { APPROVED: 'approvedAt', PAID: 'paidAt', REJECTED: 'rejectedAt', VOID: 'voidedAt' }[to];
    const update = { status: to, [stampField]: now, transitionReason: normStr(reason) || null };
    t.update(rewardRef, update);

    // Stats projection: move kobo between buckets.
    const amount = Number(reward.amountKobo) || 0;
    const partnerRef = db.collection(COLLECTIONS.PARTNERS).doc(reward.partnerId);
    const statsUpdate = { updatedAt: now, stats: {} };
    const dec = (f) => (statsUpdate.stats[f] = FieldValue.increment(-amount));
    const inc = (f) => (statsUpdate.stats[f] = FieldValue.increment(amount));
    if (from === 'PENDING') dec('pendingRewardsKobo');
    if (from === 'APPROVED') dec('approvedRewardsKobo');
    if (to === 'APPROVED') inc('approvedRewardsKobo');
    if (to === 'PAID') inc('paidRewardsKobo');
    t.set(partnerRef, statsUpdate, { merge: true });

    t.set(auditRef, {
      adminId,
      action: `REWARD_${to}`,
      targetType: 'reward',
      targetId: rewardId,
      reason: normStr(reason) || null,
      before: { status: from },
      after: { status: to },
      partnerId: reward.partnerId,
      amountKobo: amount,
      createdAt: now,
    });
    return { ok: true, from, to };
  });
}

// ---------------------------------------------------------------------------
// Core: partner status (admin, audited)
// ---------------------------------------------------------------------------

async function setPartnerStatusCore(ctx, { partnerId, status, adminId, reason }) {
  const { db } = ctx;
  const FieldValue = ctx.FieldValue;
  if (!Object.values(PARTNER_STATUS).includes(status)) return { ok: false, error: 'INVALID_STATUS' };
  if (!adminId) return { ok: false, error: 'NO_ADMIN' };

  const partnerRef = db.collection(COLLECTIONS.PARTNERS).doc(partnerId);
  const auditRef = db.collection(COLLECTIONS.AUDIT).doc();
  return db.runTransaction(async (t) => {
    const snap = await t.get(partnerRef);
    if (!snap.exists) return { ok: false, error: 'NOT_FOUND' };
    const before = snap.data().status;
    if (before === status) return { ok: true, from: before, to: status, unchanged: true };
    const now = FieldValue.serverTimestamp();
    t.update(partnerRef, { status, updatedAt: now });
    t.set(auditRef, {
      adminId,
      action: `PARTNER_${status}`,
      targetType: 'partner',
      targetId: partnerId,
      reason: normStr(reason) || null,
      before: { status: before },
      after: { status },
      createdAt: now,
    });
    return { ok: true, from: before, to: status };
  });
}

// ---------------------------------------------------------------------------
// Core: partner dashboard (privacy-masked)
// ---------------------------------------------------------------------------

function maskCustomerId(uid) {
  const s = String(uid || '');
  return s.length <= 4 ? '####' : `#${s.slice(-4).toUpperCase()}`;
}

async function getPartnerDashboardCore(ctx, partnerId) {
  const { db } = ctx;
  const partnerSnap = await db.collection(COLLECTIONS.PARTNERS).doc(partnerId).get();
  if (!partnerSnap.exists) return { ok: false, error: 'NOT_FOUND' };
  const p = partnerSnap.data();

  const rewardsSnap = await db
    .collection(COLLECTIONS.REWARDS)
    .where('partnerId', '==', partnerId)
    .limit(100)
    .get();
  const rewards = rewardsSnap.docs.map((d) => {
    const r = d.data();
    return {
      rewardId: d.id,
      customer: maskCustomerId(r.customerId),
      rewardType: r.rewardType,
      amountKobo: r.amountKobo,
      status: r.status,
      createdAt: r.createdAt || null,
    };
  });

  const attrsSnap = await db
    .collection(COLLECTIONS.ATTRIBUTIONS)
    .where('partnerId', '==', partnerId)
    .limit(200)
    .get();
  const attributions = attrsSnap.docs.map((d) => {
    const a = d.data();
    return {
      customer: maskCustomerId(a.customerId),
      status: a.status,
      qualified: a.status === ATTRIBUTION_STATUS.QUALIFIED,
      registeredAt: a.registeredAt || null,
    };
  });

  const stats = p.stats || {};
  const link = `go7.ng/r/${p.code}`;
  const conv = stats.signups > 0 ? Math.round(((stats.qualifiedCustomers || 0) / stats.signups) * 1000) / 10 : 0;
  return {
    ok: true,
    partnerId,
    code: p.code,
    status: p.status,
    name: p.name || null,
    referralLink: link,
    stats: { ...stats, conversionPercent: conv },
    rewards,
    attributions,
  };
}

// ---------------------------------------------------------------------------
// Core: create partner (server-side code allocation) + upsert campaign
// ---------------------------------------------------------------------------

async function createPartnerCore(ctx, data, adminId) {
  const { db } = ctx;
  const now = ctx.FieldValue.serverTimestamp();

  let code = normalizePartnerCode(data && data.code);
  const requested = !!code;
  for (let i = 0; i < 10; i++) {
    if (!code) code = generatePartnerCode();
    const clash = await db.collection(COLLECTIONS.PARTNERS).where('code', '==', code).limit(1).get();
    if (clash.empty) break;
    if (requested) return { ok: false, error: 'CODE_TAKEN', code };
    code = null;
  }
  if (!code) return { ok: false, error: 'CODE_ALLOCATION_FAILED' };

  const ref = db.collection(COLLECTIONS.PARTNERS).doc();
  await ref.set({
    partnerId: ref.id,
    userId: normStr(data && data.userId) || null,
    code,
    status: Object.values(PARTNER_STATUS).includes(data && data.status) ? data.status : PARTNER_STATUS.ACTIVE,
    name: normStr(data && data.name) || null,
    phone: normStr(data && data.phone) || null,
    email: lower(data && data.email) || null,
    socialProfiles: {
      tiktok: normStr(data && data.tiktok) || null,
      instagram: normStr(data && data.instagram) || null,
      whatsapp: normStr(data && data.whatsapp) || null,
      other: normStr(data && data.other) || null,
    },
    campaignId: normStr(data && data.campaignId) || DEFAULT_CAMPAIGN_ID,
    stats: {
      clicks: 0, signups: 0, qualifiedCustomers: 0, qualifyingOrders: 0, totalOrders: 0,
      attributedRevenueKobo: 0, pendingRewardsKobo: 0, approvedRewardsKobo: 0, paidRewardsKobo: 0,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: adminId || null,
  });
  await db.collection(COLLECTIONS.AUDIT).doc().set({
    adminId: adminId || null, action: 'PARTNER_CREATED', targetType: 'partner', targetId: ref.id,
    reason: normStr(data && data.reason) || null, before: null, after: { code }, createdAt: now,
  });
  return { ok: true, partnerId: ref.id, code, referralLink: `go7.ng/r/${code}` };
}

async function upsertCampaignCore(ctx, data, adminId) {
  const { db } = ctx;
  const campaignId = normStr(data && data.campaignId) || DEFAULT_CAMPAIGN_ID;
  const kobo = (v) => (Number.isInteger(v) && v >= 0 ? v : undefined);
  const ref = db.collection(COLLECTIONS.CAMPAIGNS).doc(campaignId);
  const existing = await ref.get();
  const now = ctx.FieldValue.serverTimestamp();
  const payload = {
    campaignId,
    name: normStr(data && data.name) || (existing.exists ? existing.data().name : 'Go7 Referral Launch'),
    status: Object.values(CAMPAIGN_STATUS).includes(data && data.status)
      ? data.status
      : existing.exists ? existing.data().status : CAMPAIGN_STATUS.DRAFT,
    qualificationType: 'FIRST_COMPLETED_ORDER',
    maxRewardsPerCustomer: 1,
    updatedAt: now,
  };
  if (kobo(data && data.customerRewardKobo) !== undefined) payload.customerRewardKobo = kobo(data.customerRewardKobo);
  if (kobo(data && data.partnerRewardKobo) !== undefined) payload.partnerRewardKobo = kobo(data.partnerRewardKobo);
  if (kobo(data && data.firstOrderDiscountKobo) !== undefined) payload.firstOrderDiscountKobo = kobo(data.firstOrderDiscountKobo);
  if (data && data.startAt) payload.startAt = data.startAt;
  if (data && data.endAt) payload.endAt = data.endAt;
  if (data && data.terms) payload.terms = data.terms;
  // Configurable campaign fields — all admin-supplied, validated server-side.
  if (data && data.description !== undefined) payload.description = normStr(data.description).slice(0, 500);
  if (data && data.type !== undefined) payload.type = normStr(data.type).slice(0, 40) || 'referral';
  if (kobo(data && data.budgetKobo) !== undefined) payload.budgetKobo = kobo(data.budgetKobo);
  // Hard cap on customer referral credits (separate from ambassador reward
  // budgetKobo) — enforced transactionally in qualifyReferralForOrderCore.
  if (kobo(data && data.customerCreditBudgetKobo) !== undefined) payload.customerCreditBudgetKobo = kobo(data.customerCreditBudgetKobo);
  // Optional fraud gate: only customers with users/{uid}.phoneVerified === true
  // can qualify (attribution still records; rewards wait for verification).
  if (data && data.requirePhoneVerified !== undefined) payload.requirePhoneVerified = data.requirePhoneVerified === true;
  if (data && data.payoutSchedule !== undefined) payload.payoutSchedule = normStr(data.payoutSchedule).slice(0, 40) || 'manual';
  if (data && data.rewardRules !== undefined) {
    // Lazy require avoids a circular dep — campaignRules reads COLLECTIONS.
    const { validateRewardRules } = require('./campaignRules');
    const { rules, error } = validateRewardRules(data.rewardRules);
    if (error) throw Object.assign(new Error(`rewardRules: ${error}`), { code: 'invalid-argument' });
    payload.rewardRules = rules;
  }
  if (!existing.exists) {
    payload.createdAt = now;
    if (payload.customerRewardKobo === undefined) payload.customerRewardKobo = 20000;
    if (payload.partnerRewardKobo === undefined) payload.partnerRewardKobo = 20000;
  }
  await ref.set(payload, { merge: true });
  await db.collection(COLLECTIONS.AUDIT).doc().set({
    adminId: adminId || null, action: existing.exists ? 'CAMPAIGN_UPDATED' : 'CAMPAIGN_CREATED',
    targetType: 'campaign', targetId: campaignId,
    reason: normStr(data && data.reason) || null,
    before: existing.exists ? { status: existing.data().status } : null,
    after: { status: payload.status }, createdAt: now,
  });
  return { ok: true, campaignId, status: payload.status };
}

// ---------------------------------------------------------------------------
// Callable wrappers + trigger (cloud-only; lazy admin init)
// ---------------------------------------------------------------------------

function getCtx() {
  const admin = require('./adminInit');
  return { db: admin.firestore(), FieldValue: admin.firestore.FieldValue };
}

async function assertAdmin(context) {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { db } = getCtx();
  const snap = await db.collection('users').doc(context.auth.uid).get();
  if (!snap.exists || snap.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  return context.auth.uid;
}

const resolveReferralCode = functions.https.onCall(async (data) => {
  const res = await resolveReferralCodeCore(getCtx(), data && data.code);
  return res;
});

const trackReferralClick = functions.https.onCall(async (data) => {
  const ctx = getCtx();
  const code = normalizePartnerCode(data && data.code);
  if (!code) return { tracked: false, reason: 'INVALID_FORMAT' };
  const snap = await ctx.db
    .collection(COLLECTIONS.PARTNERS)
    .where('code', '==', code)
    .limit(1)
    .get();
  if (snap.empty) return { tracked: false, reason: 'NOT_FOUND' };
  const partnerDoc = snap.docs[0];
  const now = ctx.FieldValue.serverTimestamp();
  const batch = ctx.db.batch();
  batch.set(ctx.db.collection(COLLECTIONS.CLICKS).doc(), {
    partnerId: partnerDoc.id,
    partnerCode: code,
    campaignId: partnerDoc.data().campaignId || DEFAULT_CAMPAIGN_ID,
    source: normStr(data && data.source) || 'LINK',
    utmSource: normStr(data && data.utmSource) || null,
    utmMedium: normStr(data && data.utmMedium) || null,
    utmCampaign: normStr(data && data.utmCampaign) || null,
    createdAt: now,
  });
  batch.set(partnerDoc.ref, { stats: { clicks: ctx.FieldValue.increment(1) }, updatedAt: now }, { merge: true });
  await batch.commit();
  return { tracked: true, partnerId: partnerDoc.id };
});

const registerReferralAttribution = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  return registerAttributionCore(getCtx(), {
    customerId: context.auth.uid,
    code: data && data.code,
    source: (data && data.source) || 'LINK',
    metadata: data && data.metadata,
  });
});

const createGrowthPartner = functions.https.onCall(async (data, context) => {
  const adminId = await assertAdmin(context);
  const res = await createPartnerCore(getCtx(), data, adminId);
  if (!res.ok) {
    throw new functions.https.HttpsError(
      res.error === 'CODE_TAKEN' ? 'already-exists' : 'internal',
      res.error === 'CODE_TAKEN' ? `Code ${res.code} is taken` : 'Could not allocate unique code'
    );
  }
  return res;
});

const upsertGrowthCampaign = functions.https.onCall(async (data, context) => {
  const adminId = await assertAdmin(context);
  return upsertCampaignCore(getCtx(), data, adminId);
});

const setGrowthPartnerStatus = functions.https.onCall(async (data, context) => {
  const adminId = await assertAdmin(context);
  const res = await setPartnerStatusCore(getCtx(), {
    partnerId: data && data.partnerId,
    status: data && data.status,
    adminId,
    reason: data && data.reason,
  });
  if (!res.ok) throw new functions.https.HttpsError('failed-precondition', res.error);
  return res;
});

const transitionGrowthReward = (to) =>
  functions.https.onCall(async (data, context) => {
    const adminId = await assertAdmin(context);
    const res = await transitionRewardCore(getCtx(), {
      rewardId: data && data.rewardId,
      to,
      adminId,
      reason: data && data.reason,
    });
    if (!res.ok) throw new functions.https.HttpsError('failed-precondition', `${res.error} (${res.from}->${res.to || to})`);
    return res;
  });

const approveGrowthReward = transitionGrowthReward(REWARD_STATUS.APPROVED);
const rejectGrowthReward = transitionGrowthReward(REWARD_STATUS.REJECTED);
const payGrowthReward = transitionGrowthReward(REWARD_STATUS.PAID);
const voidGrowthReward = transitionGrowthReward(REWARD_STATUS.VOID);

async function resolvePartnerIdForCaller(ctx, data, context) {
  // Partner reads own dashboard; admin may pass partnerId.
  if (context.auth && data && data.partnerId) {
    const u = await ctx.db.collection('users').doc(context.auth.uid).get();
    if (u.exists && u.data().role === 'admin') return data.partnerId;
  }
  if (!context.auth) return null;
  const snap = await ctx.db
    .collection(COLLECTIONS.PARTNERS)
    .where('userId', '==', context.auth.uid)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

const getPartnerDashboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const ctx = getCtx();
  const partnerId = await resolvePartnerIdForCaller(ctx, data, context);
  if (!partnerId) throw new functions.https.HttpsError('permission-denied', 'Not a growth partner');
  return getPartnerDashboardCore(ctx, partnerId);
});

const checkReferralDiscount = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  return resolveFirstOrderDiscountCore(getCtx(), context.auth.uid);
});

const getPartnerRewards = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const ctx = getCtx();
  const partnerId = await resolvePartnerIdForCaller(ctx, data, context);
  if (!partnerId) throw new functions.https.HttpsError('permission-denied', 'Not a growth partner');
  const snap = await ctx.db
    .collection(COLLECTIONS.REWARDS)
    .where('partnerId', '==', partnerId)
    .limit(200)
    .get();
  return {
    ok: true,
    rewards: snap.docs.map((d) => {
      const r = d.data();
      return {
        rewardId: d.id, customer: maskCustomerId(r.customerId), rewardType: r.rewardType,
        amountKobo: r.amountKobo, status: r.status, createdAt: r.createdAt || null,
      };
    }),
  };
});

// ---------------------------------------------------------------------------
// Trigger: orders onUpdate -> qualify first order / void on refund
// ---------------------------------------------------------------------------

const onOrderReferralQualification = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const orderId = context.params.orderId;
    const becameCompleted = !COMPLETED_STATUSES.has(statusOf(before)) && COMPLETED_STATUSES.has(statusOf(after));
    const becameVoid = !isVoidedOrder(before) && isVoidedOrder(after);
    if (!becameCompleted && !becameVoid) return null;
    const ctx = getCtx();
    try {
      if (becameCompleted) {
        const res = await qualifyReferralForOrderCore(ctx, orderId, after, 'orders');
        console.log(`[growth] qualify ${orderId}:`, JSON.stringify(res));
      }
      if (becameVoid) {
        const res = await handleOrderVoidForReferralCore(ctx, orderId, after, 'system');
        console.log(`[growth] void ${orderId}:`, JSON.stringify(res));
      }
    } catch (e) {
      console.error(`[growth] trigger failed for ${orderId}:`, e);
    }
    return null;
  });

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // cloud functions
  resolveReferralCode,
  trackReferralClick,
  registerReferralAttribution,
  createGrowthPartner,
  upsertGrowthCampaign,
  setGrowthPartnerStatus,
  approveGrowthReward,
  rejectGrowthReward,
  payGrowthReward,
  voidGrowthReward,
  getPartnerDashboard,
  getPartnerRewards,
  checkReferralDiscount,
  onOrderReferralQualification,
  // pure core (testable)
  normalizePartnerCode,
  generatePartnerCode,
  createPartnerCore,
  upsertCampaignCore,
  isQualifyingReferralOrder,
  isVoidedOrder,
  resolveReferralCodeCore,
  registerAttributionCore,
  qualifyReferralForOrderCore,
  handleOrderVoidForReferralCore,
  transitionRewardCore,
  setPartnerStatusCore,
  getPartnerDashboardCore,
  resolveFirstOrderDiscountCore,
  redeemFirstOrderDiscountCore,
  releaseFirstOrderDiscountCore,
  maskCustomerId,
  deterministicRewardId,
  deterministicCreditRef,
  // constants
  COLLECTIONS,
  PARTNER_STATUS,
  CAMPAIGN_STATUS,
  ATTRIBUTION_STATUS,
  REWARD_STATUS,
  REWARD_TRANSITIONS,
  DEFAULT_CAMPAIGN_ID,
};

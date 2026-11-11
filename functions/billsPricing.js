/**
 * GO7 Bills financing — sell price = SME cost + markup.
 * Settings: pricingSettings/bills (public read, admin write) — change anytime, no redeploy.
 */

const DEFAULT_BILLS_PRICING = {
  airtimeMarkupFlat: 0, // face value (compete with OPay); raise later if needed
  airtimeMarkupPercent: 0,
  /** Flat wallet credit after successful airtime (SME ~₦98/₦100 → ~₦1 kept after cashback). */
  airtimeCashbackNaira: 1,
  dataMarkupPercent: 12, // everyday catalog
  heroDataMarkupPercent: 10, // sharper price on heroPlanIds
  dataMarkupFlat: 0,
  minMarginNaira: 20, // data only
  roundTo: 5,
  // MTN 1GB 7d, 1GB 30d, 2GB 7d, MTN Share 1/2/3/4/5GB AWOOF 30d
  heroPlanIds: [2, 6, 3, 30, 31, 32, 33, 34],
};

function normalizePricing(raw = {}) {
  const heroPlanIds = Array.isArray(raw.heroPlanIds)
    ? raw.heroPlanIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : DEFAULT_BILLS_PRICING.heroPlanIds;

  return {
    airtimeMarkupFlat: Number(raw.airtimeMarkupFlat ?? DEFAULT_BILLS_PRICING.airtimeMarkupFlat),
    airtimeMarkupPercent: Number(raw.airtimeMarkupPercent ?? DEFAULT_BILLS_PRICING.airtimeMarkupPercent),
    airtimeCashbackNaira: Math.max(
      0,
      Math.round(Number(raw.airtimeCashbackNaira ?? DEFAULT_BILLS_PRICING.airtimeCashbackNaira) || 0)
    ),
    dataMarkupPercent: Number(raw.dataMarkupPercent ?? DEFAULT_BILLS_PRICING.dataMarkupPercent),
    heroDataMarkupPercent: Number(raw.heroDataMarkupPercent ?? DEFAULT_BILLS_PRICING.heroDataMarkupPercent),
    dataMarkupFlat: Number(raw.dataMarkupFlat ?? DEFAULT_BILLS_PRICING.dataMarkupFlat),
    minMarginNaira: Number(raw.minMarginNaira ?? DEFAULT_BILLS_PRICING.minMarginNaira),
    roundTo: Math.max(1, Number(raw.roundTo ?? DEFAULT_BILLS_PRICING.roundTo) || 5),
    heroPlanIds,
  };
}

function roundSellPrice(value, roundTo) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const step = Math.max(1, Number(roundTo) || 5);
  return Math.max(step, Math.ceil(n / step) * step);
}

function isHeroPlan(planId, pricing) {
  const id = Number(planId);
  if (!Number.isFinite(id)) return false;
  return (pricing.heroPlanIds || []).includes(id);
}

/**
 * @param {number} cost - SME / face-value cost
 * @param {'airtime'|'data'} kind
 * @param {object} pricing - normalizePricing() result
 * @param {{ planId?: number }} [opts]
 * @returns {{ cost: number, sellPrice: number, margin: number, isHero: boolean, markupPercent: number }}
 */
function applyMarkup(cost, kind, pricing, opts = {}) {
  const settings = normalizePricing(pricing);
  const base = Math.round(Number(cost) * 100) / 100;
  if (!Number.isFinite(base) || base <= 0) {
    return { cost: 0, sellPrice: 0, margin: 0, isHero: false, markupPercent: 0 };
  }

  if (kind === 'airtime') {
    const raw = base + settings.airtimeMarkupFlat + (base * settings.airtimeMarkupPercent) / 100;
    const noMarkup = settings.airtimeMarkupFlat === 0 && settings.airtimeMarkupPercent === 0;
    const sellPrice = noMarkup ? Math.round(base) : roundSellPrice(raw, settings.roundTo);
    return {
      cost: Math.round(base),
      sellPrice,
      margin: sellPrice - Math.round(base),
      isHero: false,
      markupPercent: settings.airtimeMarkupPercent,
    };
  }

  const hero = isHeroPlan(opts.planId, settings);
  const markupPercent = hero ? settings.heroDataMarkupPercent : settings.dataMarkupPercent;
  const raw = base + settings.dataMarkupFlat + (base * markupPercent) / 100;
  const withMin = Math.max(raw, base + settings.minMarginNaira);
  const sellPrice = roundSellPrice(withMin, settings.roundTo);
  const costRounded = Math.round(base);

  return {
    cost: costRounded,
    sellPrice,
    margin: sellPrice - costRounded,
    isHero: hero,
    markupPercent,
  };
}

async function loadBillsPricing(db) {
  try {
    const snap = await db.collection('pricingSettings').doc('bills').get();
    if (!snap.exists) return normalizePricing(DEFAULT_BILLS_PRICING);
    return normalizePricing(snap.data() || {});
  } catch {
    return normalizePricing(DEFAULT_BILLS_PRICING);
  }
}

module.exports = {
  DEFAULT_BILLS_PRICING,
  normalizePricing,
  applyMarkup,
  roundSellPrice,
  loadBillsPricing,
  isHeroPlan,
};

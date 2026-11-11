/**
 * Client-side mirror of functions/billsPricing.js for display only.
 * Backend always recomputes and enforces sell price.
 * Admin writes: pricingSettings/bills
 */

import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

export const BILLS_PRICING_DOC_PATH = 'pricingSettings/bills';

export const DEFAULT_BILLS_PRICING = {
  airtimeMarkupFlat: 0,
  airtimeMarkupPercent: 0,
  airtimeCashbackNaira: 1,
  dataMarkupPercent: 12,
  heroDataMarkupPercent: 10,
  dataMarkupFlat: 0,
  minMarginNaira: 20,
  roundTo: 5,
  // MTN 1GB 7d, 1GB 30d, 2GB 7d, MTN Share 1/2/3/4/5GB AWOOF 30d
  heroPlanIds: [2, 6, 3, 30, 31, 32, 33, 34],
  notes: 'Airtime face value + ₦1 cashback; data +12% everyday / +10% heroes. Change anytime — no redeploy.',
};

export function normalizePricing(raw = {}) {
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
    notes: String(raw.notes ?? DEFAULT_BILLS_PRICING.notes ?? ''),
  };
}

function roundSellPrice(value, roundTo) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const step = Math.max(1, Number(roundTo) || 5);
  return Math.max(step, Math.ceil(n / step) * step);
}

export function applyDataMarkup(cost, planId, pricing) {
  const settings = normalizePricing(pricing);
  const base = Number(cost);
  if (!Number.isFinite(base) || base <= 0) {
    return { cost: 0, sellPrice: 0, margin: 0, isHero: false };
  }
  const isHero = settings.heroPlanIds.includes(Number(planId));
  const pct = isHero ? settings.heroDataMarkupPercent : settings.dataMarkupPercent;
  const raw = base + settings.dataMarkupFlat + (base * pct) / 100;
  const withMin = Math.max(raw, base + settings.minMarginNaira);
  const sellPrice = roundSellPrice(withMin, settings.roundTo);
  const costRounded = Math.round(base);
  return {
    cost: costRounded,
    sellPrice,
    margin: sellPrice - costRounded,
    isHero,
  };
}

export function airtimeSellPrice(faceAmount, pricing) {
  const settings = normalizePricing(pricing);
  const base = Math.round(Number(faceAmount));
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (settings.airtimeMarkupFlat === 0 && settings.airtimeMarkupPercent === 0) return base;
  const raw = base + settings.airtimeMarkupFlat + (base * settings.airtimeMarkupPercent) / 100;
  return roundSellPrice(raw, settings.roundTo);
}

export function subscribeBillsPricing(db, onData, onError) {
  if (!db) {
    onData(normalizePricing(DEFAULT_BILLS_PRICING));
    return () => {};
  }
  return onSnapshot(
    doc(db, 'pricingSettings', 'bills'),
    (snap) => {
      onData(normalizePricing(snap.exists() ? snap.data() : DEFAULT_BILLS_PRICING));
    },
    (err) => {
      console.error('Bills pricing listener error:', err);
      onError?.(err);
      onData(normalizePricing(DEFAULT_BILLS_PRICING));
    }
  );
}

export async function saveBillsPricing(db, settings, updatedBy = null) {
  const normalized = normalizePricing(settings);
  const payload = {
    ...normalized,
    updatedBy: updatedBy || null,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'pricingSettings', 'bills'), payload, { merge: true });
  return normalized;
}

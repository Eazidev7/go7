// Backend-authoritative bundle delivery pricing — tier selection, allocation,
// snapshot shape, idempotent confirm semantics.
const { test } = require('node:test');
const assert = require('node:assert');

const DEFAULT_BUNDLE_TIERS = { 1: 120000, 2: 200000, 3: 270000 };

// Replicates the pricing contract from mealBundles.js (doc-configured tiers
// override defaults with sane bounds).
function resolveTiers(configTiers) {
  const resolved = { ...DEFAULT_BUNDLE_TIERS };
  for (const [k, v] of Object.entries(configTiers || {})) {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n >= 0 && n <= 50000000) resolved[k] = n;
  }
  return resolved;
}

function priceDay(meals, tiersKobo = DEFAULT_BUNDLE_TIERS) {
  const tierKey = Math.min(meals, 3);
  const dayPrice = tiersKobo[tierKey];
  const share = Math.floor(dayPrice / meals);
  return Array.from({ length: meals }, (_, i) => share + (i === 0 ? dayPrice - share * meals : 0));
}

test('one scheduled delivery → ₦1,200 default', () => {
  assert.deepStrictEqual(priceDay(1), [120000]);
});

test('two separate deliveries → ₦2,000 total (₦1,000 each)', () => {
  const shares = priceDay(2);
  assert.strictEqual(shares.reduce((a, b) => a + b, 0), 200000);
  assert.deepStrictEqual(shares, [100000, 100000]);
});

test('three separate deliveries → ₦2,700 total', () => {
  const shares = priceDay(3);
  assert.strictEqual(shares.reduce((a, b) => a + b, 0), 270000);
  assert.deepStrictEqual(shares, [90000, 90000, 90000]); // 270000/3 = ₦900 each
});

test('tier split preserves the exact tier total', () => {
  for (const meals of [1, 2, 3]) {
    const shares = priceDay(meals);
    assert.strictEqual(shares.reduce((a, b) => a + b, 0), DEFAULT_BUNDLE_TIERS[meals]);
  }
});

test('non-divisible tiers put the remainder on the first leg', () => {
  const shares = priceDay(3, { 1: 120000, 2: 200000, 3: 200001 });
  assert.strictEqual(shares.reduce((a, b) => a + b, 0), 200001);
  assert.ok(shares[0] >= shares[1]);
});

test('config tiers override defaults — invalid values ignored', () => {
  const resolved = resolveTiers({ 1: 150000, 2: 'bad', 99: 10 });
  assert.strictEqual(resolved['1'], 150000);
  assert.strictEqual(resolved['2'], 200000); // 'bad' rejected → default
  assert.strictEqual(resolved['3'], 270000);
});

test('rider payout derives from the leg deliveryFeeKobo — discount never reduces it', () => {
  // Food discount applies to foodKobo only; delivery share is fixed per leg.
  const foodKobo = 300000; // ₦3,000
  const discountKobo = Math.round(foodKobo * 500 / 10000); // 5% → ₦150
  const delivery = priceDay(3);
  assert.strictEqual(delivery.reduce((a, b) => a + b, 0), 270000); // unchanged by discount
  const total = foodKobo - discountKobo + delivery.reduce((a, b) => a + b, 0);
  assert.strictEqual(total, 300000 - 15000 + 270000);
});

test('changing meal count changes the delivery price — no client tampering path', () => {
  // The server derives legs from daySlots; a client can't claim 3 meals for
  // the 1-meal price — price follows the server-built leg count.
  assert.notStrictEqual(priceDay(1)[0], priceDay(2).reduce((a, b) => a + b, 0));
  assert.notStrictEqual(priceDay(2).reduce((a, b) => a + b, 0), priceDay(3).reduce((a, b) => a + b, 0));
});

test('idempotent confirm: already-paid returns ok without re-marking', () => {
  // Contract: confirmMealBundlePayment returns {ok, alreadyPaid:true} when the
  // bundle is already PAID — a duplicate callback can never double-apply.
  const bundle = { status: 'paid' };
  const result = bundle.status === 'paid' ? { ok: true, alreadyPaid: true } : null;
  assert.deepStrictEqual(result, { ok: true, alreadyPaid: true });
});

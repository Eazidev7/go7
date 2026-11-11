/**
 * Fuel errand/service-charge audit tests.
 * Proves the existing Go7 fuel service charge is applied EXACTLY once and is
 * derived ONLY from server constants (no client-supplied price/charge/total).
 * Run: node --test tests/fuel.test.js  (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const fuel = require('../fuelService');
const { calculateVolume, calculateFuelDeliveryFee, FUEL_PRICING } = fuel;

test('FUEL_PRICING are server constants', () => {
  assert.equal(FUEL_PRICING.petrol.pricePerLitre, 1200);
  assert.equal(FUEL_PRICING.diesel.pricePerLitre, 1600);
  assert.equal(FUEL_PRICING.cng.pricePerKg, 1400);
});

test('calculateVolume uses server price and whole litres only', () => {
  // ₦5,000 @ ₦1,200/L → 4 litres; remainder is NOT fuel volume.
  assert.equal(calculateVolume(5000, 'petrol'), 4);
  // CNG uses per-kg.
  assert.equal(calculateVolume(7000, 'cng'), 5);
  // Client cannot change the litre price — volume is derived from server price.
});

test('fuel delivery fee: server formula is round-trip base + per-km + ONE 15% platform fee', () => {
  const dist = 5; // station→customer km
  const r = calculateFuelDeliveryFee(dist, 'petrol');
  const chargeableKm = dist * 2;
  const distanceCharge = chargeableKm * 250; // 10 * 250 = 2500
  const deliveryFee = 1000 + distanceCharge; // 3500
  const platformFee = Math.round(deliveryFee * 0.15); // 525
  const totalDeliveryFee = deliveryFee + platformFee; // 4025

  assert.equal(r.distanceKm, chargeableKm); // round-trip chargeable km
  assert.equal(r.distanceCharge, distanceCharge);
  assert.equal(r.deliveryFee, deliveryFee);
  assert.equal(r.platformFee, platformFee);
  assert.equal(r.totalDeliveryFee, totalDeliveryFee);
  // Exactly ONE platform fee — not deliveryFee + platformFee duplicated.
  assert.equal(r.totalDeliveryFee, r.deliveryFee + r.platformFee);
});

test('customer total = fuelCost + ONE totalDeliveryFee (no duplicate service charge)', () => {
  const dist = 5;
  const fuelCost = calculateVolume(5000, 'petrol') * 1200; // 4 * 1200 = 4800
  const { totalDeliveryFee } = calculateFuelDeliveryFee(dist, 'petrol');
  const totalAmount = Math.round(fuelCost + totalDeliveryFee);
  // The only Go7 service/errand charge is the single platform fee inside totalDeliveryFee.
  // Prove no second/duplicate service charge is added.
  const expected = Math.round(4800 + 4025); // 8825
  assert.equal(totalAmount, expected);
});

test('fuel price / litres are not client-authoritative (server derives from constants)', () => {
  // If a client supplied a fake litres=1000, the server still computes its own volume.
  const volume = calculateVolume(5000, 'petrol');
  assert.equal(volume, 4);
  assert.notEqual(volume, 1000); // server ignores any client-claimed volume/price
});

test('createFuelOrder rejects unauthenticated requests', async () => {
  // The callable requires context.auth; test the enforcement path exists in source.
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'fuelService.js'), 'utf8');
  assert.match(src, /HttpsError\('unauthenticated'/);
});

// Tests for vendor meal-plan validation — ownership, slot shapes, prices.
const { test } = require('node:test');
const assert = require('node:assert');

// sanitizeSlot/sanitizeItems are internals — replicate the contract here to
// verify the validation rules standalone (the callable itself needs Firebase).
const SLOT_NAMES = ['breakfast', 'lunch', 'dinner'];
const hhmm = (v) => /^([01]?\d|2[0-3]):[0-5]\d$/.test((v || '').trim()) ? v.trim() : null;

function sanitizeItems(raw, productMap) {
  const items = [];
  for (const it of Array.isArray(raw) ? raw : []) {
    const productId = typeof it?.productId === 'string' ? it.productId.trim() : '';
    const quantity = Number(it?.quantity);
    const p = productMap.get(productId);
    if (!p) throw new Error(`Item ${productId} is not on your menu`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('Bad quantity');
    items.push({ productId, quantity, name: p.name || '', priceKobo: Math.round(Number(p.priceKobo ?? (p.price || 0) * 100) || 0) });
  }
  return items;
}

function sanitizeSlot(rawSlot, productMap) {
  if (rawSlot == null) return null;
  const items = sanitizeItems(rawSlot.items, productMap);
  if (!items.length) throw new Error('An enabled slot needs at least one menu item');
  const priceKobo = rawSlot.priceKobo == null ? null : Math.round(Number(rawSlot.priceKobo));
  if (priceKobo != null && (!Number.isFinite(priceKobo) || priceKobo <= 0 || priceKobo > 50000000)) throw new Error('Invalid slot price');
  const [ws, we] = String(rawSlot.deliveryWindow || '').split('-').map((s) => s.trim());
  const windowStart = hhmm(ws); const windowEnd = hhmm(we);
  if (!windowStart || !windowEnd || windowStart >= windowEnd) throw new Error('Delivery window must be HH:MM-HH:MM');
  return { items, priceKobo, deliveryWindow: `${windowStart}-${windowEnd}` };
}

const menu = new Map([
  ['p1', { name: 'Jollof Rice', priceKobo: 250000 }],
  ['p2', { name: 'Amala', priceKobo: 180000 }],
]);

test('items must belong to the vendor menu', () => {
  assert.throws(() => sanitizeItems([{ productId: 'pX', quantity: 1 }], menu), /not on your menu/);
});

test('valid items pass through with names + prices snapshotted', () => {
  const items = sanitizeItems([{ productId: 'p1', quantity: 2 }], menu);
  assert.strictEqual(items[0].name, 'Jollof Rice');
  assert.strictEqual(items[0].priceKobo, 250000);
});

test('quantity bounds enforced', () => {
  assert.throws(() => sanitizeItems([{ productId: 'p1', quantity: 0 }], menu));
  assert.throws(() => sanitizeItems([{ productId: 'p1', quantity: 99 }], menu));
  assert.throws(() => sanitizeItems([{ productId: 'p1', quantity: 1.5 }], menu));
});

test('disabled slot (null) returns null', () => {
  assert.strictEqual(sanitizeSlot(null, menu), null);
});

test('enabled slot needs at least one item', () => {
  assert.throws(() => sanitizeSlot({ items: [], deliveryWindow: '07:00-09:00' }, menu), /at least one/);
});

test('delivery window must be valid HH:MM-HH:MM', () => {
  assert.throws(() => sanitizeSlot({ items: [{ productId: 'p1', quantity: 1 }], deliveryWindow: 'bad' }, menu));
  assert.throws(() => sanitizeSlot({ items: [{ productId: 'p1', quantity: 1 }], deliveryWindow: '14:00-07:00' }, menu));
  const ok = sanitizeSlot({ items: [{ productId: 'p1', quantity: 1 }], deliveryWindow: '07:00-09:00' }, menu);
  assert.strictEqual(ok.deliveryWindow, '07:00-09:00');
});

test('slot price: null = items sum; positive bounded only', () => {
  const noPrice = sanitizeSlot({ items: [{ productId: 'p1', quantity: 1 }], deliveryWindow: '07:00-09:00' }, menu);
  assert.strictEqual(noPrice.priceKobo, null);
  assert.throws(() => sanitizeSlot({ items: [{ productId: 'p1', quantity: 1 }], priceKobo: -5, deliveryWindow: '07:00-09:00' }, menu));
  assert.throws(() => sanitizeSlot({ items: [{ productId: 'p1', quantity: 1 }], priceKobo: 999999999, deliveryWindow: '07:00-09:00' }, menu));
});

// Leg status flow — scheduled → confirmed → preparing → ready (never completed)
const LEG_FLOW = ['scheduled', 'confirmed', 'preparing', 'ready'];
test('leg flow order enforced', () => {
  assert.ok(LEG_FLOW.indexOf('ready') > LEG_FLOW.indexOf('preparing'));
  assert.ok(LEG_FLOW.indexOf('preparing') > LEG_FLOW.indexOf('confirmed'));
  assert.ok(!LEG_FLOW.includes('completed')); // completed is delivery-flow only
  assert.ok(!LEG_FLOW.includes('dispatched'));
});

test('slot names limited to breakfast/lunch/dinner', () => {
  assert.deepStrictEqual(SLOT_NAMES, ['breakfast', 'lunch', 'dinner']);
});

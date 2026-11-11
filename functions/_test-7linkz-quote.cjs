process.env.GCLOUD_PROJECT = 'go7-app-209e4';
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.go7-app-209e4' });
const { TOOLS } = require('./bookDeliveryAI/toolRegistry');
const ctx = { session: { pickup: { candidates: [] }, dropoff: { candidates: [] } }, log: (t, i, o) => console.log('  [log]', o) };
(async () => {
  let r = await TOOLS.resolveDeliveryLocation(ctx, { query: 'kuti museum sapon' });
  console.log('pickup resolve:', r.status, r.candidates.map((c) => `${c.name} (${c.lat},${c.lng})`));
  ctx.session.pickup.candidates = r.candidates;
  let c = await TOOLS.confirmDeliveryLocation(ctx, { role: 'pickup', index: 0 });
  console.log('pickup confirmed:', c.location.name);
  r = await TOOLS.resolveDeliveryLocation(ctx, { query: '7linkz phone village' });
  console.log('dropoff resolve:', r.status, r.candidates.map((c2) => `${c2.name} (${c2.lat},${c2.lng})`));
  ctx.session.dropoff.candidates = r.candidates;
  c = await TOOLS.confirmDeliveryLocation(ctx, { role: 'dropoff', index: 0 });
  console.log('dropoff confirmed:', c.location.name);
  const q = await TOOLS.getDeliveryQuote(ctx);
  console.log('QUOTE:', JSON.stringify({ distanceKm: q.distanceKm, deliveryFee: q.deliveryFee, platformFee: q.platformFee, grandTotal: q.grandTotal }));
})().catch((e) => console.log('ERR', e.code || '', e.message));

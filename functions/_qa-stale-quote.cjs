// Repro: session stuck at QUOTE_PRESENTED with an unpaid stale quote.
// Sending a NEW booking message must rotate to a fresh session and reply —
// before the fix it returned messages:[] (silent dead chat).
const admin = require('./adminInit');
const db = admin.firestore();

const API_KEY = 'AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s';
const FN = 'https://us-central1-go7-app-209e4.cloudfunctions.net';

async function main() {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://go7.ng/' },
    body: JSON.stringify({ email: 'go7-ai-qa@example.com', password: 'Go7QA!Test#2024', returnSecureToken: true }),
  });
  const { idToken, localId } = await r.json();
  const chat = async (data) => {
    const res = await fetch(`${FN}/bookDeliveryAIChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
      body: JSON.stringify({ data }),
    });
    const b = await res.json();
    return b.error ? { error: b.error } : b.result;
  };

  // Seed a stale session exactly like the user's: QUOTE_PRESENTED, quote set,
  // no booking — the state that swallowed every message.
  const sid = 'dai_qa_stale_' + Date.now().toString(36);
  await db.doc('deliveryAISessions/' + sid).set({
    sessionId: sid,
    userId: localId,
    status: 'QUOTE_PRESENTED',
    pickup: { query: 'sapon', canonicalLocation: { name: 'Sapon', lat: 7.1547, lng: 3.3469, type: 'area' }, confirmed: true, candidates: [], cardEmitted: true },
    dropoff: { query: 'kuto', canonicalLocation: { name: 'Kuto', lat: 7.15, lng: 3.35, type: 'area' }, confirmed: true, candidates: [], cardEmitted: true },
    package: { description: 'package' },
    recipient: { name: 'Old', phone: '08000000000' },
    instructions: null,
    quote: { deliveryFee: 500, platformFee: 50, grandTotal: 550, totalKobo: 55000, distanceKm: 1.7, pricingConfigVersion: 'legacy', quotedAt: new Date().toISOString() },
    bookingId: null,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    riderStatus: null,
    toolCallLog: [],
    messageCount: 5,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.doc('deliveryAISessionActive/' + localId).set({ sessionId: sid });
  console.log('seeded stale session', sid);

  // Resume → then send a NEW booking request (the exact user repro).
  let x = await chat({ sessionId: sid });
  console.log('\n» resume');
  (x.messages || []).forEach((m, i) => console.log('  [' + i + ']', JSON.stringify((m.text || '').slice(0, 110))));

  x = await chat({ sessionId: sid, message: 'Pick up a laptop from kuti museum' });
  console.log('\n» Pick up a laptop from kuti museum');
  (x.messages || []).forEach((m, i) => console.log('  [' + i + ']', JSON.stringify((m.text || '').slice(0, 110)), '| ui:', m.ui ? m.ui.type : '-'));
  if (x.error) console.log('  ERROR:', JSON.stringify(x.error).slice(0, 200));
  console.log('  new sid:', x.sessionId, '| rotated:', x.sessionId !== sid);
  console.log(x.messages && x.messages.length ? 'PASS — reply delivered' : 'FAIL — empty reply (dead chat)');

  // cleanup
  await db.doc('deliveryAISessions/' + sid).delete();
  if (x.sessionId && x.sessionId !== sid) await db.doc('deliveryAISessions/' + x.sessionId).delete();
  await db.doc('deliveryAISessionActive/' + localId).delete();
  console.log('cleaned');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

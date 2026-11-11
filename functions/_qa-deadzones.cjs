// Regression sweep: every state that used to produce a silent turn.
// A) parked QUOTE_PRESENTED + new booking message → rotate + reply
// B) parked QUOTE_PRESENTED + bare "hello" → contextual re-prompt, not silence
// C) expired quote (>15min) + "yes" → re-quote, never charge stale fare
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

  const seedSession = async (tag, quotedAt) => {
    const sid = `dai_qa_${tag}_${Date.now().toString(36)}`;
    await db.doc('deliveryAISessions/' + sid).set({
      sessionId: sid, userId: localId, status: 'QUOTE_PRESENTED',
      pickup: { query: 'sapon', canonicalLocation: { name: 'Sapon', lat: 7.1547, lng: 3.3469, type: 'area' }, confirmed: true, candidates: [], cardEmitted: true },
      dropoff: { query: 'kuto', canonicalLocation: { name: 'Kuto', lat: 7.15, lng: 3.35, type: 'area' }, confirmed: true, candidates: [], cardEmitted: true },
      package: { description: 'package' },
      recipient: { name: 'Old', phone: '08000000000' },
      instructions: null,
      quote: { deliveryFee: 500, platformFee: 50, grandTotal: 550, totalKobo: 55000, distanceKm: 1.7, pricingConfigVersion: 'legacy', quotedAt },
      bookingId: null, paymentMethod: null, paymentStatus: 'unpaid', riderStatus: null,
      toolCallLog: [], messageCount: 3,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return sid;
  };
  const show = (x) => (x.messages || []).forEach((m, i) => console.log('  [' + i + ']', JSON.stringify((m.text || '').slice(0, 100)), '| ui:', m.ui ? m.ui.type : '-'));
  const cleanup = async (sids) => {
    for (const s of sids) await db.doc('deliveryAISessions/' + s).delete().catch(() => {});
    await db.doc('deliveryAISessionActive/' + localId).delete().catch(() => {});
  };
  const sids = [];
  let pass = true;

  // A) stale quote session + NEW booking message → must rotate and reply
  let sid = await seedSession('rot', new Date(Date.now() - 2 * 3600e3).toISOString());
  sids.push(sid);
  let x = await chat({ sessionId: sid, message: 'send a phone from kuti museum' });
  sids.push(x.sessionId);
  console.log('\nA) stale QUOTE_PRESENTED + new booking msg:');
  show(x);
  const a = x.messages?.length > 0 && x.sessionId !== sid;
  console.log(a ? '  PASS — rotated + replied' : '  FAIL');
  pass &&= a;

  // B) stale quote session + bare "hello" → contextual re-prompt, not silence
  sid = await seedSession('hello', new Date().toISOString());
  sids.push(sid);
  x = await chat({ sessionId: sid, message: 'hello' });
  sids.push(x.sessionId);
  console.log('\nB) QUOTE_PRESENTED + bare "hello":');
  show(x);
  const b = x.messages?.length > 0;
  console.log(b ? '  PASS — contextual reply' : '  FAIL — silent');
  pass &&= b;

  // C) expired quote + "yes" → re-quote, never confirm stale fare
  sid = await seedSession('exp', new Date(Date.now() - 2 * 3600e3).toISOString());
  sids.push(sid);
  x = await chat({ sessionId: sid, message: 'yes' });
  sids.push(x.sessionId);
  console.log('\nC) expired quote + "yes":');
  show(x);
  const c = x.messages?.length > 0 && x.messages.some((m) => /expired|current price/i.test(m.text || '') || m.ui?.type === 'quote');
  console.log(c ? '  PASS — re-quoted' : '  FAIL');
  pass &&= c;

  await cleanup(sids);
  console.log('\n' + (pass ? 'ALL PASS' : 'SOME FAILED') + ' — cleaned');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

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
  const call = (fn) => async (data) => {
    const res = await fetch(`${FN}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
      body: JSON.stringify({ data }),
    });
    const b = await res.json();
    return b.error ? { error: b.error } : b.result;
  };
  const chat = call('bookDeliveryAIChat');
  const confirmPay = call('confirmBookDeliveryPayment');
  const debitWallet = call('debitWalletForDelivery');

  let x = await chat({});
  const sid = x.sessionId;
  console.log('SID', sid);

  const steps = [
    'send a laptop from sabo eleweran to kuto',  // PRIMARY JOURNEY, both in one msg
    'yes',   // confirm pickup  → deferred dropoff card should appear here
    'yes',   // confirm dropoff → recipient prompt
    'yes',   // DUPLICATE send — observe behavior
    'the recipient is Tobi 08012345678', // → quote
    'yes',   // confirm quote   → payment options
    'wallet',// typed method    → booking created + payment card
  ];
  for (const msg of steps) {
    x = await chat({ sessionId: sid, message: msg });
    console.log('\n»', msg);
    (x.messages || []).forEach((m, i) =>
      console.log('  [' + i + ']', JSON.stringify((m.text || '').slice(0, 110)), '| ui:', m.ui ? m.ui.type : '-')
    );
    if (x.error) console.log('  ERROR:', JSON.stringify(x.error).slice(0, 200));
  }

  let sess = (await db.doc('deliveryAISessions/' + sid).get()).data();
  const bookingId = sess.bookingId;
  console.log('\nbooking:', bookingId || '-', '| status:', sess.status);

  // Simulate the client-side wallet debit + confirm, then payment_confirmed.
  if (bookingId) {
    const payCard = x.messages?.find((m) => m.ui?.type === 'payment')?.ui;
    const d = await debitWallet({ customerId: localId, deliveryId: bookingId, fee: Math.round(payCard?.amount || sess.quote?.grandTotal), description: 'QA AI booking' });
    console.log('debitWallet:', JSON.stringify(d).slice(0, 200));
    const c = await confirmPay({ bookingId, method: 'wallet' });
    console.log('confirmBookDeliveryPayment:', JSON.stringify(c).slice(0, 200));
    x = await chat({ sessionId: sid, action: { type: 'payment_confirmed', bookingId } });
    (x.messages || []).forEach((m, i) =>
      console.log('  [' + i + ']', JSON.stringify((m.text || '').slice(0, 110)), '| ui:', m.ui ? m.ui.type : '-')
    );
    sess = (await db.doc('deliveryAISessions/' + sid).get()).data();
    console.log('final state:', sess.status, '| paymentStatus:', sess.paymentStatus);
  }

  // cleanup session + all booking docs (prevents stuck-rider admin alerts)
  await db.doc('deliveryAISessions/' + sid).delete();
  await db.doc('deliveryAISessionActive/' + localId).delete();
  if (bookingId) {
    for (const col of ['bookings', 'orders', 'pendingBookings', 'deliveries']) {
      const ref = db.doc(col + '/' + bookingId);
      if ((await ref.get()).exists) await ref.delete();
    }
    console.log('cleaned booking', bookingId);
  }
  console.log('cleaned session');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

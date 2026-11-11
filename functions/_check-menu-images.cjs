const admin = require('./adminInit');
const db = admin.firestore();
(async () => {
  const snap = await db.collection('vendors').where('isActive', '==', true).get();
  for (const d of snap.docs) {
    const v = d.data();
    const name = (v.businessName || v.name || d.id).slice(0, 26);
    const p = await d.ref.collection('products').limit(60).get();
    if (!p.size) { console.log(name.padEnd(28), '0 products'); continue; }
    const stats = { total: 0, real: 0, empty: 0, placeholder: 0, other: 0 };
    const samples = [];
    p.docs.forEach((pd) => {
      const x = pd.data();
      const img = String(x.imageUrl || x.image || x.photoUrl || x.photo || x.img || '');
      stats.total++;
      if (!img) stats.empty++;
      else if (/placeholder|no-image|picsum|via\.placeholder|dummyimage|unsplash/i.test(img)) stats.placeholder++;
      else if (/go7\.ng\/uploads|firebasestorage\.googleapis/i.test(img)) stats.real++;
      else { stats.other++; samples.push(img.slice(0, 90)); }
    });
    console.log(name.padEnd(28), 'total=' + stats.total, 'real=' + stats.real, 'empty=' + stats.empty, 'placeholder=' + stats.placeholder, 'other=' + stats.other);
    samples.slice(0, 2).forEach((s) => console.log('   sample:', s));
    // show one empty-name product as example
    if (stats.empty > 0) {
      const e = p.docs.find((pd) => !(pd.data().imageUrl || pd.data().image || pd.data().photoUrl || pd.data().photo || pd.data().img));
      if (e) console.log('   no-img product:', (e.data().name || e.data().title || e.id).slice(0, 40));
    }
  }
  process.exit(0);
})();

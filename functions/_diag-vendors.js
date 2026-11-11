const admin = require('./adminInit');
const db = admin.firestore();

// Mirror src/utils/vendorVisibility.js
const ALLOWLIST_IDS = new Set(['ngVhbo34siQTc8QuLG9Ur3MkRBv1','36cNFlp9C1bAooUqyHyqCCDvwVg1','5IVcJjcE0GU5aq2gEOBemf7U2G22','3AN1jXZ7VBNqWIDobaP2JYbgb7d2','J1V28f0sSSMQ3RjJ8QGOokxqVQE3','6GpUrJPqHzQNLzuiyQ8YpHwjdZo2','TCCCToZ96KOfGazCnUp3F8UVKP22','DHRa7xmdUjgACDGrfoXQyfgk7Tq2','j4zGWJ1KLHPRdutGbA2X24DaboN2']);
const ALLOWLIST_NAMES = new Set(['dalish restaurant',"tommy's place",'tommys place','mama tee','mama tee foodz & catering ventures','sharp-food','sharp food','lami foods','orombos food canteen','sweet sensation','aveecol ewagoyin']);

function onAllowlist(v, id) {
  const vid = String(id || v.id || v.vendorId || v.userId || '').trim();
  if (vid && ALLOWLIST_IDS.has(vid)) return true;
  const name = String(v.businessName || v.displayName || v.name || '').trim().toLowerCase().replace(/['']/g,"'");
  return ALLOWLIST_NAMES.has(name);
}
function explicitlyHidden(v) {
  if (v.accountStatus === 'suspended' || v.status === 'rejected' || v.status === 'inactive') return false;
  return true;
}
function publiclyVisible(v, id) {
  if (!v || typeof v !== 'object') return false;
  if (!onAllowlist(v, id)) {
    const fully = (v.status === 'approved' || v.approved === true) &&
      v.isLive === true && v.isActive !== false && v.active !== false &&
      v.canReceiveOrders !== false && v.accountStatus !== 'suspended' &&
      v.accountStatus !== 'pending_phone_verification' && v.accountStatus !== 'pending_approval';
    if (!fully) return false;
  }
  if (!explicitlyHidden(v)) return false;
  if (v.status === 'approved' || v.approved === true || v.isLive === true) return true;
  if (v.isActive === true || v.active === true) return v.canReceiveOrders !== false;
  if (v.acceptsOrders === true || v.isOpen === true) return true;
  return false;
}
function productVisible(p) {
  return p.isActive !== false && p.isAvailable !== false && p.available !== false;
}

async function main() {
  const snap = await db.collection('vendors').get();
  let passVisibility = 0, passProducts = 0, passBoth = 0;
  const results = [];
  for (const d of snap.docs) {
    const v = d.data();
    const vis = publiclyVisible(v, d.id);
    let hasProd = false;
    if (vis) {
      const prods = await db.collection('vendors').doc(d.id).collection('products').limit(3).get();
      hasProd = prods.docs.some(pd => productVisible(pd.data()));
    }
    if (vis) passVisibility++;
    if (hasProd) passProducts++;
    if (vis && hasProd) passBoth++;
    results.push({ id: d.id.slice(0,8), name: v.businessName || v.name, vis, hasProd });
  }
  console.log(`vendors=${snap.size} visible=${passVisibility} withProducts=${passProducts} BOTH=${passBoth}`);
  results.forEach(r => { if (r.vis || r.hasProd) console.log(JSON.stringify(r)); });
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

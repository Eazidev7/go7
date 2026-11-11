// Simulate the exact client pipeline anonymously via the web SDK (same as browser).
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s',
  authDomain: 'go7-app-209e4.firebaseapp.com',
  projectId: 'go7-app-209e4',
});
const db = getFirestore(app);

const ALLOWLIST_IDS = new Set(['ngVhbo34siQTc8QuLG9Ur3MkRBv1','36cNFlp9C1bAooUqyHyqCCDvwVg1','5IVcJjcE0GU5aq2gEOBemf7U2G22','3AN1jXZ7VBNqWIDobaP2JYbgb7d2','J1V28f0sSSMQ3RjJ8QGOokxqVQE3','6GpUrJPqHzQNLzuiyQ8YpHwjdZo2','TCCCToZ96KOfGazCnUp3F8UVKP22','DHRa7xmdUjgACDGrfoXQyfgk7Tq2','j4zGWJ1KLHPRdutGbA2X24DaboN2']);
const ALLOWLIST_NAMES = new Set(['dalish restaurant',"tommy's place",'tommys place','mama tee','mama tee foodz & catering ventures','sharp-food','sharp food','lami foods','orombos food canteen','sweet sensation','aveecol ewagoyin']);

const onAllowlist = (v, id) => {
  const vid = String(id || v.id || v.vendorId || v.userId || '').trim();
  if (vid && ALLOWLIST_IDS.has(vid)) return true;
  const name = String(v.businessName || v.displayName || v.name || '').trim().toLowerCase().replace(/['’]/g,"'");
  return ALLOWLIST_NAMES.has(name);
};
const publiclyVisible = (v, id) => {
  if (!v || typeof v !== 'object') return false;
  if (!onAllowlist(v, id)) {
    const fully = (v.status === 'approved' || v.approved === true) &&
      v.isLive === true && v.isActive !== false && v.active !== false &&
      v.canReceiveOrders !== false && v.accountStatus !== 'suspended' &&
      v.accountStatus !== 'pending_phone_verification' && v.accountStatus !== 'pending_approval';
    if (!fully) return false;
  }
  if (v.accountStatus === 'suspended' || v.status === 'rejected' || v.status === 'inactive') return false;
  if (v.status === 'approved' || v.approved === true || v.isLive === true) return true;
  if (v.isActive === true || v.active === true) return v.canReceiveOrders !== false;
  if (v.acceptsOrders === true || v.isOpen === true) return true;
  return false;
};
const productVisible = (p) => p.isActive !== false && p.isAvailable !== false && p.available !== false;

try {
  console.log('1) fetching vendors (anonymous web SDK)...');
  const snap = await getDocs(collection(db, 'vendors'));
  console.log(`   vendors=${snap.size}`);
  let shown = 0;
  for (const d of snap.docs) {
    const v = d.data();
    if (!publiclyVisible(v, d.id)) continue;
    const prods = await getDocs(query(collection(db, 'vendors', d.id, 'products'), limit(3)));
    const hasProd = prods.docs.some(pd => productVisible(pd.data()));
    if (hasProd) { shown++; console.log(`   SHOW: ${v.businessName || v.name} (${d.id.slice(0,8)})`); }
  }
  console.log(`RESULT: ${shown} vendors would render`);
  process.exit(0);
} catch (e) {
  console.error('PIPELINE FAILED:', e.code || '', e.message);
  process.exit(1);
}

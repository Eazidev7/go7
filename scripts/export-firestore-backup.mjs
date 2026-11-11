/**
 * Export GO7 Firestore data to local JSON backups.
 */
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

function loadServiceAccount() {
  const candidates = [
    path.join(projectRoot, 'service-account.json'),
    path.join(projectRoot, 'functions', 'service-account.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  throw new Error('No service-account.json found');
}

if (!admin.apps.length) {
  const sa = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id || 'go7-delivery',
  });
}

const db = admin.firestore();

const TOP_COLLECTIONS = [
  'users','vendors','orders','deliveries','bookings','deliveryTracking','delivery_live',
  'riders','riders_online','riderLocations','rider_locations','wallets','walletTransactions',
  'transactions','notifications','agents','agentTransactions','agentWithdrawals',
  'agentDailyReports','agentPerformanceMonths','adminActions','otp_codes','otps',
  'packageAnalyses','reminder_logs','vendorBalances','payouts','products',
  'platformSettings','promoBanners','promoCodes','combos','notification_stats',
  'notification_errors','settings','categories',
];

const VENDOR_SUBCOLLECTIONS = ['products', 'addons', 'categories', 'combos'];

function serializeValue(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof admin.firestore.Timestamp) {
    return { __type: 'Timestamp', value: value.toDate().toISOString() };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return { __type: 'GeoPoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __type: 'DocumentReference', path: value.path };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v);
    return out;
  }
  return value;
}

async function exportCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  const docs = snap.docs.map((doc) => ({
    id: doc.id,
    path: doc.ref.path,
    data: serializeValue(doc.data()),
  }));
  return { collection: collectionName, count: docs.length, docs };
}

async function exportVendorSubcollections() {
  const vendorsSnap = await db.collection('vendors').get();
  const all = [];
  for (const vendorDoc of vendorsSnap.docs) {
    for (const sub of VENDOR_SUBCOLLECTIONS) {
      const subSnap = await vendorDoc.ref.collection(sub).get();
      for (const doc of subSnap.docs) {
        all.push({
          id: doc.id,
          path: doc.ref.path,
          vendorId: vendorDoc.id,
          subcollection: sub,
          data: serializeValue(doc.data()),
        });
      }
    }
  }
  return { collection: 'vendors_subcollections', count: all.length, docs: all };
}

async function exportWalletTransactions() {
  const walletsSnap = await db.collection('wallets').get();
  const all = [];
  for (const walletDoc of walletsSnap.docs) {
    const txSnap = await walletDoc.ref.collection('transactions').get();
    for (const doc of txSnap.docs) {
      all.push({
        id: doc.id,
        path: doc.ref.path,
        walletId: walletDoc.id,
        data: serializeValue(doc.data()),
      });
    }
  }
  return { collection: 'wallet_transactions_sub', count: all.length, docs: all };
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function main() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outDir = path.join(projectRoot, 'backups', `go7-delivery-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const summary = {
    projectId: admin.app().options.projectId,
    exportedAt: new Date().toISOString(),
    collections: {},
    errors: [],
  };

  console.log(`Exporting Firestore -> ${outDir}`);

  for (const name of TOP_COLLECTIONS) {
    try {
      const result = await exportCollection(name);
      writeJson(path.join(outDir, `${name}.json`), result);
      summary.collections[name] = result.count;
      console.log(`  ${name}: ${result.count} docs`);
    } catch (err) {
      summary.errors.push({ collection: name, error: err.message });
      console.warn(`  ${name}: ERROR ${err.message}`);
    }
  }

  try {
    const vendorSubs = await exportVendorSubcollections();
    writeJson(path.join(outDir, 'vendors_subcollections.json'), vendorSubs);
    summary.collections.vendors_subcollections = vendorSubs.count;
    console.log(`  vendors_subcollections: ${vendorSubs.count} docs`);
  } catch (err) {
    summary.errors.push({ collection: 'vendors_subcollections', error: err.message });
    console.warn(`  vendors_subcollections: ERROR ${err.message}`);
  }

  try {
    const walletTx = await exportWalletTransactions();
    writeJson(path.join(outDir, 'wallet_transactions_sub.json'), walletTx);
    summary.collections.wallet_transactions_sub = walletTx.count;
    console.log(`  wallet_transactions_sub: ${walletTx.count} docs`);
  } catch (err) {
    summary.errors.push({ collection: 'wallet_transactions_sub', error: err.message });
    console.warn(`  wallet_transactions_sub: ERROR ${err.message}`);
  }

  for (const file of ['firestore.rules', 'firestore.indexes.json', 'storage.rules']) {
    const src = path.join(projectRoot, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, file));
  }

  writeJson(path.join(outDir, '_summary.json'), summary);
  console.log(`\nDone. Backup folder: ${outDir}`);
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});

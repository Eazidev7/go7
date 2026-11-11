/**
 * Import GO7 backup JSON into a NEW Firebase project.
 * Usage:
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\new-service-account.json
 *   node scripts/import-firestore-backup.mjs backups\go7-delivery-20260715
 */
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = process.argv[2] || path.join(__dirname, '..', 'backups', 'go7-delivery-20260715');

function loadServiceAccount() {
  const envJson = process.env.SERVICE_ACCOUNT_JSON;
  if (envJson) return JSON.parse(envJson);
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && fs.existsSync(credPath)) return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the NEW project service account');
}

function reviveValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && value.__type === 'Timestamp' && value.value) {
    return admin.firestore.Timestamp.fromDate(new Date(value.value));
  }
  if (typeof value === 'object' && value.__type === 'GeoPoint') {
    return new admin.firestore.GeoPoint(value.latitude, value.longitude);
  }
  if (Array.isArray(value)) return value.map(reviveValue);
  if (typeof value === 'object' && !value.__type) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveValue(v);
    return out;
  }
  return value;
}

if (!admin.apps.length) {
  const sa = loadServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
}

const db = admin.firestore();
const BATCH_LIMIT = 400;

async function importJsonFile(filePath, mapDoc) {
  if (!fs.existsSync(filePath)) return 0;
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const docs = payload.docs || [];
  let written = 0;
  let batch = db.batch();
  let ops = 0;

  for (const doc of docs) {
    const { collectionPath, docId, data } = mapDoc(doc);
    if (!collectionPath || !docId) continue;
    batch.set(db.doc(`${collectionPath}/${docId}`), reviveValue(data), { merge: true });
    ops += 1;
    written += 1;
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops) await batch.commit();
  return written;
}

async function main() {
  console.log('Importing from', backupDir);
  console.log('Target project:', admin.app().options.projectId);

  const topFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json') && !f.startsWith('_') && !f.includes('sub'));
  let total = 0;
  for (const file of topFiles) {
    const collection = file.replace('.json', '');
    const count = await importJsonFile(path.join(backupDir, file), (doc) => ({
      collectionPath: collection,
      docId: doc.id,
      data: doc.data,
    }));
    console.log(`  ${collection}: ${count}`);
    total += count;
  }

  const vendorSubs = path.join(backupDir, 'vendors_subcollections.json');
  const vendorCount = await importJsonFile(vendorSubs, (doc) => ({
    collectionPath: `vendors/${doc.vendorId}/${doc.subcollection}`,
    docId: doc.id,
    data: doc.data,
  }));
  console.log(`  vendors_subcollections: ${vendorCount}`);
  total += vendorCount;

  const walletTx = path.join(backupDir, 'wallet_transactions_sub.json');
  const walletCount = await importJsonFile(walletTx, (doc) => ({
    collectionPath: `wallets/${doc.walletId}/transactions`,
    docId: doc.id,
    data: doc.data,
  }));
  console.log(`  wallet_transactions_sub: ${walletCount}`);
  total += walletCount;

  console.log(`\nImported ${total} documents.`);
  console.log('Next: firebase auth:import backups/users-backup.json --project <NEW_PROJECT_ID>');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});

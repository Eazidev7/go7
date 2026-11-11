/**
 * One-shot restore of /public_html/uploads/ from the cPanel backup extract.
 * ADDITIVE ONLY — uploads missing files, never deletes anything remote.
 *
 *   node scripts/restore-uploads.mjs
 */
import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
for (const f of ['.env', '.env.local', '.env.production', '.env.deploy']) loadEnvFile(f);

const LOCAL_ROOT = process.env.GO7_RESTORE_DIR ||
  path.join(process.env.TEMP || '', 'go7-uploads-restore', 'domains', 'go7.ng', 'public_html', 'uploads');
const FTP_HOST = process.env.GO7_FTP_HOST || '93.127.221.3';
const FTP_USER = process.env.GO7_FTP_USER || 'u135641057.go7.ng';
const FTP_PASSWORD = process.env.GO7_FTP_PASSWORD;
const FTP_REJECT_UNAUTHORIZED = String(process.env.GO7_FTP_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';
const REMOTE_DIR = (process.env.GO7_FTP_REMOTE || '/public_html') + '/uploads';
const ORIGIN = process.env.GO7_PUBLIC_ORIGIN || 'https://go7.ng';

function walk(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  const client = new Client(120000);
  client.ftp.verbose = false;
  await client.access({
    host: FTP_HOST,
    user: FTP_USER,
    password: FTP_PASSWORD,
    secure: true,
    secureOptions: { rejectUnauthorized: FTP_REJECT_UNAUTHORIZED },
  });
  return client;
}

async function main() {
  if (!fs.existsSync(LOCAL_ROOT)) throw new Error(`Local extract not found: ${LOCAL_ROOT}`);
  const files = walk(LOCAL_ROOT);
  console.log(`${files.length} files to check/upload -> ${REMOTE_DIR}`);

  let client = await connect();
  let uploaded = 0, skipped = 0, failed = [];

  for (const rel of files) {
    const localPath = path.join(LOCAL_ROOT, rel);
    const remotePath = `${REMOTE_DIR}/${rel}`;
    const size = fs.statSync(localPath).size;
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        // skip if remote file already exists with same size
        try {
          const remoteSize = await client.size(remotePath);
          if (remoteSize === size) { skipped++; done = true; break; }
        } catch (_) { /* doesn't exist — upload */ }
        await client.ensureDir(remotePath.substring(0, remotePath.lastIndexOf('/')));
        await client.uploadFrom(localPath, remotePath);
        uploaded++;
        done = true;
        if (uploaded % 25 === 0) console.log(`  ... ${uploaded} uploaded`);
      } catch (e) {
        console.warn(`  ! ${rel} attempt ${attempt}: ${e.message}`);
        try { client.close(); } catch (_) {}
        await sleep(800 * attempt);
        try { client = await connect(); } catch (_) {}
      }
    }
    if (!done) failed.push(rel);
  }
  try { client.close(); } catch (_) {}

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} already present, ${failed.length} failed`);
  failed.slice(0, 10).forEach((f) => console.log('  FAILED:', f));

  // Spot-verify a handful of restored URLs over HTTPS
  const samples = files.filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f)).slice(0, 5);
  for (const rel of samples) {
    try {
      const res = await fetch(`${ORIGIN}/uploads/${rel}`, { method: 'HEAD' });
      console.log(`  ${res.status} ${ORIGIN}/uploads/${rel}`);
    } catch (e) {
      console.log(`  ERR ${rel}: ${e.message}`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

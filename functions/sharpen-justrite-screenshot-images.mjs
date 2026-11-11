/**
 * Re-crop Justrite app-screenshot products and upscale for sharper storefront tiles.
 * Source screenshots are ~472px wide (tiles ~130x95) — upscale + pad to 600x600.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const sharp = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'sharp'));
const { Client } = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'basic-ftp'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const VENDOR_ID = 'mMOAGjSLR2X1sDuY20FU0Pyp9f33';
const ASSETS =
  'C:/Users/7linkz/.cursor/projects/c-Users-7linkz-Desktop-go7/assets';
const OUT_SIZE = 600;

function loadEnvFile(fileName) {
  const envPath = path.join(root, fileName);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
for (const f of ['.env', '.env.local', '.env.production', '.env.deploy']) loadEnvFile(f);

const shots = {
  drinks: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-54ff16a8-2088-45f2-8a76-12327fc21665.png'),
  cakes: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-239b7445-f385-49a2-9bb2-2f8ec6ddf649.png'),
  cereals: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-5802236a-680a-484b-ad5e-9af5496e76eb.png'),
  energy: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-64a0d471-1b4a-46c9-93e1-37b6aba857d8.png'),
  juices: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-2579cc5d-98e0-48ee-a882-062ac696ea04.png'),
  ketchup: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-095dedf0-ba48-4fc0-bd46-de046d932b1d.png'),
  cognac: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-49235ae1-44dd-4bfe-8a41-9909756defea.png'),
  whisky: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-aa6ba711-1e95-487f-8819-764c7f8f0509.png'),
  spreads: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-0f0faf36-462e-4ded-b85b-cb2cf096f913.png'),
  seafood: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-9a3be17c-6c88-4f97-bc54-3dd10e5a611f.png'),
  dairy: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-f4021821-1a6f-4a29-a265-35362a2200f0.png'),
  noodles: path.join(ASSETS, 'c__Users_7linkz_AppData_Roaming_Cursor_User_workspaceStorage_ef95db75b4d0e71a523af4219ea2deae_images_image-a735ae39-c248-41a7-b4ac-e3719627d40f.png'),
};

const GRID = {
  firstRowY: 178,
  rowStride: 255,
  col0: 18,
  colStride: 153,
  imgW: 130,
  imgH: 95,
};

/** name → crop meta from import batches 1–3 */
const CROP_META = [
  // batch 1
  { name: 'Goldberg Premium Lager', shot: 'drinks', col: 0, row: 0 },
  { name: 'Trophy Premium Lager', shot: 'drinks', col: 1, row: 0 },
  { name: 'Heineken Beer', shot: 'drinks', col: 2, row: 0 },
  { name: 'Nasco Banana Biscuits', shot: 'drinks', col: 0, rowY: 470 },
  { name: 'Palina Shortbread', shot: 'drinks', col: 1, rowY: 470 },
  { name: 'Nasco Exotic Creams', shot: 'drinks', col: 2, rowY: 470 },
  { name: 'Action Bitters', shot: 'drinks', col: 0, rowY: 760 },
  { name: 'Ace Bitters', shot: 'drinks', col: 1, rowY: 760 },
  { name: 'Princes Cupcake Vanilla', shot: 'cakes', col: 0, row: 0 },
  { name: 'Anchor Cake', shot: 'cakes', col: 1, row: 0 },
  { name: 'Khong Guan Milk Short Cake', shot: 'cakes', col: 2, row: 0 },
  { name: 'Parago Chewy Candy', shot: 'cakes', col: 0, rowY: 490 },
  { name: 'Parago Chewy Candy Chocolate', shot: 'cakes', col: 1, rowY: 490 },
  { name: 'Parago Chewy Candy Strawberry', shot: 'cakes', col: 2, rowY: 490 },
  { name: 'Golden Penny Amaizing Day Sachet', shot: 'cereals', col: 0, row: 0 },
  { name: 'Golden Penny Amaizing Day 600g', shot: 'cereals', col: 1, row: 0 },
  { name: 'Nasco Cornflakes', shot: 'cereals', col: 2, row: 0 },
  { name: 'Rendez Vous Sparkling', shot: 'cereals', col: 0, rowY: 490 },
  { name: 'Dominio De Sparkling', shot: 'cereals', col: 1, rowY: 490 },
  // batch 2
  { name: 'Lucozade Boost Carton', shot: 'energy', col: 0, rowY: 420 },
  { name: 'Lucozade Energy Bottle', shot: 'energy', col: 1, rowY: 420 },
  { name: 'Lucozade Boost Bottle', shot: 'energy', col: 2, rowY: 420 },
  { name: 'Golden Penny Semovita Small', shot: 'energy', col: 0, rowY: 740 },
  { name: 'Golden Penny Semovita 1kg', shot: 'energy', col: 1, rowY: 740 },
  { name: 'Tappy-O Tapioca', shot: 'energy', col: 2, rowY: 740 },
  { name: 'Chi Happy Hour Frooty Pouch', shot: 'juices', col: 0, rowY: 380 },
  { name: 'Chi Happy Hour Carton', shot: 'juices', col: 1, rowY: 380 },
  { name: 'Chi Exotic Pineapple Coconut Small', shot: 'juices', col: 2, rowY: 380 },
  { name: 'Big Ben London Dry Gin', shot: 'juices', col: 0, rowY: 700 },
  { name: 'Big Ben Chocolate', shot: 'juices', col: 1, rowY: 700 },
  { name: 'Chelsea London Dry Gin', shot: 'juices', col: 2, rowY: 700 },
  { name: 'Frolic Tomato Ketchup', shot: 'ketchup', col: 0, rowY: 460 },
  { name: 'Jago Mayonnaise', shot: 'ketchup', col: 1, rowY: 460 },
  { name: 'Dollys Tomato Ketchup', shot: 'ketchup', col: 2, rowY: 460 },
  { name: 'Bistro Beef Kilishi', shot: 'ketchup', col: 0, rowY: 780 },
  { name: 'Bistro Chicken Kilishi', shot: 'ketchup', col: 1, rowY: 780 },
  { name: 'Bistro Turkey Kilishi', shot: 'ketchup', col: 2, rowY: 780 },
  { name: 'Hennessy VS', shot: 'cognac', col: 0, rowY: 260 },
  { name: 'Martell Blue Swift', shot: 'cognac', col: 1, rowY: 260 },
  { name: 'Hennessy VSOP', shot: 'cognac', col: 2, rowY: 260 },
  { name: '4 Horses Liqueur', shot: 'cognac', col: 0, rowY: 540 },
  { name: 'Derok Cafe Liqueur Small', shot: 'cognac', col: 1, rowY: 540 },
  { name: 'Derok Cafe Liqueur', shot: 'cognac', col: 2, rowY: 540 },
  // batch 3
  { name: 'Royal St Andrews Whisky', shot: 'whisky', col: 0, rowY: 260 },
  { name: 'Best Class Whisky', shot: 'whisky', col: 1, rowY: 260 },
  { name: 'Seagrams Imperial Blue', shot: 'whisky', col: 2, rowY: 260 },
  { name: 'Mendoza Red Wine', shot: 'whisky', col: 0, rowY: 600 },
  { name: 'Baron Romeo Wine', shot: 'whisky', col: 1, rowY: 600 },
  { name: 'Baron De V Wine', shot: 'whisky', col: 2, rowY: 600 },
  { name: 'Vitali Cooking Margarine', shot: 'spreads', col: 0, rowY: 380 },
  { name: 'Kings Cooking Margarine', shot: 'spreads', col: 1, rowY: 380 },
  { name: 'Golden Penny Margarine Spread', shot: 'spreads', col: 2, rowY: 380 },
  { name: 'Golden Penny Sugar Sachet', shot: 'spreads', col: 0, rowY: 700 },
  { name: 'Dangote Granulated Sugar', shot: 'spreads', col: 1, rowY: 700 },
  { name: 'Golden Penny Sugar Pack', shot: 'spreads', col: 2, rowY: 700 },
  { name: 'Fally White Vinegar', shot: 'seafood', col: 0, rowY: 160 },
  { name: 'Bragg Apple Cider Vinegar', shot: 'seafood', col: 1, rowY: 160 },
  { name: 'Seablues Shrimps 500g', shot: 'seafood', col: 0, rowY: 420 },
  { name: 'Shammer Frozen Meat', shot: 'seafood', col: 1, rowY: 420 },
  { name: 'Seablues Shrimps Large', shot: 'seafood', col: 2, rowY: 420 },
  { name: 'Mr Chef Salt', shot: 'seafood', col: 0, rowY: 740 },
  { name: 'Dangote Salt Small', shot: 'seafood', col: 1, rowY: 740 },
  { name: 'Dangote Salt', shot: 'seafood', col: 2, rowY: 740 },
  { name: 'Hollandia Evaporated Milk', shot: 'dairy', col: 0, rowY: 200 },
  { name: 'Peak Evaporated Milk', shot: 'dairy', col: 1, rowY: 200 },
  { name: 'Three Crowns Evaporated Milk', shot: 'dairy', col: 2, rowY: 200 },
  { name: 'Maharana Rose Wine', shot: 'dairy', col: 0, rowY: 540 },
  { name: 'Awfod Double T Ofada Rice', shot: 'dairy', col: 1, rowY: 540 },
  { name: 'Big Bull Rice', shot: 'dairy', col: 2, rowY: 540 },
  { name: 'Cartier Classic Wine', shot: 'noodles', col: 0, rowY: 178 },
  { name: 'Bacchus Wine', shot: 'noodles', col: 1, rowY: 178 },
  { name: 'St Lauren Wine', shot: 'noodles', col: 2, rowY: 178 },
  { name: 'Minimie Noodles', shot: 'noodles', col: 0, rowY: 420 },
  { name: 'Indomie Noodles Chicken', shot: 'noodles', col: 1, rowY: 420 },
  { name: 'Indomie Noodles Onion Chicken', shot: 'noodles', col: 2, rowY: 420 },
  { name: 'Napa Sardines', shot: 'noodles', col: 0, rowY: 760 },
  { name: 'Titus Sardines', shot: 'noodles', col: 1, rowY: 760 },
  { name: 'Goya Extra Virgin Olive Oil', shot: 'noodles', col: 2, rowY: 760 },
];

const metaByName = new Map(CROP_META.map((p) => [p.name.trim().toLowerCase(), p]));

function regionFor(p) {
  const top =
    typeof p.rowY === 'number'
      ? p.rowY
      : GRID.firstRowY + (p.row || 0) * GRID.rowStride;
  return {
    left: GRID.col0 + p.col * GRID.colStride,
    top,
    width: GRID.imgW,
    height: GRID.imgH,
  };
}

async function buildSharpTile(srcBufOrPath) {
  const tile = await sharp(srcBufOrPath)
    .resize(Math.round(GRID.imgW * 4), Math.round(GRID.imgH * 4), {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
    })
    .sharpen({ sigma: 0.8, m1: 0.6, m2: 0.3 })
    .png()
    .toBuffer();

  const meta = await sharp(tile).metadata();
  const left = Math.floor((OUT_SIZE - meta.width) / 2);
  const top = Math.floor((OUT_SIZE - meta.height) / 2);
  return sharp({
    create: {
      width: OUT_SIZE,
      height: OUT_SIZE,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: tile, left: Math.max(0, left), top: Math.max(0, top) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

initializeApp({
  credential: applicationDefault(),
  projectId: 'go7-app-209e4',
});
const db = getFirestore();

async function main() {
  const dry = process.argv.includes('--dry');
  const outDir = path.join(root, 'justrite-import', 'app-crops-sharp');
  fs.mkdirSync(outDir, { recursive: true });

  const vendorRef = db.collection('vendors').doc(VENDOR_ID);
  const snap = await vendorRef.collection('products').where('source', '==', 'justrite-app-screenshot').get();
  console.log('Screenshot products:', snap.size);

  let ftp;
  if (!dry) {
    const host = process.env.GO7_FTP_HOST || '93.127.221.3';
    const user = process.env.GO7_FTP_USER || 'u135641057.go7.ng';
    const password = process.env.GO7_FTP_PASSWORD;
    if (!password) throw new Error('GO7_FTP_PASSWORD missing');
    ftp = new Client(180000);
    await ftp.access({ host, user, password, secure: false });
    console.log('FTP connected');
  }

  const remoteRoot = (process.env.GO7_FTP_REMOTE || '/public_html') + '/uploads';
  let updated = 0;
  let fallback = 0;
  let failed = 0;
  const results = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const name = String(data.name || '').trim();
    const key = name.toLowerCase();
    const meta = metaByName.get(key);
    const localOut = path.join(outDir, `${doc.id}.jpg`);

    try {
      let buf;
      if (meta && shots[meta.shot] && fs.existsSync(shots[meta.shot])) {
        const region = regionFor(meta);
        const cropBuf = await sharp(shots[meta.shot]).extract(region).png().toBuffer();
        buf = await buildSharpTile(cropBuf);
      } else if (data.imageUrl) {
        const r = await fetch(data.imageUrl);
        if (!r.ok) throw new Error(`fetch ${r.status}`);
        const src = Buffer.from(await r.arrayBuffer());
        buf = await buildSharpTile(src);
        fallback += 1;
      } else {
        throw new Error('no crop meta and no imageUrl');
      }

      fs.writeFileSync(localOut, buf);

      if (dry) {
        console.log('DRY', name, buf.length);
        updated += 1;
        continue;
      }

      const remoteDir = `${remoteRoot}/vendors/${VENDOR_ID}/products/${doc.id}`;
      const remoteName = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
      await ftp.ensureDir(remoteDir);
      await ftp.uploadFrom(localOut, `${remoteDir}/${remoteName}`);
      const imageUrl = `https://go7.ng/uploads/vendors/${VENDOR_ID}/products/${doc.id}/${remoteName}`;

      await doc.ref.set(
        {
          imageUrl,
          imageMirroredAt: FieldValue.serverTimestamp(),
          imageSharpenedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      updated += 1;
      results.push({ id: doc.id, name, imageUrl, bytes: buf.length });
      console.log('OK', name, `${buf.length}b`);
    } catch (e) {
      failed += 1;
      console.error('FAIL', name, e.message || e);
    }
  }

  if (ftp) ftp.close();

  const reportPath = path.join(root, 'justrite-import', 'sharpen-screenshot-images-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ updated, fallback, failed, outSize: OUT_SIZE, results }, null, 2)
  );
  console.log('\nDONE', { updated, fallback, failed, reportPath });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

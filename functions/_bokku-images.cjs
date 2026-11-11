const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dns = require('node:dns/promises');
const { parseEnv } = require('node:util');
const { Client } = require('basic-ftp');
const { chromium } = require('playwright');
const admin = require('firebase-admin');

const vendorId = 'VnVVHfdjQGP9qDUTgsOC';
const directory = path.join(process.env.TEMP, 'bokku-img');
const article = 'https://steemit.com/bakery/@ninapenda/hidden-delight-in-every-slice-at-bokku-mart-bakery';
const assets = [
  { id: '5dozRnGmKcH5Aj0xGOoj', name: 'Malta Guinness Can 33cl', price: 500, file: 'malta.jpg', page: 'https://www.surulerefoods.com/products/malta-guiness-can-330ml', url: 'https://www.surulerefoods.com/cdn/shop/files/1722631096769952.jpg?v=1756450414' },
  { id: 'HguirvPG7TnkYLMMCkJf', name: 'Bokku Bread Signature Loaf (800g-900g)', price: 1100, file: 'bokku-bread-original.jpg', page: article, url: 'https://steemitimages.com/p/32FTXiZsHoAW6noHJDhrg3W8ZKHVFSsLYM859aTDCF8iErX9oTNeV3AW8uLoFGBzF7isphSPQhTdAMjwFN7tETtBVCegFagLrcsMi3K9B9MYZg9YLno1hzko6SRhaUTwupQeY8ncxGAbZQUE?mode=fit&format=match&width=1280', crop: [320, 540, 350, 255] },
  { id: 'IxhVg3B1iPiX8dDBJQFa', name: 'Big Bull Parboiled Rice 25kg', price: 29000, file: 'rice25.png', page: 'https://bigbullrice.com/product-category/big-bull-rice/', url: 'https://bigbullrice.com/wp-content/uploads/2026/05/25kg-Holographic_-962x1024.png' },
  { id: 'X1iPTefS5HwqYtxpBuvg', name: 'Coca-Cola Bottle 50cl', price: 380, file: 'coke50cl.jpg', page: 'https://addide.com/products/coke-zero-pet-1ltr', url: 'https://addide.com/cdn/shop/products/1cb7623b1f4482595735b1486c8ea4bd_1024x.jpg?v=1625571266' },
  { id: 'bpBqnf6Tv3nLgADoFqpM', name: 'Big Bull Parboiled Rice 50kg', price: 57000, file: 'rice50.png', page: 'https://bigbullrice.com/product-category/big-bull-rice/', url: 'https://bigbullrice.com/wp-content/uploads/2026/05/50KG-Holographic_-835x1024.png' },
  { id: 'hW9kA5ygf43aqwFXY6fQ', name: 'Golden Penny Semovita 1kg', price: 1550, file: 'semovita1kg.jpg', page: 'https://www.shopperswarehouse.com/products/677/golden-penny-semovita-1kg', url: 'https://cdn.shopperswarehouse.com/live/images/51f4eb-1767091483966-b3d80f.jpg' },
  { id: 'pKcUrzbE7PSCFqIQyY86', name: 'Golden Penny Pasta 500g', price: 950, file: 'pasta.jpg', page: 'https://addide.com/products/golden-penny-spaghetti-500g', url: 'https://addide.com/cdn/shop/products/Golden-Penny-Spag-1_1024x.jpg?v=1597937562', variant: 'Spaghetti 500g' },
  { id: 'pr6nl6gql9BqNZkasqUC', name: 'Nylon (shopping bag)', price: 250, file: 'bokku-bag-candidate.jpg', page: article, url: 'https://steemitimages.com/p/32FTXiZsHoAW6noHJDhrg3W8ZKHVFSsLYM859aTDCF8iErMkxQyTZG7YKJVigZ5FLE3LnyaSmicXrvDiG8oyiRpYm9TpSmyMNCqDSmqVeBnBMPBy8cJZQdRu7tWhJWVeDUwJoEhfuMDCFiri?mode=fit&format=match&width=640' },
  { id: 'rBVMeG5CGfyu19xsrv6t', name: 'Indomie Chicken Noodles 70g', price: 250, file: 'indomie70g.jpg', page: 'https://addide.com/products/indomie-chicken-flavour', url: 'https://addide.com/cdn/shop/products/Indomie-Instant-Noodles-Chicken-Flavour-70g_1024x.jpg?v=1623756881' },
  { id: 'logo', name: 'Bokku Mart', file: 'bokku-square.jpg', page: 'https://www.bokku.com/', url: 'https://www.bokku.com/bokku.jpg' },
];
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const local = asset => path.join(directory, `${asset.id}.webp`);
const relative = asset => `vendors/${vendorId}/${asset.id === 'logo' ? 'branding' : `products/${asset.id}`}/sourced-${sha(fs.readFileSync(local(asset))).slice(0,16)}.webp`;
const imageUrl = asset => `https://go7.ng/uploads/${relative(asset)}`;

async function prepare() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const asset of assets) {
      const input = fs.readFileSync(path.join(directory, asset.file));
      const mime = asset.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const encoded = await page.evaluate(async ({ data, crop }) => {
        const image = new Image();
        image.src = data;
        await image.decode();
        const [x, y, w, h] = crop || [0, 0, image.naturalWidth, image.naturalHeight];
        if (x + w > image.naturalWidth || y + h > image.naturalHeight) throw new Error('Invalid crop');
        const scale = Math.min(1, 800 / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', 0.9).split(',')[1];
      }, { data: `data:${mime};base64,${input.toString('base64')}`, crop: asset.crop });
      fs.writeFileSync(local(asset), Buffer.from(encoded, 'base64'));
      console.log('PREPARED', asset.name, fs.statSync(local(asset)).size);
    }
  } finally {
    await browser.close();
  }
}

function validate(asset, doc, requireImage = false) {
  const data = doc.data();
  if (!doc.exists || (asset.id === 'logo' ? data.businessName !== asset.name : data.name !== asset.name || data.vendorId !== vendorId || data.basePrice !== asset.price || data.price !== asset.price)) throw new Error(`Record changed: ${asset.name}`);
  const fields = asset.id === 'logo' ? ['imageUrl', 'businessLogo', 'profileImage'] : ['imageUrl'];
  for (const field of fields) {
    if ((requireImage || data[field]) && data[field] !== imageUrl(asset)) throw new Error(`Image conflict: ${asset.name} ${field}`);
  }
}

async function verifyHttp(asset) {
  const response = await fetch(imageUrl(asset), { signal: AbortSignal.timeout(45000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid image response: ${asset.name} ${response.status}`);
  if (sha(Buffer.from(await response.arrayBuffer())) !== sha(fs.readFileSync(local(asset)))) throw new Error(`Image bytes differ: ${asset.name}`);
  console.log('HTTP VERIFIED', asset.name);
}

async function main() {
  const mode = process.argv[2] || '--check';
  if (mode === '--prepare') return prepare();
  if (!['--check', '--apply', '--verify'].includes(mode)) throw new Error('Unknown mode');
  admin.initializeApp({ projectId: 'go7-app-209e4' });
  const db = admin.firestore();
  const refFor = asset => db.doc(`vendors/${vendorId}${asset.id === 'logo' ? '' : `/products/${asset.id}`}`);
  const refs = assets.map(refFor);
  const snapshots = await db.getAll(...refs);
  assets.forEach((asset, i) => validate(asset, snapshots[i], mode === '--verify'));
  if (mode === '--verify') {
    for (const asset of assets) {
      await verifyHttp(asset);
      if (asset.id !== 'logo') validate(asset, await db.doc(`products/${asset.id}`).get(), true);
    }
    console.log('VERIFIED: branding, 9 products, 9 mirrors; prices unchanged');
    return;
  }
  assets.forEach(asset => console.log('PLAN', asset.name, imageUrl(asset)));
  if (mode !== '--apply') return;
  for (const name of ['.env', '.env.local', '.env.production', '.env.deploy']) {
    const file = path.join(__dirname, '..', name);
    if (fs.existsSync(file)) for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, 'utf8')))) {
      if (key.startsWith('GO7_FTP_') && !process.env[key]) process.env[key] = value;
    }
  }
  const host = process.env.GO7_FTP_HOST;
  const servername = 'business48-4.web-hosting.com';
  const [addresses, serverAddresses] = await Promise.all([dns.resolve4(host), dns.resolve4(servername)]);
  if (!addresses.some(ip => serverAddresses.includes(ip))) throw new Error('Hosting identity changed');
  if (!process.env.GO7_FTP_PASSWORD) throw new Error('FTP password not configured');
  const ftp = new Client(60000);
  try {
    await ftp.access({ host, user: process.env.GO7_FTP_USER, password: process.env.GO7_FTP_PASSWORD, secure: true, secureOptions: { rejectUnauthorized: true, servername } });
    for (const asset of assets) {
      const destination = `${process.env.GO7_FTP_REMOTE || '/public_html'}/uploads/${relative(asset)}`;
      await ftp.ensureDir(path.posix.dirname(destination));
      await ftp.uploadFrom(local(asset), destination);
      if (await ftp.size(destination) !== fs.statSync(local(asset)).size) throw new Error(`Upload size mismatch: ${asset.name}`);
      await verifyHttp(asset);
    }
  } finally {
    ftp.close();
  }
  await db.runTransaction(async tx => {
    const current = await tx.getAll(...refs);
    assets.forEach((asset, i) => validate(asset, current[i]));
    for (const [i, asset] of assets.entries()) {
      const update = {
        imageUrl: imageUrl(asset),
        imageSource: { page: asset.page, url: asset.url, originalSha256: sha(fs.readFileSync(path.join(directory, asset.file))), crop: asset.crop || null, variant: asset.variant || null, previousImageUrl: current[i].data().imageUrl || null },
        imageMirroredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (asset.id === 'logo') Object.assign(update, { businessLogo: update.imageUrl, profileImage: update.imageUrl });
      tx.update(refs[i], update);
    }
  });
  console.log('APPLIED: image fields only on Bokku and its 9 products');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

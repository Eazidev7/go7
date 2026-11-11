/**
 * Download Justrite WooCommerce store catalog + product images.
 * Saves to ../justrite-import/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'justrite-import');
const imgDir = path.join(outDir, 'images');
const base = 'https://justriteonline.com/wp-json/wc/store/v1/products';

fs.mkdirSync(imgDir, { recursive: true });

function slugify(name) {
  return String(name || 'product')
    .toLowerCase()
    .replace(/&#\d+;/g, '')
    .replace(/&[^;]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function fetchAllProducts() {
  const all = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const url = `${base}?per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GO7CatalogBot/1.0)' },
    });
    if (!res.ok) throw new Error(`Store API ${res.status} ${url}`);
    totalPages = Number(res.headers.get('x-wp-totalpages') || 1);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    console.log(`Page ${page}/${totalPages}: +${batch.length} (total ${all.length})`);
    page += 1;
  }
  return all;
}

async function downloadImage(imageUrl, destPath) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GO7CatalogBot/1.0)' },
  });
  if (!res.ok) throw new Error(`Image ${res.status} ${imageUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  const products = await fetchAllProducts();
  const catalog = [];
  let ok = 0;
  let fail = 0;

  for (const p of products) {
    const img = p.images?.[0]?.src || null;
    const slug = p.slug || slugify(p.name);
    const ext = img ? path.extname(new URL(img).pathname) || '.png' : '';
    const localName = img ? `${slug}${ext}` : null;
    const localPath = localName ? path.join(imgDir, localName) : null;

    const entry = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      permalink: p.permalink,
      description: (p.short_description || p.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      categories: (p.categories || []).map((c) => c.name),
      price: p.prices?.price ?? null,
      regular_price: p.prices?.regular_price ?? null,
      currency: p.prices?.currency_code ?? null,
      in_stock: p.is_in_stock,
      purchasable: p.is_purchasable,
      imageUrl: img,
      localImage: localName ? `images/${localName}` : null,
    };

    if (img && localPath) {
      try {
        if (!fs.existsSync(localPath)) {
          const bytes = await downloadImage(img, localPath);
          console.log(`IMG OK ${localName} (${bytes} bytes)`);
        } else {
          console.log(`IMG skip exists ${localName}`);
        }
        ok += 1;
      } catch (e) {
        console.warn(`IMG FAIL ${slug}: ${e.message}`);
        entry.localImage = null;
        entry.imageError = e.message;
        fail += 1;
      }
    } else {
      console.warn(`NO IMAGE ${slug}`);
      fail += 1;
    }

    catalog.push(entry);
  }

  const summary = {
    source: 'https://justriteonline.com',
    pulledAt: new Date().toISOString(),
    productCount: catalog.length,
    imagesDownloadedOk: ok,
    imagesFailedOrMissing: fail,
    note: 'Prices on Justrite web/API are typically 0 — update manually from their app for GO7.',
    products: catalog,
  };

  fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(summary, null, 2));
  console.log('\nDONE');
  console.log(JSON.stringify({
    products: catalog.length,
    imagesOk: ok,
    imagesFail: fail,
    outDir,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

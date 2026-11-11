import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  OUTPUT_DIR,
  RAW_VIDEO,
  BASE_URL,
  VENDOR_URL,
  DEVICE,
  TIMING,
} from './config.mjs';
import {
  sleep,
  pause,
  smoothScroll,
  injectMarketingStyles,
  dismissNoise,
  clickFirst,
  waitForAppReady,
} from './helpers.mjs';

async function renameLatestVideo(dir, target) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.webm'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error('No Playwright video file found in ' + dir);
  fs.renameSync(path.join(dir, files[0].f), target);
}

async function runFlow(page) {
  console.log('1/5 Home');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await injectMarketingStyles(page);
  await waitForAppReady(page);
  await dismissNoise(page);
  await pause(page, TIMING.heroHoldMs);
  await smoothScroll(page, 420);
  await pause(page, TIMING.heroHoldMs);

  console.log('2/5 Explore / vendor');
  const explored = await clickFirst(page, [
    (p) => p.getByRole('button', { name: /explore/i }),
    (p) => p.getByText(/explore go7/i),
    (p) => p.locator('nav').getByText(/explore/i),
    (p) => p.getByText(/trending|local market|near you/i),
  ], { timeout: 12000 });

  if (explored) {
    await pause(page);
    await clickFirst(page, [
      (p) => p.locator('a[href*="/vendor/"]').first(),
      (p) => p.locator('[class*="vendor"]').filter({ hasText: /.+/ }).first(),
      (p) => p.getByRole('link').filter({ hasText: /food|place|kitchen|shop/i }).first(),
    ], { timeout: 12000 });
    await pause(page);
  }

  const onVendor = /\/vendor\//i.test(page.url());
  if (!onVendor) {
    console.log('   Fallback: direct vendor menu');
    await page.goto(VENDOR_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitForAppReady(page, 15000);
    await pause(page, TIMING.heroHoldMs);
  }

  console.log('3/5 Add product');
  await smoothScroll(page, 320);
  const added = await clickFirst(page, [
    (p) => p.getByRole('button', { name: /add to cart/i }),
    (p) => p.getByRole('button', { name: /^add$/i }),
    (p) => p.locator('button').filter({ hasText: /add to cart/i }),
    (p) => p.locator('button').filter({ hasText: /^\+$/ }),
  ], { timeout: 15000 });

  if (!added) {
    console.warn('   Could not find Add to Cart — continuing for B-roll');
  } else {
    await pause(page, TIMING.heroHoldMs);
  }

  console.log('4/5 Cart');
  if (!/\/vendor\//i.test(page.url())) {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page, 15000);
    await pause(page);
  }

  const openedCart = await clickFirst(page, [
    (p) => p.getByRole('button', { name: /cart/i }),
    (p) => p.locator('[class*="cart"]').filter({ hasText: /cart|\d+/i }).first(),
    (p) => p.locator('a[href*="cart"]').first(),
    (p) => p.getByText(/view cart|go to cart|my cart/i),
  ], { timeout: 15000 });

  if (!openedCart) {
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/GO7Cart`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    }).catch(() => {});
    await pause(page, TIMING.heroHoldMs);
  } else {
    await pause(page, TIMING.heroHoldMs);
  }

  console.log('5/5 Checkout');
  await smoothScroll(page, 260);
  await clickFirst(page, [
    (p) => p.getByRole('button', { name: /checkout|proceed|place order|confirm/i }),
    (p) => p.getByText(/checkout|proceed to pay|pay now/i),
  ], { timeout: 12000 });
  await pause(page, TIMING.heroHoldMs * 1.5);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(RAW_VIDEO)) fs.unlinkSync(RAW_VIDEO);

  console.log('Recording GO7 marketing flow');
  console.log('  URL:', BASE_URL);
  console.log('  Vendor fallback:', VENDOR_URL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...DEVICE,
    locale: 'en-NG',
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: DEVICE.viewport.width, height: DEVICE.viewport.height },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    await runFlow(page);
  } catch (err) {
    console.error('Flow error (partial video may still be usable):', err.message);
  }

  await context.close();
  await browser.close();
  await renameLatestVideo(OUTPUT_DIR, RAW_VIDEO);

  console.log('Raw recording saved:', RAW_VIDEO);
  console.log('Next: npm run video:polish');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const OUTPUT_DIR = path.join(__dirname, 'output');
export const RAW_VIDEO = path.join(OUTPUT_DIR, 'raw-flow.webm');
export const POLISHED_VIDEO = path.join(OUTPUT_DIR, 'go7-home-cart-checkout.mp4');
export const POLISHED_VERTICAL = path.join(OUTPUT_DIR, 'go7-home-cart-checkout-9x16.mp4');

export const BASE_URL = process.env.GO7_VIDEO_URL || 'https://go7.ng';
export const VENDOR_ID = process.env.GO7_VIDEO_VENDOR_ID || '5IVcJjcE0GU5aq2gEOBemf7U2G22';
export const VENDOR_URL =
  process.env.GO7_VIDEO_VENDOR_URL || `${BASE_URL.replace(/\/$/, '')}/vendor/${VENDOR_ID}`;

export const DEVICE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

export const TIMING = {
  splashMaxMs: 25000,
  stepPauseMs: 1400,
  scrollPauseMs: 900,
  tapPauseMs: 700,
  heroHoldMs: 2200,
};

export const BRAND = {
  red: '#E30613',
  title: 'GO7',
  tagline: 'Home to Cart to Checkout',
  cta: 'Order on go7.ng',
};

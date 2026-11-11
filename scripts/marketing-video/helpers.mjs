import { TIMING } from './config.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function pause(page, ms = TIMING.stepPauseMs) {
  await sleep(ms);
}

export async function smoothScroll(page, deltaY, steps = 12) {
  const step = deltaY / steps;
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, step);
    await sleep(40);
  }
  await sleep(TIMING.scrollPauseMs);
}

export async function injectMarketingStyles(page) {
  await page.addStyleTag({
    content: `
      * { scroll-behavior: smooth !important; }
      [class*="cookie"], [id*="cookie"], [class*="Cookie"],
      .intercom-lightweight-app, #intercom-container {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });
}

export async function dismissNoise(page) {
  const dismissTexts = ['Not now', 'Maybe later', 'Skip', 'Close', 'No thanks', 'Dismiss', 'Later', 'Got it', 'OK'];
  for (const label of dismissTexts) {
    try {
      const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      if (await btn.isVisible({ timeout: 400 })) {
        await btn.click({ timeout: 2000 });
        await sleep(400);
      }
    } catch { /* ignore */ }
  }
}

export async function clickFirst(page, locators, { timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const locator of locators) {
      try {
        const el = typeof locator === 'function' ? locator(page) : locator;
        const target = el.first();
        if (await target.isVisible({ timeout: 500 })) {
          await target.scrollIntoViewIfNeeded().catch(() => {});
          await sleep(TIMING.tapPauseMs);
          await target.click({ timeout: 3000 });
          return true;
        }
      } catch { /* try next */ }
    }
    await sleep(300);
  }
  return false;
}

export async function waitForAppReady(page, maxMs = TIMING.splashMaxMs) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const text = await page.locator('body').innerText().catch(() => '');
    const loading = /loading/i.test(text) && !/explore|home|vendor|menu|cart|checkout|go7|order/i.test(text);
    if (!loading && text.length > 80) return true;
    await dismissNoise(page);
    await sleep(500);
  }
  return false;
}

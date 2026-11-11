/**
 * Mobile UI QA for /book-delivery/ai — real browser, real emulator chat
 * callable, real production Firestore behind it.
 *
 * Requires: vite dev on :3000 with VITE_USE_FUNCTIONS_EMULATOR=true and the
 * functions emulator on :5001.
 */
const puppeteer = require('puppeteer');

const BASE = 'http://localhost:3000';
const SHOT = 'C:/Users/7linkz/Desktop/go7/qa-shots';
const EMAIL = 'go7-ai-qa@example.com';
const PASS = 'Go7QA!Test#2024';

const fs = require('fs');
fs.mkdirSync(SHOT, { recursive: true });

const results = [];
const ok = (n, d = '') => { results.push(1); console.log(`✅ ${n} ${d}`); };
const bad = (n, d = '') => { results.push(0); console.log(`❌ ${n} ${d}`); };
const check = (c, n, d = '') => (c ? ok(n, d) : bad(n, d));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 160)));
  page.on('console', (m) => {
    const t = m.text();
    if (/error|failed/i.test(t) && !/favicon|DevTools|deprecat/i.test(t)) console.log('  [console]', t.slice(0, 160));
  });

  const waitSel = async (sel, ms = 20000) => {
    try { await page.waitForSelector(sel, { timeout: ms }); return true; }
    catch { return false; }
  };

  // ---- 1. load ----
  await page.goto(`${BASE}/book-delivery/ai`, { waitUntil: 'networkidle2', timeout: 60000 });
  await waitSel('header', 25000);
  await page.screenshot({ path: `${SHOT}/01-load.png` });
  check(await page.$('header'), 'header renders');
  const headerText = await page.$eval('header', (el) => el.innerText).catch(() => '');
  check(/Go7 Delivery Assistant/.test(headerText), 'assistant title', headerText.replace(/\n/g, ' | ').slice(0, 80));
  check(/Online/.test(headerText), 'online indicator');
  check(await page.$('input'), 'input field renders');
  check((await page.$$('header button, header a')).length >= 2, 'back + manual-form controls present');

  // ---- 2. sign in via the app's own firebase auth instance ----
  const signedIn = await page.evaluate(async (email, pass) => {
    try {
      const cfg = await import('/src/firebase/config.js');
      const mod = await import('/node_modules/.vite/deps/firebase_auth.js');
      await mod.signInWithEmailAndPassword(cfg.auth, email, pass);
      return cfg.auth.currentUser?.uid || null;
    } catch (e) { return 'ERR:' + e.message; }
  }, EMAIL, PASS);
  console.log('  sign-in:', signedIn);

  // wait for greeting / start-session reply
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: `${SHOT}/02-greeting.png` });
  const greeted = await page.evaluate(() => document.body.innerText);
  check(/Hi|delivery assistant|sign in/i.test(greeted), 'greeting or auth state visible');

  const waitReply = async (timeout = 60000) => {
    const t0 = Date.now();
    let idle = 0;
    while (Date.now() - t0 < timeout) {
      const typing = await page.evaluate(() => /typing/i.test(document.body.innerText));
      if (typing) { idle = 0; }
      else { idle += 1; if (idle >= 4) return; } // ~2s of no-typing = settled
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  const typeAndSend = async (text) => {
    const sel = 'input[placeholder*="message" i]';
    await waitSel(sel);
    // Type via keyboard events so React's controlled input updates; verify the
    // value actually landed (retry once if hydration raced us).
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.click(sel, { clickCount: 3 }).catch(() => {});
      await page.keyboard.press('Backspace');
      await page.type(sel, text, { delay: 10 });
      const v = await page.$eval(sel, (el) => el.value);
      if (v.includes(text.slice(0, 12))) break;
    }
    // click the send button (works even while a previous turn is busy — queued)
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Send"]')
        || [...document.querySelectorAll('form button[type="submit"]')][0];
      btn?.click();
    });
    await waitReply();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${SHOT}/msg-${text.slice(0, 18).replace(/\W/g, '_')}.png` });
    return page.evaluate(() => document.body.innerText);
  };

  // ---- 3. booking sentence ----
  let body = await typeAndSend('I want to send a laptop from Kuto to FUNAAB.');
  console.log('   after msg1:', body.slice(0, 300).replace(/\n+/g, ' | '));
  check(/pickup at|want pickup|Got it/i.test(body), 'pickup resolve reply shown');

  // ---- 4. confirm locations (click Confirm buttons) ----
  const clickBtn = async (re, waitMs = 15000, last = false) => {
    const t0 = Date.now();
    while (Date.now() - t0 < waitMs) {
      const found = await page.evaluate((reSrc, pickLast) => {
        const rx = new RegExp(reSrc, 'i');
        const btns = [...document.querySelectorAll('button')].filter((b) => rx.test(b.innerText));
        const btn = pickLast ? btns[btns.length - 1] : btns[0];
        if (btn) { btn.click(); return btn.innerText; }
        return null;
      }, re.source, last);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  };

  let clicked = await clickBtn(/^Confirm$|^Yes/i);
  check(!!clicked, 'confirm pickup clicked', clicked);
  await waitReply();
  // dropoff: candidate card (name button) or single-location Confirm card —
  // use the LAST Confirm so we don't re-hit the stale pickup card.
  clicked = (await clickBtn(/^FUNAAB/, 3000)) || (await clickBtn(/^Confirm$/, 15000, true));
  check(!!clicked, 'confirm dropoff clicked', clicked);
  await waitReply();
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOT}/03-confirmed.png` });

  // ---- 5. package chips (item already known → may skip to recipient) ----
  body = await page.evaluate(() => document.body.innerText);
  if (/what are you sending|what.*sending/i.test(body)) {
    await clickBtn(/Laptop/);
    await waitReply();
  }
  body = await typeAndSend('The recipient is Tobiloba, his number is 08012345678');
  await page.screenshot({ path: `${SHOT}/04-recipient.png` });

  // quote may auto-appear; if not, ask
  body = await page.evaluate(() => document.body.innerText);
  if (!/Total|delivery fee/i.test(body)) {
    body = await typeAndSend('How much will it cost?');
  }
  await page.screenshot({ path: `${SHOT}/05-quote.png` });
  check(/₦[\d,]+/.test(body), 'quote card shows authoritative ₦ amount', (body.match(/₦[\d,]+/g) || []).join(' '));

  // ---- 6. confirm quote → payment options → wallet pay ----
  await clickBtn(/Continue to payment/i);
  await waitReply();
  body = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${SHOT}/06-payment-options.png` });
  check(/pay|wallet|card/i.test(body), 'payment options shown');

  await clickBtn(/Wallet/i);
  await waitReply();
  body = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${SHOT}/07-payment.png` });
  check(/Go7-\w+/.test(body), 'booking id shown', body.match(/Go7-\w+/)?.[0]);

  await clickBtn(/^Pay ₦|Pay .*Wallet/i);
  await waitReply(60000);
  body = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${SHOT}/08-after-pay.png` });
  check(/finding|rider|confirmed|Payment/i.test(body), 'post-payment state', body.match(/finding a rider|Rider found|Payment confirmed/i)?.[0]);

  // give dispatch + follow-up a moment, check tracking button
  await new Promise((r) => setTimeout(r, 6000));
  body = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${SHOT}/09-dispatch.png` });
  const hasTrack = /Track Delivery/i.test(body);
  const hasFinding = /finding|searching/i.test(body);
  check(hasTrack || hasFinding, 'dispatch state (track or searching)');

  // ---- 7. long message + scrolling + small screen sanity ----
  await typeAndSend('This is a very long message meant to test how the chat handles longer customer input without breaking the layout or overlapping the input bar at the bottom of the screen.');
  await page.screenshot({ path: `${SHOT}/10-long.png` });
  const inputVisible = await page.evaluate(() => {
    const el = document.querySelector('input[placeholder*="message" i]');
    const r = el?.getBoundingClientRect();
    return r && r.bottom <= window.innerHeight && r.top >= 0;
  });
  check(inputVisible, 'input stays visible after long messages');

  // manual fallback link still present
  check(/Manual form/i.test(await page.$eval('header', (el) => el.innerText)), 'manual fallback reachable');

  await browser.close();
  const fails = results.filter((r) => !r).length;
  console.log(`\n===== ${results.length - fails}/${results.length} PASSED =====`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('QA FATAL:', e.message); process.exit(1); });

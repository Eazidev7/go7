/* Prod smoke — verify /book-delivery/ai renders on go7.ng (no sign-in needed). */
const puppeteer = require('puppeteer');

(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));

  await p.goto('https://go7.ng/book-delivery/ai', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 7000));
  const t = await p.evaluate(() => document.body.innerText);
  await p.screenshot({ path: 'qa-shots/prod-01.png' });

  console.log('TITLE:', await p.title());
  console.log('URL:', p.url());
  console.log('HAS ASSISTANT:', /Go7 Delivery Assistant/i.test(t));
  console.log('HAS INPUT:', !!(await p.$('input')));
  console.log('HAS MANUAL LINK:', /Manual form/i.test(t));
  console.log('HAS GREETING/SIGNIN:', /Hi 👋|sign in|delivery assistant/i.test(t));
  console.log('BODY:', t.replace(/\n+/g, ' | ').slice(0, 320));
  console.log('PAGEERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });

// QA: auth screen — OTP box speed + friendly errors
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE || 'http://localhost:4173';
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

// 1. Real user path: guest gets the auth sheet (auto-gate or via Profile/login link)
const sheet = page.locator('.auth-sheet');
await sheet.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
if (!(await sheet.isVisible().catch(() => false))) {
  const profileTab = page.locator('button:has-text("Profile"), a:has-text("Profile")').first();
  if (await profileTab.isVisible().catch(() => false)) await profileTab.click();
  await page.waitForTimeout(1500);
}
if (!(await sheet.isVisible().catch(() => false))) {
  const loginLink = page.locator('.login-link, .get-started-btn, button:has-text("Log in")').first();
  if (await loginLink.isVisible().catch(() => false)) await loginLink.click();
  await page.waitForTimeout(1500);
}
check('auth sheet opens', await sheet.isVisible().catch(() => false));

// ensure login mode (sheet may open in signup mode)
const phoneTab = page.locator('.method-btn', { hasText: 'Phone' });
if (await sheet.isVisible().catch(() => false) && !(await phoneTab.isVisible().catch(() => false))) {
  const loginSwitch = page.locator('.auth-btn.secondary').first();
  if (await loginSwitch.isVisible().catch(() => false)) { await loginSwitch.click(); await page.waitForTimeout(400); }
}

// 2. Phone OTP: enter valid-format nonexistent phone → OTP box appears fast, error is friendly
const phoneInput = page.locator('.auth-sheet input#phone');
if (await phoneInput.isVisible().catch(() => false)) {
  await phoneInput.fill('08123456789');
  const t0 = Date.now();
  await page.locator('.auth-btn.primary').click();
  const otpInput = page.locator('.auth-sheet input#otp');
  await otpInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const ms = Date.now() - t0;
  check('OTP box visible after Send tap', await otpInput.isVisible(), `${ms}ms`);
  check('OTP box appears fast (<500ms)', ms < 500, `${ms}ms`);

  const subtitle = await page.locator('.otp-step-subtitle').innerText().catch(() => '');
  check('"Sending code…" state shows', /sending code/i.test(subtitle) || /code sent/i.test(subtitle), subtitle.trim());

  // wait for send to fail (not-found) → friendly inline error, no raw Firebase text
  await page.waitForTimeout(12000);
  const errBanner = await page.locator('.otp-error-banner').innerText().catch(() => '');
  check('friendly error on send failure', errBanner.length > 0, errBanner.trim().slice(0, 90));
  check('no raw Firebase text', !/firebase|auth\/|FirebaseError/i.test(errBanner), errBanner.trim().slice(0, 90));

  // back to step 1
  const backBtn = page.locator('.auth-sheet button', { hasText: 'Change Phone Number' });
  if (await backBtn.isVisible().catch(() => false)) await backBtn.click();
  await page.waitForTimeout(300);
}

// 3. Email login: wrong credentials → friendly message
const emailTab = page.locator('.method-btn', { hasText: 'Email' });
if (await emailTab.isVisible().catch(() => false)) {
  await emailTab.click();
  await page.waitForTimeout(300);
  await page.locator('.auth-sheet input#email').fill('notreal@example.com');
  await page.locator('.auth-sheet input#password').fill('wrongpass1');
  await page.locator('.auth-btn.primary').click();
  await page.waitForTimeout(8000);
  // toast holds the error
  const toasts = await page.locator('[class*="toast"], [role="status"]').allInnerTexts().catch(() => []);
  const raw = toasts.join(' | ');
  check('email error toast shown', raw.length > 0, raw.slice(0, 100));
  check('email error is friendly (no raw firebase)', !/firebase:|auth\/|FirebaseError/i.test(raw), raw.slice(0, 100));
  check('mentions incorrect/no account', /incorrect|no account|valid email/i.test(raw), raw.slice(0, 100));
}

check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ').slice(0, 200));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);

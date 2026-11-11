import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ ...devices['Pixel 7'] });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Food', exact: true }).click({ timeout: 60000 });
  await page.getByText('Dalish Restaurant', { exact: true }).first().waitFor({ timeout: 60000 });
  assert.equal(await page.getByText('No vendors found', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Restaurants', exact: true }).waitFor();
  console.log('PASS: Food opens restaurant results');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('button', { name: 'Groceries', exact: true }).click({ timeout: 30000 });
  await page.getByText('Bokku Mart', { exact: true }).first().click({ timeout: 30000 });
  const root = page.locator('.go7-page-flow--fill');
  const scroller = root.locator(':scope > .overflow-y-auto');
  const categories = scroller.locator(':scope > .sticky');
  const cards = scroller.locator('div.rounded-2xl').filter({ has: page.locator('h3') });
  await categories.getByRole('button', { name: 'Bakery', exact: true }).waitFor({ timeout: 60000 });
  for (const name of ['Pantry', 'Drinks', 'Household']) {
    await categories.getByRole('button', { name, exact: true }).waitFor();
  }
  await categories.getByRole('button', { name: 'Bakery', exact: true }).click();
  assert.equal(await cards.count(), 1);
  assert.match(await cards.first().innerText(), /Bokku Bread Signature/);
  await categories.getByRole('button', { name: 'All', exact: true }).click();
  assert.equal(await cards.count(), 9);
  const search = page.getByPlaceholder('Search menu items...');
  await search.fill('Semovita');
  assert.equal(await cards.count(), 1);
  assert.match(await cards.first().innerText(), /Golden Penny Semovita 1kg/);
  await search.fill('');
  assert.equal(await cards.count(), 9);
  console.log('PASS: actual menu categories and search filter the correct products');
  await root.locator('img').evaluateAll(images => Promise.all(images.map(image => {
    image.loading = 'eager';
    return image.decode();
  })));
  const rice = cards.filter({ has: page.getByRole('heading', { name: 'Big Bull Parboiled Rice 50kg', exact: true }) });
  await rice.getByRole('button', { name: 'Add', exact: true }).click();
  await rice.getByRole('button', { name: 'Increase quantity', exact: true }).waitFor();
  for (const [width, height] of [[320, 640], [390, 844], [412, 839], [768, 1024], [667, 375]]) {
    await page.setViewportSize({ width, height });
    await scroller.evaluate(el => { el.scrollTop = 850; });
    await page.waitForTimeout(400);
    const headerRect = await root.locator(':scope > .sticky').boundingBox();
    const categoryRect = await categories.boundingBox();
    assert.ok(Math.abs(categoryRect.y - headerRect.y - headerRect.height) <= 2, `Sticky gap at ${width}: ${JSON.stringify({ headerRect, categoryRect })}`);
    const overflow = await root.evaluate(el => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, root: el.scrollWidth, width: el.clientWidth }));
    assert.ok(overflow.page <= overflow.viewport + 1 && overflow.root <= overflow.width + 1, `Page overflow at ${width}`);
    const controls = await rice.evaluate(el => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll('button, h3')].map(item => {
        const r = item.getBoundingClientRect();
        return { text: item.textContent, fits: r.left >= box.left && r.right <= box.right + 1, clipped: item.scrollWidth > item.clientWidth + 1 };
      });
    });
    assert.ok(controls.every(control => control.fits && !control.clipped), `Card clipped at ${width}: ${JSON.stringify(controls)}`);
    await page.screenshot({ path: `qa-shots/menu-after-${width}x${height}.png` });
    await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(400);
    const last = await cards.last().boundingBox();
    const scrollBox = await scroller.boundingBox();
    const nav = await page.locator('.go7-bottom-nav').boundingBox();
    assert.ok(last.y + last.height <= Math.min(scrollBox.y + scrollBox.height, nav.y) + 1, `Last menu item hidden at ${width}`);
    console.log(`PASS: ${width}x${height} sticky categories, card controls, names, last-item clearance`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser errors; guest cart only, no order submitted');
} finally {
  await browser.close();
}

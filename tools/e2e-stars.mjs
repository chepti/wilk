// בדיקת קצה לקצה: משחקים את תחנה 1 כאורח, בודקים איכות/כוכבים/כניסות, מצלמים מסך סיום, מפה ועמוד הורים.
// node tools/e2e-stars.mjs [baseUrl]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';
const SHOTS = path.join(ROOT, 'tools', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'e2e', emoji: '⚽', freeNav: true })); });
await page.reload();
await page.waitForSelector('.star-node');
// נגיעה במפה → הפעילות נפתחת ישר (בלי מסך ביניים)
await page.click('.star-node >> nth=0');
await page.waitForSelector('.stage > *');
const direct = !(await page.$('.play-big'));

const unit = await (await page.request.get(new URL('content/u1.json', base).href)).json();
const closeAssist = async () => { await page.evaluate(() => document.querySelector('.assist-bubble .btn.star')?.click()); await page.waitForTimeout(300); };
const count = () => page.$eval('.player-count', (e) => e.textContent.trim());

for (let guard = 0; guard < 30; guard++) {
  const c = await count().catch(() => null);
  if (!c) break; // מסך הסיום
  const i = +c.split('/')[0] - 1;
  const s = unit.slides[i];
  await page.waitForTimeout(500);
  await closeAssist();
  if (s.kind === 'tappingBoard') {
    const n = await page.$$eval('.trace', (t) => t.length);
    for (let k = 0; k < n; k++) {
      await page.evaluate((k) => document.querySelectorAll('.trace')[k].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), k);
      await page.waitForTimeout(150);
    }
  }
  if (s.kind === 'findAnswer') {
    for (let q = 0; q < s.content.questions.length; q++) {
      await closeAssist();
      await page.waitForTimeout(2500); // שמע השאלה
      const n = await page.$$eval('.trace', (t) => t.length);
      for (let k = 0; k < n; k++) {
        await page.evaluate((k) => document.querySelectorAll('.trace')[k]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), k);
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(4500);
      if ((await count().catch(() => '')) !== c) break; // עבר לשקף הבא
    }
  }
  if ((await count().catch(() => null)) === c) await page.click('.nav-arrow.next');
  await page.waitForTimeout(400);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(SHOTS, 'e2e-done.png') });

const store = await page.evaluate(() => JSON.parse(localStorage.getItem('wilk_guest_e2e_⚽') || '{}'));
console.log('direct open from map:', direct);
console.log('slides q:', Object.fromEntries(Object.entries(store.slides ?? {}).map(([k, v]) => [k, v.q])));
console.log('position u1:', store.positions?.u1);

await page.evaluate(() => { location.hash = '/map'; });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(SHOTS, 'e2e-map.png') });
await page.evaluate(() => { location.hash = '/parents'; });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(SHOTS, 'e2e-parents.png'), fullPage: true });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();

// בודק לאן המפה גוללת בכניסה ראשונה (תלמיד חדש): node tools/scroll-check.mjs [baseUrl]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const vp of [{ width: 390, height: 844 }, { width: 1400, height: 900 }]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('text=מתחילים כאן!');
  await page.fill('input[placeholder="השם הפרטי שלי"]', 'בדיקה');
  await page.click('.avatar-btn >> nth=3');
  await page.click('button:has-text("יוצאים לדרך")');
  await page.waitForSelector('.jnode');
  for (const t of [300, 1500]) {
    await page.waitForTimeout(t);
    const r = await page.evaluate(() => {
      const n = document.querySelectorAll('.jnode')[0].getBoundingClientRect();
      return { scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, chest1Top: Math.round(n.top), inView: n.top > 0 && n.bottom < innerHeight };
    });
    console.log(vp.width, `after ${t}ms`, JSON.stringify(r));
  }
  await page.screenshot({ path: path.join(ROOT, 'tools', 'shots', `scroll-${vp.width}.png`) });
  await page.close();
}
await browser.close();

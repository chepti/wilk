// מעבר על כל השקפים בדפדפן אמיתי (Edge headless): טקסט שחורג מהבמה, הקטנות אוטומטיות, תמונות שבורות, שגיאות.
// node tools/browser-sweep.mjs [baseUrl] [--shots u10/7,u2/11]
//   baseUrl ברירת מחדל: http://localhost:5178/wilk/   צילומים נשמרים ב-tools/shots/
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5178/wilk/';
const shotsArg = args[args.indexOf('--shots') + 1];
const shots = args.includes('--shots') ? new Set((shotsArg ?? '').split(',').filter(Boolean)) : null;
const onlyShots = shots && shots.size > 0;
const SHOT_DIR = path.join(ROOT, 'tools', 'shots');
if (shots) fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(base);
await page.evaluate(() => localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'sweep', emoji: '⭐', freeNav: true })));
await page.reload();
const catalog = await (await page.request.get(new URL('content/units.json', base).href)).json();

const bad = [], shrunk = [];
let n = 0;
for (const u of catalog) {
  for (let s = 1; s <= u.slides; s++) {
    const key = `${u.id}/${s}`;
    if (onlyShots && !shots.has(key)) continue;
    errors.length = 0;
    await page.evaluate((h) => { location.hash = h; }, `/unit/${key}`);
    // בלי נגיעה קודמת בדף מופיע כפתור התחלה אחד; אחרת הפעילות נפתחת ישר
    await page.waitForSelector('.play-big, .stage > *', { timeout: 8000 });
    if (await page.$('.play-big')) await page.click('.play-big');
    await page.waitForSelector('.stage > *', { timeout: 8000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    // סוגרים חלון הוראות אם יש, כדי שהצילום יראה את השקף
    if (shots) { await page.evaluate(() => (document.querySelector('.assist-bubble .btn.star'))?.click()); await page.waitForTimeout(400); }
    const r = await page.evaluate(() => {
      const st = document.querySelector('.stage');
      const R = st.getBoundingClientRect();
      const k = R.width / 1920;
      const out = [], sh = [];
      for (const t of st.querySelectorAll('.text-sticker')) {
        const vis = [...t.querySelectorAll('.rich')].find((r) => !r.closest('.text-measure'));
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        vis.querySelectorAll('span').forEach((sp) => {
          if (!sp.textContent.trim()) return;
          for (const rr of sp.getClientRects()) { x0 = Math.min(x0, rr.left); x1 = Math.max(x1, rr.right); y0 = Math.min(y0, rr.top); y1 = Math.max(y1, rr.bottom); }
        });
        if (x0 > 1e8) continue;
        const txt = vis.innerText.trim().replace(/\s+/g, ' ').slice(0, 40);
        const m = (t.style.transform + ' ' + (t.querySelector('[style*="scale"]')?.style.transform ?? '')).match(/scale\(([\d.]+)\)/);
        if (m) sh.push(`×${(+m[1]).toFixed(2)} ${txt}`);
        const b = [(x0 - R.left) / k, (y0 - R.top) / k, (x1 - R.left) / k, (y1 - R.top) / k].map(Math.round);
        if (b[0] < -2 || b[1] < -2 || b[2] > 1922 || b[3] > 1082) out.push(`[${b.join(',')}] ${txt}`);
      }
      const broken = [...st.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length;
      return { out, sh, broken };
    });
    n++;
    r.out.forEach((o) => bad.push(`${key} ${u.kinds[s - 1]} overflow ${o}`));
    r.sh.forEach((o) => shrunk.push(`${key} ${o}`));
    if (r.broken) bad.push(`${key} broken images: ${r.broken}`);
    errors.forEach((e) => bad.push(`${key} error: ${e}`));
    if (shots && (onlyShots || shots.size === 0)) {
      await (await page.$('.stage')).screenshot({ path: path.join(SHOT_DIR, `${u.id}-${s}.png`) });
    }
  }
}
await browser.close();

console.log(`checked ${n} slides`);
console.log(`\nshrunk to fit (${shrunk.length}):`); shrunk.forEach((x) => console.log('  ' + x));
console.log(`\nproblems (${bad.length}):`); bad.forEach((x) => console.log('  ' + x));

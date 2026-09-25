// צילומי דף הבית ומפת המסע עם התקדמות לדוגמה (מקומית, בלי שרת): node tools/journey-shots.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';
const SH = (n) => path.join(ROOT, 'tools', 'shots', n);

// התקדמות לדוגמה: 1–3 הושלמו (5,3,4 כוכבים), 4 באמצע
const cat = await (await fetch(new URL('content/units.json', base))).json();
const slides = {}, positions = {};
const fill = (u, q) => cat.find((c) => c.id === u).kinds.forEach((k, i) => { slides[`${u}:${i}`] = { c: 1, w: 0, n: 1, q }; });
fill('u1', 1); fill('u2', 0.7); fill('u3', 0.85);
positions.u1 = { slide: 0, furthest: 8, completed: true, stars: 5, visits: 2, at: '2026-09-20' };
positions.u2 = { slide: 0, furthest: 12, completed: true, stars: 3, visits: 1, at: '2026-09-21' };
positions.u3 = { slide: 0, furthest: 15, completed: true, stars: 4, visits: 1, at: '2026-09-22' };
positions.u4 = { slide: 6, furthest: 7, completed: false, stars: 1, visits: 1, at: '2026-09-23' };
const guest = { positions, slides, skills: { c: { c: 5, w: 0 }, a: { c: 4, w: 1 }, t: { c: 3, w: 0 } } };

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const [name, vp] of [['desk', { width: 1400, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SH(`landing-${name}.png`) });
  await page.evaluate((g) => {
    localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'נועה', emoji: '🦊', freeNav: true }));
    localStorage.setItem('wilk_guest_נועה_🦊', JSON.stringify(g));
  }, guest);
  await page.goto(base + '#/map');
  await page.reload();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SH(`journey-${name}.png`) });
  await page.screenshot({ path: SH(`journey-${name}-full.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log('ok');

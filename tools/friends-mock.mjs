// מפה עם חברים + ארון השודד, נתונים מדומים (לא נוגע בשרת): node tools/friends-mock.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';
const SH = (n) => path.join(ROOT, 'tools', 'shots', n);

const cat = await (await fetch(new URL('content/units.json', base))).json();
const slides = {};
['u1', 'u2', 'u3', 'u4', 'u5'].forEach((u) => cat.find((c) => c.id === u).kinds.forEach((_, i) => { slides[`${u}:${i}`] = { c: 1, w: 0, n: 1, q: 1 }; }));
const positions = Object.fromEntries(['u1', 'u2', 'u3', 'u4', 'u5'].map((u) => [u, { slide: 0, furthest: 20, completed: true, stars: 5, visits: 1, at: '2026-09-20' }]));
positions.u6 = { slide: 3, furthest: 4, completed: false, stars: 1, visits: 1, at: '2026-09-25' };
const progress = { positions, slides, skills: {}, freeNav: true, showFriends: true, look: { base: 2, items: ['hat', 'parrot', 'earring'] } };
const friends = [
  { name: 'איתי', look: { base: 0, items: ['patch'] }, unit: 'u6' },
  { name: 'מאיה', look: { base: 1, items: [] }, unit: 'u4' },
  { name: 'יואב', look: { base: 3, items: ['hat'] }, unit: 'u4' },
  { name: 'נגה', look: null, unit: 'u2' },
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.route('**/api/student.php?a=progress', (r) => r.fulfill({ json: progress }));
await page.route('**/api/student.php?a=classmates', (r) => r.fulfill({ json: { enabled: true, friends } }));
await page.route('**/api/student.php?a=visit', (r) => r.fulfill({ json: { ok: true } }));
await page.route('**/api/student.php?a=position', (r) => r.fulfill({ json: { ok: true } }));
await page.route('**/api/student.php?a=look', (r) => r.fulfill({ json: { ok: true } }));
await page.goto(base);
await page.evaluate(() => localStorage.setItem('wilk_session', JSON.stringify({ token: 's:1:9999999999:mock', nickname: 'נועה', emoji: '⚽', className: 'ג׳2', freeNav: true })));
await page.goto(base + '#/map');
await page.reload();
await page.waitForTimeout(2500);
await page.screenshot({ path: SH('friends-map.png') });
await page.click('.jb-pirate');
await page.waitForTimeout(800);
await page.screenshot({ path: SH('wardrobe.png'), fullPage: true });
await browser.close();
console.log('ok');

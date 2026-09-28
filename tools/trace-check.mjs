// בדיקת שקף הכתיבה + העורך: node tools/trace-check.mjs [base]
// מזריקה מסלול C לדוגמה (קשת), כותבת עליו עם "אצבע" ובודקת שעוברים לאות הקטנה ומשם הלאה.
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

// קשת C: ממרכז (0.5,0.47) רדיוס ~0.2, מ-‎-45° נגד כיוון השעון עד 45°
const arc = (cx, cy, r, a0, a1, n = 40) => Array.from({ length: n }, (_, i) => {
  const a = (a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI / 180;
  return [+(cx + r * Math.cos(a)).toFixed(3), +(cy + r * Math.sin(a)).toFixed(3)];
});

const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto(base);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'x', emoji: '⭐', freeNav: true })); });

// מוצאים את מרכז הקשת של C לפי הגליף עצמו — כדי שהמסלול ישב עליו
await p.route('**/teacher.php?a=strokes', (rt) => rt.fulfill({ json: { strokes: {} } }));
await p.goto(base + '#/unit/u1/9');
await p.reload();
await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
await p.waitForSelector('.trace-box canvas', { timeout: 15000 });
await p.waitForTimeout(800);
const geo = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = c.height = 400;
  const x = c.getContext('2d');
  x.font = '600 240px WilkTrace'; x.textAlign = 'center'; x.fillText('C', 200, 264);
  const d = x.getImageData(0, 0, 400, 400).data;
  let minX = 400, maxX = 0, minY = 400, maxY = 0;
  for (let i = 0; i < 400 * 400; i++) if (d[i * 4 + 3] > 60) { const X = i % 400, Y = (i / 400) | 0; minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y); }
  return { cx: (minX + maxX) / 800, cy: (minY + maxY) / 800, r: ((maxY - minY) / 2 - 12) / 400, fonts: document.fonts.check('600 240px WilkTrace') };
});
console.log('C geometry', geo);
const C = [arc(geo.cx, geo.cy, geo.r, -40, -320)];
await p.unroute('**/teacher.php?a=strokes');
await p.route('**/teacher.php?a=strokes', (rt) => rt.fulfill({ json: { strokes: { C } } }));
await p.reload();
await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
await p.waitForSelector('.trace-box canvas');
await p.waitForTimeout(1200);
await p.screenshot({ path: path.join(SHOTS, 'trace-slide.png') });

// כותבים על המסלול באצבע (עכבר)
const box = await (await p.$$('.trace-box'))[0].boundingBox();
const toPx = ([x, y]) => [box.x + x * box.width, box.y + y * box.height];
const drawPath = async (pts) => {
  const [x0, y0] = toPx(pts[0]);
  await p.mouse.move(x0, y0); await p.mouse.down();
  for (const pt of pts.slice(1)) { const [x, y] = toPx(pt); await p.mouse.move(x, y, { steps: 3 }); }
  await p.mouse.up();
};
await p.waitForTimeout(3500); // אחרי ההדגמה
await drawPath(C[0]);
await p.waitForTimeout(900);
console.log('upper done:', !!(await p.$('.trace-box.done')), 'hint:', await p.textContent('.trace-hint'));
const lowerOn = await p.$$eval('.trace-box', (els) => els.map((e) => e.className));
console.log('boxes:', lowerOn.join(' | '));

// הקטנה — בלי מסלול מוקלט: בודקים רק כיסוי. קשת קטנה על גובה ה-x
const low = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = c.height = 400;
  const x = c.getContext('2d');
  x.font = '600 240px WilkTrace'; x.textAlign = 'center'; x.fillText('c', 200, 264);
  const d = x.getImageData(0, 0, 400, 400).data;
  let minX = 400, maxX = 0, minY = 400, maxY = 0;
  for (let i = 0; i < 400 * 400; i++) if (d[i * 4 + 3] > 60) { const X = i % 400, Y = (i / 400) | 0; minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y); }
  return { cx: (minX + maxX) / 800, cy: (minY + maxY) / 800, r: ((maxY - minY) / 2 - 11) / 400 };
});
const box2 = await (await p.$$('.trace-box'))[1].boundingBox();
const toPx2 = ([x, y]) => [box2.x + x * box2.width, box2.y + y * box2.height];
const lp = arc(low.cx, low.cy, low.r, -40, -320);
const [a0, b0] = toPx2(lp[0]);
await p.mouse.move(a0, b0); await p.mouse.down();
for (const pt of lp.slice(1)) { const [x, y] = toPx2(pt); await p.mouse.move(x, y, { steps: 3 }); }
await p.mouse.up();
await p.waitForTimeout(400);
await p.screenshot({ path: path.join(SHOTS, 'trace-done.png') });
await p.waitForTimeout(1600);
console.log('after both → counter:', await p.textContent('.player-count'));

// מובייל
await p.setViewportSize({ width: 390, height: 780 });
await p.goto(base + '#/unit/u1/9'); await p.reload();
await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
await p.waitForSelector('.trace-box canvas'); await p.waitForTimeout(900);
await p.screenshot({ path: path.join(SHOTS, 'trace-mobile.png') });

// עורך
await p.setViewportSize({ width: 1280, height: 900 });
await p.route('**/teacher.php?a=me', (rt) => rt.fulfill({ json: { strokeAdmin: true } }));
await p.evaluate(() => localStorage.setItem('wilk_teacher', JSON.stringify({ token: 'x', name: 'בדיקה', email: 'a@b.c' })));
await p.goto(base + '#/trace-edit'); await p.reload();
await p.waitForSelector('.te-canvas'); await p.waitForTimeout(800);
const eb = await p.$('.te-canvas').then((e) => e.boundingBox());
const epx = ([x, y]) => [eb.x + x * eb.width, eb.y + y * eb.height];
const [e0, f0] = epx(C[0][0]);
await p.mouse.move(e0, f0); await p.mouse.down();
for (const pt of C[0].slice(1)) { const [x, y] = epx(pt); await p.mouse.move(x, y, { steps: 2 }); }
await p.mouse.up();
await p.waitForTimeout(2500);
console.log('editor:', await p.textContent('.te-main p'));
await p.screenshot({ path: path.join(SHOTS, 'trace-edit.png'), fullPage: true });
await b.close();

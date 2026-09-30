// "ילד רובוט": כותב כל אחת מ-52 האותיות בדיוק לפי המסלול המוקלט (content/strokes.json)
// בחלון הניסיון של העורך, ובודק שהיא עוברת. גם: אות בלי משיכה אחת לא עוברת.
// node tools/trace-all.mjs [base]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';
const STROKES = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'public', 'content', 'strokes.json'), 'utf8'));
const GLYPHS = 'CATSHRFMNOPEKLBGDIVXJZUQYW'.split('').flatMap((l) => [l, l.toLowerCase()]);
const SHOTS = path.join(ROOT, 'tools', 'shots', 'trace');
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.route('**/teacher.php?a=strokes*', (rt) => rt.fulfill({ json: { strokes: STROKES } }));
await p.route('**/teacher.php?a=me', (rt) => rt.fulfill({ json: { strokeAdmin: false } }));
await p.goto(base);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wilk_teacher', JSON.stringify({ token: 'x', name: 'בדיקה', email: 'a@b.c' })); });
await p.goto(base + '#/trace-edit');
await p.reload();
await p.waitForSelector('.te-try .trace-box canvas');

const write = async (strokes) => {
  const box = await p.$('.te-try .trace-ink').then((e) => e.boundingBox());
  for (const st of strokes) {
    const px = ([x, y]) => [box.x + x * box.width, box.y + y * box.height];
    const [x0, y0] = px(st[0]);
    await p.mouse.move(x0, y0); await p.mouse.down();
    for (const pt of st.slice(1)) { const [x, y] = px(pt); await p.mouse.move(x, y); }
    await p.mouse.up();
    await p.waitForTimeout(60);
  }
  await p.waitForTimeout(250);
};

const fails = [];
for (const g of GLYPHS) {
  await p.click(`.te-glyph >> text="${g}"`);
  await p.waitForTimeout(250);
  const extras = await p.evaluate(async (g) => {
    const m = await import(new URL('src/data/strokes.ts', location.href.split('#')[0]).href).catch(() => null);
    return m ? m.extraRuns(g, (await m.loadStrokes())[g]).length : -1;
  }, g);
  await p.click('.te-side button:has-text("לנסות שוב")');
  const st = STROKES[g];
  // בדיקה שלילית: בלי המשיכה האחרונה (אם יש יותר מאחת) — לא אמור לעבור
  let negOk = 'n/a';
  if (st.length > 1) {
    await write(st.slice(0, -1));
    negOk = !(await p.$('.te-try .trace-box.done')) ? 'ok' : 'PASSED-WITHOUT-LAST';
    await p.click('.te-side button:has-text("לנסות שוב")');
    await p.waitForTimeout(150);
  }
  // ילד "רועד": סטייה גלית של עד 2% מהריבוע (~8px) בניצב למסלול
  const wob = st.map((s, si) => s.map(([x, y], i) => {
    const a = s[Math.max(0, i - 1)], b2 = s[Math.min(s.length - 1, i + 1)];
    const dx = b2[0] - a[0], dy = b2[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const k = 0.02 * Math.sin(i * 0.7 + si * 2);
    return [x - (dy / L) * k, y + (dx / L) * k];
  }));
  await write(wob);
  const wobbly = !!(await p.$('.te-try .trace-box.done'));
  await p.click('.te-side button:has-text("לנסות שוב")');
  await p.waitForTimeout(150);
  await write(st);
  const done = !!(await p.$('.te-try .trace-box.done'));
  const msg = await p.$eval('.te-msg', (e) => e.textContent).catch(() => '');
  if (['I', 'J', 'U', 'i', 'j', 'u', 't', 'f', 'Q', 'q'].includes(g) || !done) {
    await p.$('.te-main').then((e) => e.screenshot({ path: path.join(SHOTS, `${g === g.toUpperCase() ? 'U_' : 'l_'}${g}.png`) }));
  }
  console.log(g.padEnd(2), done ? 'PASS' : 'FAIL', `wobbly=${wobbly ? 'pass' : 'FAIL'}`, `strokes=${st.length}`, `extras=${extras}`, `neg=${negOk}`, done ? '' : msg);
  if (!done || !wobbly || negOk === 'PASSED-WITHOUT-LAST') fails.push(g);
}
console.log('\nfailures:', fails.join(' ') || 'none');
await b.close();

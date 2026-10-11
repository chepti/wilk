// צילומי מסך של האפליקציה האמיתית לסרטון ההסבר (video/public/shots). נתונים מדומים בלבד — שום דבר לא נכתב לשרת.
// node tools/video-capture.mjs   (שרת פיתוח על 5178)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = 'http://localhost:5178/wilk/';
const OUT = path.join(ROOT, 'video', 'public', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const meta = {};

const units = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/public/content/units.json'), 'utf8'));
const unitJson = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, `app/public/content/${id}.json`), 'utf8'));

// ── התקדמות מדומה: 7 תחנות הושלמו, באמצע השמינית ──
const progress = { positions: {}, slides: {}, skills: {}, days: [], showFriends: true, mapStyle: 'journey', freeNav: false,
  look: { base: 2, items: ['hat', 'parrot', 'earring', 'patch'] } };
const starsOf = [5, 5, 4, 5, 3, 4, 5];
units.slice(0, 7).forEach((u, i) => {
  progress.positions[u.id] = { slide: u.slides, furthest: u.slides, completed: true, stars: starsOf[i], visits: 2 };
  u.kinds.forEach((k, s) => { progress.slides[`${u.id}:${s}`] = { c: 3, w: 0, n: 1, q: starsOf[i] >= 5 ? 1 : 0.8 }; });
  u.skills.forEach((sk) => { progress.skills[sk] = { c: 8, w: 1 }; });
});
progress.positions.u8 = { slide: 6, furthest: 6, completed: false, stars: 0, visits: 1, at: new Date().toISOString() };
for (let d = 0; d < 20; d += 1) if (d % 3 !== 2) progress.days.push(new Date(Date.now() - d * 864e5).toISOString().slice(0, 10));
const friends = [
  { name: 'נועה', look: { base: 0, items: ['hat', 'parrot'] }, unit: 'u8' },
  { name: 'איתי', look: { base: 4, items: ['patch'] }, unit: 'u6' },
  { name: 'מאיה', look: { base: 1, items: ['crown'] }, unit: 'u9' },
  { name: 'יואב', look: { base: 3, items: [] }, unit: 'u5' },
];

// ── כיתה מדומה למורה ──
const NAMES = ['נועה', 'איתי', 'מאיה', 'יואב', 'תמר', 'אורי', 'שירה', 'עידו', 'הילה', 'רון', 'ליה', 'גיא'];
const EMOJI = ['⚽', '🌈', '🍎', '⭐', '🐢', '🚀', '🌸', '🎈', '🐬', '🍉', '🎸', '🦋'];
const students = NAMES.map((nickname, i) => {
  const done = Math.max(1, 9 - (i % 6) - Math.floor(i / 4));
  const p = { positions: {}, slides: {}, skills: {}, days: [] };
  units.slice(0, done + 1).forEach((u, k) => {
    const st = 3 + ((i + k) % 3);
    p.positions[u.id] = k < done ? { slide: u.slides, furthest: u.slides, completed: true, stars: st, visits: 1 + (k % 3) } : { slide: 4, furthest: 4, completed: false, stars: 0, visits: 1 };
    u.kinds.forEach((kk, s) => { p.slides[`${u.id}:${s}`] = { c: 2, w: (i + s) % 4 === 0 ? 1 : 0, n: 1, q: st >= 5 ? 1 : 0.75 }; });
    u.skills.forEach((sk, j) => { p.skills[sk] = { c: 4 + ((i + j) % 5), w: (i + j + k) % 4 }; });
  });
  return { id: i + 1, nickname, emoji: EMOJI[i], lastSeen: new Date(Date.now() - (i % 5) * 864e5).toISOString().slice(0, 19).replace('T', ' '), ...p };
});
const classes = [{ id: 1, name: 'ג׳1 · שעת אנגלית', code: '482913', freeNav: false, showFriends: true, mapStyle: 'journey', videoSource: 'youtube', students: students.length }];

const b = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.route('**/student.php?a=progress*', (r) => r.fulfill({ json: progress }));
await p.route('**/student.php?a=classmates*', (r) => r.fulfill({ json: { friends } }));
await p.route(/student\.php\?a=class(&|$)/, (r) => r.fulfill({ json: { name: 'ג׳1', students: 12, stars: 214, goal: 300, step: 180, treasures: 1 } }));
await p.route('**/student.php?a=plays*', (r) => r.fulfill({ json: { plays: {} } }));
await p.route('**/student.php?a=position*', (r) => r.fulfill({ json: { ok: true } }));
await p.route('**/student.php?a=visit*', (r) => r.fulfill({ json: { ok: true } }));
await p.route('**/student.php?a=result*', (r) => r.fulfill({ json: { ok: true } }));
await p.route('**/teacher.php?a=me*', (r) => r.fulfill({ json: { strokeAdmin: false, admin: false } }));
await p.route('**/teacher.php?a=classes*', (r) => r.fulfill({ json: { classes } }));
await p.route('**/teacher.php?a=heatmap*', (r) => r.fulfill({ json: { students } }));
const hideGuides = '.tap-badge, .stage-counter, .nav-arrow, .video-src { display: none !important; }';

await p.goto(base);
await p.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('wilk_session', JSON.stringify({ token: 'demo', nickname: 'נועה', emoji: '⚽', classId: 1, className: 'ג׳1', freeNav: false }));
  localStorage.setItem('wilk_teacher', JSON.stringify({ token: 'demo', name: 'המורה דנה', email: 'dana@example.org' }));
});

const shot = async (name, opts = {}) => {
  const file = path.join(OUT, `${name}.png`);
  await p.screenshot({ path: file, ...opts });
  console.log('saved', name);
};
const openUnit = async (u, jump, css = hideGuides) => {
  await p.goto(base + `#/unit/${u}/${jump}`); await p.reload();
  await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
  await p.waitForTimeout(1500);
  if (await p.$('.assist-bubble')) await p.click('.assist-bubble .btn.star');
  await p.waitForTimeout(4200);
  if (css) await p.addStyleTag({ content: css });
  await p.waitForTimeout(300);
};

// 1) מפת המסע — כל הגובה, לגלילה בסרטון
await p.goto(base + '#/map'); await p.reload();
await p.waitForSelector('.jnode'); await p.waitForTimeout(2500);
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(600);
await shot('map-full', { fullPage: true });
meta.mapHeight = await p.evaluate(() => document.documentElement.scrollHeight);

// 2) שקף ההיכרות עם M — נקי (הסימונים יונפשו בסרטון), ומיקומי האזורים הלחיצים
await openUnit('u4', 12);
await shot('slide-m');
meta.mTraces = await p.$$eval('.trace-layer .trace', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
// אותו שקף עם הסימונים האמיתיים — לייחוס
await p.addStyleTag({ content: '.tap-badge, .stage-counter { display: flex !important; }' });

// 3) גרירה — מטבח של פאם: רקע בלי סיר אחד + הסיר לבד
await openUnit('u6', 13);
const drag = await p.$$eval('.draggable', (els) => els.map((e, i) => { const r = e.getBoundingClientRect(); return { i, x: r.x, y: r.y, w: r.width, h: r.height }; }));
meta.drag = drag;
console.log('draggables', drag.length, JSON.stringify(drag.slice(0, 8)));
await shot('drag-full');
await p.$$eval('.draggable', (els) => { els[3].style.visibility = 'hidden'; });
await p.waitForTimeout(200);
await shot('drag-bg');

// 4) שקף הכתיבה של M — נקי, ומיקומי שני הריבועים
const u4 = unitJson('u4');
const mTrace = u4.traces.find((t) => t.letter === 'M');
await openUnit('u4', mTrace.idx + 1, hideGuides + ' .trace-demo { display: none !important; }');
await p.waitForTimeout(2500);
await shot('trace-m');
meta.traceBoxes = await p.$$eval('.trace-box', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));

// 5) מסך סיום תחנה — חמישה כוכבים (מפעילים דרך localStorage של אורח)
// 6) אזור המורה עם מפת החום
await p.goto(base + '#/teacher'); await p.reload();
await p.waitForSelector('.class-code'); await p.waitForTimeout(2500);
await shot('teacher-full', { fullPage: true });

// 7) הורים — עזרים
await p.goto(base + '#/parents'); await p.reload();
await p.waitForTimeout(2500);
await shot('parents-full', { fullPage: true });

// 8) הדמות — ארון הבגדים של השודד
await p.goto(base + '#/pirate'); await p.reload();
await p.waitForTimeout(2000);
await shot('pirate');

fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
await b.close();

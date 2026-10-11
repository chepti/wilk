// אזור האדמין עם נתונים מדומים (בלי סיסמה): node tools/admin-mock.mjs [base]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';

const day = (k) => new Date(Date.now() - k * 864e5).toISOString().slice(0, 10);
const timeline = Array.from({ length: 200 }, (_, k) => 199 - k).filter((k) => k % 3 !== 1).map((k) => ({
  day: day(k), plays: Math.round(20 + 15 * Math.sin(k / 6) + (200 - k) / 4), active: Math.round(5 + 4 * Math.sin(k / 5) + (200 - k) / 20),
  results: 80, newStudents: k % 9 === 0 ? 6 : 0, newTeachers: k % 40 === 0 ? 1 : 0,
}));
const stats = {
  generatedAt: new Date().toISOString(),
  totals: { teachers: 4, classes: 6, students: 87, active7: 31, active30: 64, plays: 5210, plays30: 1430, results: 12890, completed: 212 },
  teachers: [
    { id: 1, name: 'חפציה', email: 'chepti@gmail.com', created_at: '2026-09-24 08:00:00', classes: 2, students: 9, active30: 7, completed: 30, last_seen: new Date(Date.now() - 864e5).toISOString().slice(0, 19).replace('T', ' ') },
    { id: 2, name: 'יהל', email: 'yahel@example.org', created_at: '2026-09-27 10:00:00', classes: 1, students: 26, active30: 22, completed: 90, last_seen: new Date().toISOString().slice(0, 19).replace('T', ' ') },
    { id: 3, name: 'מורה בלי כיתה', email: 'x@example.org', created_at: '2026-10-02 10:00:00', classes: 0, students: 0, active30: 0, completed: 0, last_seen: null },
  ],
  classes: [
    { id: 5, teacher_id: 2, name: 'קשת', created_at: '2026-09-27 10:05:00', students: 26, last_seen: '2026-10-11 09:00:00' },
    { id: 6, teacher_id: 1, name: 'משפחתי', created_at: '2026-09-25 10:05:00', students: 3, last_seen: '2026-10-10 09:00:00' },
    { id: 7, teacher_id: 1, name: 'ג׳2', created_at: '2026-10-01 10:05:00', students: 6, last_seen: '2026-10-09 09:00:00' },
  ],
  units: Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`u${i + 1}`, { plays: 400 - i * 18, plays30: 120 - i * 5, started: 40 - i * 2, completed: 30 - i * 2, avgStars: +(4.6 - i * 0.05).toFixed(1) }])),
  timeline,
};

const b = await chromium.launch({ channel: 'msedge', headless: true });
for (const [w, h, name] of [[1280, 900, 'admin'], [390, 844, 'admin-mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.route('**/teacher.php?a=me*', (rt) => rt.fulfill({ json: { strokeAdmin: true, admin: true } }));
  await p.route('**/teacher.php?a=admin_stats*', (rt) => rt.fulfill({ json: stats }));
  await p.route('**/teacher.php?a=classes*', (rt) => rt.fulfill({ json: { classes: [] } }));
  await p.goto(base);
  await p.evaluate(() => localStorage.setItem('wilk_teacher', JSON.stringify({ token: 'x', name: 'בדיקה', email: 'a@b.c' })));
  await p.goto(base + '#/admin');
  await p.reload();
  await p.waitForSelector('.stat-tile');
  if (name === 'admin') {
    await p.click('.admin-table tr.clickable');
    const svg = await p.$('.ts svg');
    const bb = await svg.boundingBox();
    await p.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height / 2);
    await p.waitForTimeout(200);
    console.log('hover heads:', (await p.$$eval('.ts-head', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))).join(' | '));
    await p.click('.seg button:has-text("הכול")');
    await p.waitForTimeout(200);
    console.log('all-range title:', await p.textContent('.admin p.muted'));
  }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(name, 'horizontal overflow:', overflow);
  await p.screenshot({ path: path.join(ROOT, 'tools', 'shots', `${name}.png`), fullPage: true });
  await p.close();
}
// אזור המורים: אין גרף כניסות, יש כפתור אדמין וסרטון ההסבר
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.route('**/teacher.php?a=me*', (rt) => rt.fulfill({ json: { strokeAdmin: true, admin: true } }));
await p.route('**/teacher.php?a=classes*', (rt) => rt.fulfill({ json: { classes: [] } }));
await p.goto(base);
await p.evaluate(() => localStorage.setItem('wilk_teacher', JSON.stringify({ token: 'x', name: 'בדיקה', email: 'a@b.c' })));
await p.goto(base + '#/teacher'); await p.reload();
await p.waitForSelector('.teacher-bar');
await p.waitForTimeout(800);
console.log('teacher: plays chart present:', !!(await p.$('.plays')), '| admin button:', !!(await p.$('button:has-text("אזור אדמין")')), '| explainer card:', !!(await p.$('text=סרטון הסבר על המרחב')));
await b.close();

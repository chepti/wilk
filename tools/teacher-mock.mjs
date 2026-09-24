// צילום לוח המורה עם נתונים מדומים (בלי לגעת בשרת האמיתי): node tools/teacher-mock.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';

// שלושה תלמידים: עבודה מלאה, דילוגים עם דיוק גבוה, דיוק נמוך
const full = (unit, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${unit}:${i}`, { c: 3, w: 0, n: 1, q: 1 }]));
const students = [
  { id: 1, nickname: 'נועה', emoji: '⚽', lastSeen: '2026-09-24 09:00:00',
    positions: { u1: { slide: 0, furthest: 8, completed: true, stars: 5, visits: 3 }, u2: { slide: 0, furthest: 12, completed: true, stars: 5, visits: 1 } },
    slides: { ...full('u1', 8), ...full('u2', 12) },
    skills: { c: { c: 6, w: 1 }, a: { c: 5, w: 0 }, t: { c: 4, w: 1 }, s: { c: 5, w: 0 } } },
  { id: 2, nickname: 'איתי', emoji: '🚀', lastSeen: '2026-09-23 12:00:00',
    positions: { u1: { slide: 0, furthest: 8, completed: true, stars: 1, visits: 1 }, u2: { slide: 4, furthest: 5, completed: false, stars: 1, visits: 2 } },
    slides: { 'u1:6': { c: 2, w: 0, n: 1, q: 0.5 }, 'u2:4': { c: 2, w: 0, n: 1, q: 0.6 } },
    skills: { c: { c: 3, w: 0 }, a: { c: 2, w: 0 }, t: { c: 3, w: 0 } } },
  { id: 3, nickname: 'מאיה', emoji: '🌻', lastSeen: '2026-09-22 08:00:00',
    positions: { u1: { slide: 0, furthest: 8, completed: true, stars: 3, visits: 4 } },
    slides: Object.fromEntries(Object.entries(full('u1', 8)).map(([k, v]) => [k, { ...v, q: 0.7 }])),
    skills: { c: { c: 1, w: 4 }, a: { c: 3, w: 1 } } },
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.route('**/api/teacher.php?a=classes', (r) => r.fulfill({ json: { classes: [{ id: 1, name: 'ג׳2', code: '482913', freeNav: true, students: 3 }] } }));
await page.route('**/api/teacher.php?a=heatmap**', (r) => r.fulfill({ json: { class: {}, students } }));
await page.route('**/api/student.php?a=plays', (r) => r.fulfill({ json: { plays: { u1: 40, u2: 12 } } }));
await page.goto(base);
await page.evaluate(() => localStorage.setItem('wilk_teacher', JSON.stringify({ token: 'mock', name: 'חפציה', email: 'x@example.com' })));
await page.goto(base + '#/teacher');
await page.waitForTimeout(1500);
await (await page.$('.card')).screenshot({ path: path.join(ROOT, 'tools', 'shots', 'teacher-skills.png') });
await page.click('button.pill:has-text("תחנות")');
await page.waitForTimeout(500);
await (await page.$('.card')).screenshot({ path: path.join(ROOT, 'tools', 'shots', 'teacher-units.png') });
await page.screenshot({ path: path.join(ROOT, 'tools', 'shots', 'teacher-full.png'), fullPage: true });
await browser.close();
console.log('ok');

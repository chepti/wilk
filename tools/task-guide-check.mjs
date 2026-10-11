// סימוני משימה: רמקולים/וי בהקשה, מונה, תזכורת ב"הבא", מונה גרירה, כותרת לסרטון שני. node tools/task-guide-check.mjs [base]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';
const SHOTS = path.join(ROOT, 'tools', 'shots');

const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto(base);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'g', emoji: '⭐', freeNav: true })); });

const open = async (u, jump) => {
  await p.goto(base + `#/unit/${u}/${jump}`); await p.reload();
  await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
  await p.waitForTimeout(1200);
  if (await p.$('.assist-bubble')) await p.click('.assist-bubble .btn.star');
  await p.waitForTimeout(3600); // רמז Jigzi (3 שניות) נגמר
};
const counter = () => p.$eval('.stage-counter', (e) => e.textContent.trim()).catch(() => '(none)');
const slideNo = () => p.$eval('.player-count', (e) => e.firstChild.textContent.trim());

// 1) שקף ההיכרות עם M
await open('u4', 12);
console.log('M intro: badges', (await p.$$('.tap-badge')).length, '| counter:', await counter());
await p.screenshot({ path: path.join(SHOTS, 'guide-tap-before.png') });
const tr = await p.$$('.trace-layer [data-trace], .trace-layer path, .trace-layer ellipse, .trace-layer rect');
if (tr.length) { await tr[0].click({ force: true }); await p.waitForTimeout(2500); }
console.log('after one tap: done badges', (await p.$$('.tap-badge.done')).length, '| counter:', await counter());
const before = await slideNo();
await p.click('.nav-arrow.next'); await p.waitForTimeout(500);
console.log('next #1 → nudge:', await p.$eval('.assist-bubble.nudge p', (e) => e.textContent).catch(() => 'NONE'), '| slide still', await slideNo() === before);
await p.screenshot({ path: path.join(SHOTS, 'guide-nudge.png') });
await p.click('.assist-bubble.nudge .btn.star'); await p.waitForTimeout(300);
console.log('back to task → nudge closed:', !(await p.$('.assist-bubble.nudge')), '| same slide:', await slideNo() === before);
await p.click('.nav-arrow.next'); await p.waitForTimeout(700);
console.log('next #2 → moved on:', await slideNo() !== before);

// 2) גרירה
await open('u6', 13);
console.log('dragDrop counter:', await counter());
await p.screenshot({ path: path.join(SHOTS, 'guide-drag.png') });

// 3) סרטון שני ברצף (h אחרי H בתחנה 3)
await open('u3', 3);
console.log('second video title:', await p.$eval('.video-next-title', (e) => e.textContent).catch(() => 'NONE'));
await p.screenshot({ path: path.join(SHOTS, 'guide-video2.png') });
await p.click('.nav-arrow.next'); await p.waitForTimeout(500);
console.log('video next → nudge:', await p.$eval('.assist-bubble.nudge p', (e) => e.textContent).catch(() => 'NONE'));

// 4) שקף פרידה — בלי סימונים
await open('u6', 18);
console.log('farewell slide badges:', (await p.$$('.tap-badge')).length, '| counter:', await counter());
await b.close();

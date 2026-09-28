// החלפת מפה (מסע ↔ פשוטה) נשמרת, וטוען הכוכבים מופיע: node tools/mapswitch-check.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';

const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 850 } });
await p.goto(base);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'x', emoji: '⭐', freeNav: true })); });
await p.goto(base + '#/map');
await p.reload();
await p.waitForSelector('.jnode');
console.log('start on journey:', !!(await p.$('.jnode')));
await p.click('.journey-bar button:has-text("מפה פשוטה")');
await p.waitForTimeout(500);
console.log('switched to simple:', !!(await p.$('.star-node')) && !(await p.$('.jnode')));
await p.reload();
await p.waitForTimeout(900);
console.log('stays simple after reload:', !!(await p.$('.star-node')));
await p.click('button:has-text("מסע הרפתקה")');
await p.waitForTimeout(500);
console.log('back to journey:', !!(await p.$('.jnode')));
await p.route('**/content/u2.json', async (rt) => { await new Promise((x) => setTimeout(x, 2500)); await rt.continue(); });
await p.evaluate(() => { location.hash = '/unit/u2'; });
await p.waitForTimeout(700);
console.log('loader visible:', !!(await p.$('.star-loader')));
await p.screenshot({ path: path.join(ROOT, 'tools', 'shots', 'loader.png') });
await b.close();

// סינון מדומה: חוסמים את יוטיוב ובודקים שהסרטון עובר לדרייב לבד, ושהמתג עובד. node tools/video-check.mjs [base]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';
const SHOTS = path.join(ROOT, 'tools', 'shots');

const b = await chromium.launch({ channel: 'msedge', headless: true });
const run = async (blockYT) => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  if (blockYT) await p.route(/youtube(-nocookie)?\.com|ytimg|googlevideo/, (rt) => rt.abort());
  await p.goto(base);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'v', emoji: '⭐', freeNav: true })); });
  await p.goto(base + '#/unit/u1/2'); // שקף 2 = סרטון C
  await p.reload();
  await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
  await p.waitForTimeout(1500);
  if (await p.$('.assist-bubble')) await p.click('.assist-bubble .btn.star');
  const t0 = Date.now();
  await p.waitForSelector('iframe[src*="drive.google.com"], iframe[src*="youtube"]', { timeout: 15000 }).catch(() => {});
  const src = await p.$eval('.stage iframe', (f) => f.src).catch(() => 'none');
  const sw = await p.$eval('.video-src', (e) => e.textContent).catch(() => 'no switch');
  console.log(blockYT ? 'YT BLOCKED' : 'YT open  ', '→', src.includes('drive.google') ? 'DRIVE' : src.includes('youtube') ? 'YOUTUBE' : src, `(${((Date.now() - t0) / 1000).toFixed(1)}s)`, '| switch:', sw.replace(/\s+/g, ' ').slice(0, 30));
  if (!blockYT) {
    await p.click('.video-src');
    await p.waitForTimeout(800);
    console.log('  after switch click →', (await p.$eval('.stage iframe', (f) => f.src)).includes('drive.google') ? 'DRIVE' : 'YOUTUBE');
    await p.click('.video-src');
    await p.waitForTimeout(1500);
    console.log('  switch back →', (await p.$eval('.stage iframe', (f) => f.src).catch(() => '')).includes('youtube') ? 'YOUTUBE' : 'other');
  } else {
    await p.screenshot({ path: path.join(SHOTS, 'video-drive.png') });
    await p.reload();
    await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
    await p.waitForTimeout(1500);
    if (await p.$('.assist-bubble')) await p.click('.assist-bubble .btn.star');
    await p.waitForTimeout(600);
    console.log('  remembered after reload (no wait) →', (await p.$eval('.stage iframe', (f) => f.src).catch(() => '')).includes('drive.google') ? 'DRIVE' : 'no');
  }
  await ctx.close();
};
await run(false);
await run(true);
await b.close();

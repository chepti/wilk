// סרטון שנצפה ב-70% נחשב מלא; 30% — חלקי. רק מול שרת הפיתוח (משתמש ב-__wilkYT). node tools/video-watch-check.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = 'http://localhost:5178/wilk/';

const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
for (const frac of [0.3, 0.75]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(base);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wilk_session', JSON.stringify({ token: 'guest', nickname: 'w', emoji: '⭐', freeNav: true })); });
  await p.goto(base + '#/unit/u1/2'); await p.reload();
  await p.waitForTimeout(1200); if (await p.$('.play-big')) await p.click('.play-big');
  await p.waitForTimeout(1500);
  if (await p.$('.assist-bubble')) await p.click('.assist-bubble .btn.star');
  await p.waitForFunction(() => window.__wilkYT?.getDuration?.() > 0, null, { timeout: 25000 }).catch(() => {});
  const dur = await p.evaluate(() => window.__wilkYT?.getDuration?.() ?? 0);
  await p.evaluate((t) => { const y = window.__wilkYT; y.mute(); y.seekTo(t, true); y.playVideo(); }, dur * frac);
  await p.waitForTimeout(3500);
  const at = await p.evaluate(() => window.__wilkYT.getCurrentTime());
  await p.evaluate(() => window.__wilkYT.pauseVideo());
  await p.click('.nav-arrow.next');
  await p.waitForTimeout(800);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('wilk_guest_w_⭐') || '{}').slides?.['u1:1']?.q);
  console.log(`watched to ${Math.round((at / dur) * 100)}% of ${Math.round(dur)}s → saved q=${q}`, frac >= 0.7 ? (q === 1 ? 'OK (full)' : 'FAIL') : (q === 0.5 ? 'OK (partial)' : 'FAIL'));
  await p.close();
}
await b.close();

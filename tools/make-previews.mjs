// תמונות תצוגה מקדימה לעזרים: og:image של הדף (התמונה שהאתר מייעד לשיתוף), ואם אין — צילום מסך.
// קבצי PDF מרונדרים בנפרד (PyMuPDF). הפלט: app/public/previews/*.webp
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const OUT = path.join(ROOT, 'app', 'public', 'previews');

const TARGETS = {
  slides: 'https://www.canva.com/design/DAF0magLs4E/view',
  checks: 'https://chepti.com/check/',
  direction: 'https://www.turtlediary.com/game/write-lowercase-letters.html',
  playlist: 'https://www.youtube.com/playlist?list=PLJRbNE3_dNnhs52hJ1CMT-m04DDAIUn9R',
  whatsapp: 'https://chat.whatsapp.com/HwsWj1vRqhuBSB5Czek25a',
  feedback: 'https://docs.google.com/forms/d/e/1FAIpQLScPKYtQVFOlH-230miljpuw-5dmKPQtYp32OjmeSsP3DsBBbw/viewform',
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, locale: 'he-IL' });
for (const [id, url] of Object.entries(TARGETS)) {
  const dst = path.join(OUT, `${id}.webp`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const og = await page.evaluate(() => document.querySelector('meta[property="og:image"]')?.getAttribute('content'));
    let buf = null, how = '';
    if (og && !/favicon|logo/i.test(og)) {
      const res = await page.request.get(new URL(og, url).href);
      if (res.ok()) { buf = await res.body(); how = 'og:image'; }
    }
    if (!buf) { buf = await page.screenshot(); how = 'screenshot'; }
    await sharp(buf).resize(640, 400, { fit: 'cover', position: 'top' }).webp({ quality: 80 }).toFile(dst);
    console.log(id.padEnd(10), how, og ?? '');
  } catch (e) {
    console.log(id.padEnd(10), 'FAILED', e.message.split('\n')[0]);
  }
}
await browser.close();

// PDF שרונדרו ל-PNG (booklet-*.png, texts-*.png) → webp
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith('.png'))) {
  await sharp(path.join(OUT, f)).webp({ quality: 82 }).toFile(path.join(OUT, f.replace('.png', '.webp')));
  fs.unlinkSync(path.join(OUT, f));
}
console.log(fs.readdirSync(OUT).join(', '));

// דף מגע: כל 52 האותיות עם המסלול המוקלט, והתוספות מעבר לגופן בכתום. node tools/trace-sheet.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const base = process.argv[2] ?? 'http://localhost:5178/wilk/';
const STROKES = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'public', 'content', 'strokes.json'), 'utf8'));

const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage();
await p.goto(base);
const url = await p.evaluate(async (S) => {
  const m = await import('/wilk/src/data/strokes.ts');
  await m.loadTraceFont();
  const G = 'CATSHRFMNOPEKLBGDIVXJZUQYW'.split('').flatMap((l) => [l, l.toLowerCase()]);
  const cell = 200, cols = 13;
  const out = document.createElement('canvas');
  out.width = cols * cell; out.height = Math.ceil(G.length / cols) * cell;
  const o = out.getContext('2d');
  o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
  const report = {};
  G.forEach((g, k) => {
    const c = document.createElement('canvas'); c.width = c.height = m.BOX;
    const x = c.getContext('2d');
    m.drawGuides(x);
    const ex = m.extraRuns(g, S[g]);
    report[g] = ex.length;
    m.drawGlyph(x, g, '#eef1f8'); // הגופן המלא, חיוור מאוד
    m.drawGlyphWithExtras(x, g, ex, '#f59e0b', S[g]);
    m.drawGlyphWithExtras(x, g, [], '#c7d2fe', S[g]); // מה שהילד רואה (תוספות בכתום)
    x.lineWidth = 3; x.strokeStyle = '#1e293b'; x.lineCap = 'round';
    (S[g] ?? []).forEach((st) => { x.beginPath(); st.forEach(([a, bb], i) => (i ? x.lineTo(a * 400, bb * 400) : x.moveTo(a * 400, bb * 400))); x.stroke(); });
    x.fillStyle = '#000'; x.font = '700 28px sans-serif'; x.fillText(g, 16, 36);
    o.drawImage(c, (k % cols) * cell, Math.floor(k / cols) * cell, cell, cell);
  });
  window.__rep = report;
  return out.toDataURL('image/png');
}, STROKES);
fs.writeFileSync(path.join(ROOT, 'tools', 'shots', 'trace-sheet.png'), Buffer.from(url.split(',')[1], 'base64'));
console.log(JSON.stringify(await p.evaluate(() => window.__rep)));
await b.close();

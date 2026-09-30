// יישור מסלול מוקלט לקו האמצע של האות + החלקה עדינה (בלי לשנות התחלה/סוף/כיוון).
// node tools/trace-fix.mjs a p   → כותב content/strokes.fixed.json + tools/shots/trace-fix.png (לפני/אחרי)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('playwright-core');
const glyphs = process.argv.slice(2);
const SRC = path.join(ROOT, 'app', 'public', 'content', 'strokes.json');
const S = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage();
await p.goto('http://localhost:5178/wilk/');
const res = await p.evaluate(async ({ S, glyphs }) => {
  const m = await import('/wilk/src/data/strokes.ts');
  await m.loadTraceFont();
  const B = m.BOX, stem = m.stemWidth();
  const fixed = {};
  const sheet = document.createElement('canvas'); sheet.width = 400 * glyphs.length; sheet.height = 800;
  const sh = sheet.getContext('2d'); sh.fillStyle = '#fff'; sh.fillRect(0, 0, sheet.width, sheet.height);
  glyphs.forEach((g, gi) => {
    const c = document.createElement('canvas'); c.width = c.height = B;
    const x = c.getContext('2d', { willReadFrequently: true });
    m.drawGlyph(x, g, '#000');
    const d = x.getImageData(0, 0, B, B).data;
    // מרחק מהשפה (chamfer 2 מעברים) — הרכס = קו האמצע
    const INF = 1e9, dist = new Float32Array(B * B);
    for (let i = 0; i < B * B; i++) dist[i] = d[i * 4 + 3] > 100 ? INF : 0;
    for (let y = 0; y < B; y++) for (let X = 0; X < B; X++) {
      const i = y * B + X; if (!dist[i]) continue;
      if (X > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
      if (y > 0) dist[i] = Math.min(dist[i], dist[i - B] + 1);
      if (X > 0 && y > 0) dist[i] = Math.min(dist[i], dist[i - B - 1] + 1.414);
      if (X < B - 1 && y > 0) dist[i] = Math.min(dist[i], dist[i - B + 1] + 1.414);
    }
    for (let y = B - 1; y >= 0; y--) for (let X = B - 1; X >= 0; X--) {
      const i = y * B + X; if (!dist[i]) continue;
      if (X < B - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
      if (y < B - 1) dist[i] = Math.min(dist[i], dist[i + B] + 1);
      if (X < B - 1 && y < B - 1) dist[i] = Math.min(dist[i], dist[i + B + 1] + 1.414);
      if (X > 0 && y < B - 1) dist[i] = Math.min(dist[i], dist[i + B - 1] + 1.414);
    }
    // נקודה שכבר על האות (לא על השפה ממש) נשארת; נקודה בחור / מחוץ לאות — לנקודה הקרובה בתוך הקו
    const R = Math.round(stem * 1.6), KEEP = stem * 0.3, MIN_IN = stem * 0.38;
    const snap = ([px, py]) => {
      const cx = px * B, cy = py * B;
      const here = dist[Math.round(cy) * B + Math.round(cx)] || 0;
      if (here >= KEEP) return [px, py];
      let best = null, bs = -INF;
      for (let yy = Math.max(0, Math.round(cy - R)); yy <= Math.min(B - 1, Math.round(cy + R)); yy++)
        for (let xx = Math.max(0, Math.round(cx - R)); xx <= Math.min(B - 1, Math.round(cx + R)); xx++) {
          const v = dist[yy * B + xx]; if (v < MIN_IN) continue;
          const s = -Math.hypot(xx - cx, yy - cy) + 0.3 * v;
          if (s > bs) { bs = s; best = [xx, yy]; }
        }
      return best ? [best[0] / B, best[1] / B] : [px, py];
    };
    const smooth = (st, w = 3, it = 3) => {
      let a = st.map((q) => [...q]);
      for (let k = 0; k < it; k++) {
        a = a.map((q, i) => {
          if (i === 0 || i === a.length - 1) return q;
          let sx = 0, sy = 0, n = 0;
          for (let j = Math.max(0, i - w); j <= Math.min(a.length - 1, i + w); j++) { sx += a[j][0]; sy += a[j][1]; n++; }
          return [sx / n, sy / n];
        });
      }
      return a;
    };
    const round = (q) => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000];
    fixed[g] = S[g].map((st) => {
      // יישור → החלקה → יישור קל נוסף כדי שההחלקה לא תחתוך פינות מחוץ לאות
      const s1 = smooth(st.map(snap), 2, 2);
      const s2 = s1.map((q, i) => (i === 0 || i === s1.length - 1 ? q : snap(q)));
      return smooth(s2, 2, 2).map(round);
    });
    // לפני (למעלה) / אחרי (למטה)
    [[S[g], 0, '#e11d48'], [fixed[g], 400, '#0f766e']].forEach(([strokes, oy, col]) => {
      const t = document.createElement('canvas'); t.width = t.height = B;
      const tx = t.getContext('2d');
      m.drawGuides(tx); m.drawGlyph(tx, g, '#c7d2fe');
      tx.lineWidth = 4; tx.strokeStyle = col; tx.lineCap = 'round';
      strokes.forEach((st) => { tx.beginPath(); st.forEach(([a, bb], i) => (i ? tx.lineTo(a * B, bb * B) : tx.moveTo(a * B, bb * B))); tx.stroke(); });
      sh.drawImage(t, gi * 400, oy);
    });
  });
  return { fixed, png: sheet.toDataURL('image/png') };
}, { S, glyphs });
fs.writeFileSync(path.join(ROOT, 'tools', 'shots', 'trace-fix.png'), Buffer.from(res.png.split(',')[1], 'base64'));
const out = { ...S, ...res.fixed };
fs.writeFileSync(path.join(ROOT, 'app', 'public', 'content', 'strokes.fixed.json'), JSON.stringify(out));
for (const g of glyphs) console.log(g, 'points', S[g].map((s) => s.length).join('/'), '→', res.fixed[g].map((s) => s.length).join('/'));
await b.close();

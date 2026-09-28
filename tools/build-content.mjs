// Archive (Jigzi JSON + media) → app content: public/content/u{N}.json + public/media/*.webp|mp3 + api/units.json
// node tools/build-content.mjs   (run from WILK/, needs app/node_modules/sharp)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const sharp = require('sharp');

const JSON_DIR = path.join(ROOT, 'archive', 'json');
const MEDIA_IN = path.join(ROOT, 'archive', 'media');
const OUT_CONTENT = path.join(ROOT, 'app', 'public', 'content');
const OUT_MEDIA = path.join(ROOT, 'app', 'public', 'media');
fs.mkdirSync(OUT_CONTENT, { recursive: true });
fs.mkdirSync(OUT_MEDIA, { recursive: true });

// Letters / sound patterns each unit teaches (from the unit titles)
const SKILLS = {
  1: ['c', 'a'], 2: ['t', 's'], 3: ['h', 'r'], 4: ['f', 'm'], 5: ['n'], 6: ['o', 'p', 'on'],
  7: ['e'], 8: ['k', 'l'], 9: ['b', 'ck'], 10: ['g', 'd'], 11: ['i', 'in'], 12: ['v', 'and'],
  13: ['x', 'can'], 14: ['j', 'z'], 15: ['u'], 16: ['q', 'qu'], 17: ['y'], 18: ['w', 'ow'],
};

// שקפים שנשארו ב-Jigzi בטעות מפעילות אחרת (מספרי שקף, מ-1) — לא נכנסים לאפליקציה
const EXCLUDE = {
  4: [18, 19], // זיכרון HAPPY/SAD ושאלות על ט' באב — אחרי שקף הסיום
};

const strip = (o) => {
  if (Array.isArray(o)) return o.map(strip);
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) if (k !== 'editor_state') r[k] = strip(v);
    return r;
  }
  return o;
};

// Collect media refs + which images need remove_white
function walkMedia(node, images, audio, rw, inRw = false) {
  if (Array.isArray(node)) { node.forEach((n) => walkMedia(n, images, audio, rw, inRw)); return; }
  if (!node || typeof node !== 'object') return;
  if (typeof node.id === 'string' && typeof node.lib === 'string' && /^[0-9a-f-]{36}$/.test(node.id)) {
    const key = `${node.lib.toLowerCase()}/${node.id}`;
    if (node.kind === 'png') { images.add(key); if (inRw) rw.add(key); } else audio.add(key);
    return;
  }
  const isRw = Array.isArray(node.effects) && node.effects.includes('remove_white');
  for (const v of Object.values(node)) walkMedia(v, images, audio, rw, inRw || isRw);
}

const jigFiles = fs.readdirSync(JSON_DIR).filter((f) => !f.includes('_') && f.endsWith('.json'));
const units = [];
const images = new Set();
const audio = new Set();
const rw = new Set();

for (const f of jigFiles) {
  const jig = JSON.parse(fs.readFileSync(path.join(JSON_DIR, f), 'utf8'));
  const name = jig.jigData.displayName;
  const n = +(/#\s*(\d+)/.exec(name)?.[1] ?? 0);
  const slides = jig.jigData.modules.filter((_, i) => !(EXCLUDE[n] ?? []).includes(i + 1)).map((m) => {
    const body = JSON.parse(fs.readFileSync(path.join(JSON_DIR, `${jig.id}_${m.id}.json`), 'utf8')).module.body;
    const kind = Object.keys(body)[0];
    return { kind, content: strip(body[kind].content) };
  });
  // שקף TRACING אחרי כל שקף היכרות עם אות ("הכירו את האות X… כתבו את האות הגדולה והקטנה").
  // נוסף בסוף המערך (תוצאות שמורות לפי אינדקס לא זזות) ו-order קובע שיוצג מיד אחרי ההיכרות.
  const order = slides.map((_, i) => i);
  const traces = [];
  slides.slice().forEach((s, i) => {
    if (s.kind !== 'tappingBoard') return;
    const j = JSON.stringify(s.content);
    const m = j.match(/(?:הכירו|תרגלו)[^"]{0,30}האות ([A-Za-z])/);
    if (!m || !/כתבו את האות/.test(j)) return;
    const letter = m[1].toUpperCase();
    const b = s.content.base;
    // הצליל: האזור הלחיץ שעל האות הגדולה (הקרוב ביותר לטקסט האות)
    const txt = b.stickers.map((x) => x.Text).filter(Boolean).find((t) => {
      try { return JSON.parse(t.value).content.some((p) => p.children?.some((c) => c.text?.trim().toUpperCase() === letter)); } catch { return false; }
    });
    const [lx, ly] = txt ? [0.5 + txt.transform.translation[0], 0.5 + txt.transform.translation[1]] : [0.25, 0.28];
    const near = (s.content.traces ?? []).filter((t) => t.audio).map((t) => {
      const [x, y] = t.transform.translation;
      const e = t.shape.Ellipse ?? [0, 0];
      return { t, d: Math.hypot(x + e[0] - lx, y + e[1] - ly) };
    }).sort((a, z) => a.d - z.d)[0];
    const idx = slides.length;
    slides.push({
      kind: 'trace',
      content: {
        letter,
        sound: near?.t.audio ?? null,
        base: { theme: b.theme, backgrounds: b.backgrounds, instructions: null, feedback: null },
      },
    });
    order.splice(order.indexOf(i) + 1, 0, idx);
    traces.push({ letter, idx });
  });
  walkMedia(slides, images, audio, rw);
  units.push({
    order, traces,
    id: `u${n}`, n, jigId: jig.id,
    // "WILK #4 f,m" → "f · m"
    title: name.replace(/^WILK\s*#\s*\d+:?\s*/, '').split(/[,\s]+/).filter(Boolean).join(' · '),
    description: jig.jigData.description,
    skills: SKILLS[n] ?? [],
    plays: jig.plays,
    settings: jig.jigData.defaultPlayerSettings,
    slides,
  });
}
units.sort((a, b) => a.n - b.n);

// ── media ──
const sizes = {};
const REMOVE_WHITE_MIN = 251; // Jigzi: r,g,b > 250 → שקוף (utils/src/image_effects.rs)

async function buildImage(key) {
  const id = key.split('/')[1];
  const src = ['resized.png', 'original.png'].map((f) => path.join(MEDIA_IN, key, f)).find((p) => fs.existsSync(p));
  if (!src) return console.warn('missing image', key);
  const variants = [[id, false]];
  if (rw.has(key)) variants.push([`${id}.rw`, true]);
  for (const [out, removeWhite] of variants) {
    const dst = path.join(OUT_MEDIA, `${out}.webp`);
    if (!fs.existsSync(dst)) {
      let img = sharp(src).ensureAlpha();
      if (removeWhite) {
        const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
        for (let i = 0; i < data.length; i += 4) {
          if (Math.min(data[i], data[i + 1], data[i + 2]) >= REMOVE_WHITE_MIN) data[i + 3] = 0;
        }
        img = sharp(data, { raw: info });
      }
      await img.webp({ quality: 84, alphaQuality: 90 }).toFile(dst);
    }
  }
  const meta = await sharp(src).metadata();
  sizes[id] = [meta.width, meta.height];
}

let i = 0;
const imgList = [...images];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < imgList.length) await buildImage(imgList[i++]);
}));
let missingAudio = 0;
for (const key of audio) {
  const src = path.join(MEDIA_IN, key, 'audio.mp3');
  const dst = path.join(OUT_MEDIA, `${key.split('/')[1]}.mp3`);
  if (!fs.existsSync(src)) { missingAudio++; continue; }
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
}

for (const u of units) {
  const used = {};
  walkMedia(u.slides, { add: (k) => { const id = k.split('/')[1]; if (sizes[id]) used[id] = sizes[id]; } }, { add() {} }, { add() {} });
  fs.writeFileSync(path.join(OUT_CONTENT, `${u.id}.json`), JSON.stringify({ ...u, sizes: used }));
}

const catalog = units.map((u) => ({
  id: u.id, n: u.n, title: u.title, skills: u.skills, slides: u.slides.length,
  kinds: u.slides.map((s) => s.kind),
  traces: u.traces,
  jigziPlays: u.plays, // כניסות בזמן Jigzi (2023–2026)
}));
fs.writeFileSync(path.join(OUT_CONTENT, 'units.json'), JSON.stringify(catalog));
fs.writeFileSync(path.join(ROOT, 'api', 'units.json'), JSON.stringify(catalog.map(({ kinds, traces, ...c }) => c), null, 1));

const bytes = fs.readdirSync(OUT_MEDIA).reduce((s, f) => s + fs.statSync(path.join(OUT_MEDIA, f)).size, 0);
console.log(`units ${units.length}, slides ${units.reduce((s, u) => s + u.slides.length, 0)}, images ${images.size} (rw ${rw.size}), audio ${audio.size} (missing ${missingAudio}), media ${(bytes / 1e6).toFixed(1)} MB`);

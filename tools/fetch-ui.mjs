// Theme backgrounds/card backs + fonts used by the WILK content, from media.jigzi.org/ui → archive/ui
// Then copies them into app/public/ui and writes app/public/ui/themes.json (only used themes) + fonts.css
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI = path.join(ROOT, 'archive', 'ui');
const OUT = path.join(ROOT, 'app', 'public', 'ui');
const CONTENT = path.join(ROOT, 'app', 'public', 'content');
const CDN = 'https://media.jigzi.org/ui/';

const themes = JSON.parse(fs.readFileSync(path.join(UI, 'themes.json'), 'utf8'));
const fonts = JSON.parse(fs.readFileSync(path.join(UI, 'fonts.json'), 'utf8'));
const fontKey = Object.fromEntries(Object.keys(fonts).map((k) => [k.toLowerCase(), k]));

// Jigzi ThemeId → config/asset id (strum kebab-case + special cases)
const SPECIAL = { TuBishvat: 'tubishvat', PassoveMatza: 'passover-matza', Valentine: 'valentine_s-day' };
const kebab = (id) => SPECIAL[id] ?? id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const all = fs.readdirSync(CONTENT).filter((f) => /^u\d+\.json$/.test(f)).map((f) => fs.readFileSync(path.join(CONTENT, f), 'utf8')).join('');
const usedThemes = [...new Set([...all.matchAll(/"theme":"(\w+)"/g)].map((m) => m[1]))];

const families = new Set();
const addFamilies = (s) => s.split(',').map((x) => x.trim().replace(/^['"\\]+|['"\\]+$/g, '')).filter(Boolean).forEach((f) => families.add(f));
// גופנים מתוך הטקסט העשיר (Text.value הוא JSON בתוך מחרוזת)
const walk = (n) => {
  if (Array.isArray(n)) return n.forEach(walk);
  if (!n || typeof n !== 'object') return;
  if (n.Text && typeof n.Text.value === 'string') {
    try { JSON.parse(n.Text.value).content.forEach((p) => p.children.forEach((c) => c.font && addFamilies(c.font))); } catch { /* */ }
  }
  Object.values(n).forEach(walk);
};
for (const f of fs.readdirSync(CONTENT).filter((f) => /^u\d+\.json$/.test(f))) walk(JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')));
const themeOut = {};
for (const t of usedThemes) {
  const id = kebab(t);
  const cfg = themes[id];
  if (!cfg) { console.warn('no theme config', t, id); continue; }
  themeOut[t] = { ...cfg, assetId: id };
  cfg.fontFamilies.forEach(addFamilies);
}

async function get(rel, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  const res = await fetch(CDN + rel);
  if (!res.ok) { console.warn('  miss', rel, res.status); return false; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

for (const t of Object.values(themeOut)) {
  for (const f of ['bg.jpg', 'card-back.png', 'card-back-icon.png']) {
    const ok = await get(`theme/${t.assetId}/${f}`, path.join(UI, 'theme', t.assetId, f));
    if (ok) {
      fs.mkdirSync(path.join(OUT, 'theme', t.assetId), { recursive: true });
      fs.copyFileSync(path.join(UI, 'theme', t.assetId, f), path.join(OUT, 'theme', t.assetId, f));
    }
  }
}

let css = '';
const missingFonts = [];
for (const fam of families) {
  const key = fontKey[fam.toLowerCase()];
  if (!key) { missingFonts.push(fam); continue; }
  const f = fonts[key];
  if (!(await get(`fonts/${f.file}`, path.join(UI, 'fonts', f.file)))) continue;
  fs.mkdirSync(path.dirname(path.join(OUT, 'fonts', f.file)), { recursive: true });
  fs.copyFileSync(path.join(UI, 'fonts', f.file), path.join(OUT, 'fonts', f.file));
  // שם המשפחה כפי שמופיע בתוכן + שם הקנוני (התאמה לא תלויה ברישיות)
  for (const name of new Set([key, fam])) {
    // נתיב יחסי לקובץ ה-CSS (ui/fonts.css) — עובד תחת כל נתיב בסיס
    css += `@font-face{font-family:'${name}';src:url('fonts/${encodeURI(f.file)}') format('${f.format}');font-display:swap;${f.range ? `unicode-range:${f.range};` : ''}}\n`;
  }
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), css);
fs.writeFileSync(path.join(OUT, 'themes.json'), JSON.stringify(themeOut));
console.log('themes', Object.keys(themeOut).length, '| fonts', families.size, '| no font file for:', missingFonts.join(', ') || '—');

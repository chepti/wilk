// מסלולי כתיבה לאותיות (שקפי TRACING): לכל אות — מערך משיכות, כל משיכה רשימת נקודות [x, y]
// מנורמלות 0..1 בתוך ריבוע האות. מוקלטים בעורך #/trace-edit ונשמרים בשרת (strokes.json).
// הגיאומטריה (גופן, גודל, קו בסיס) משותפת לעורך ולשקף — חייבת להיות זהה כדי שהמסלול ישב על האות.

import { fetchStrokes, type StrokeMap } from '../lib/api';
import { BASE } from '../lib/mediaPaths';

export type StrokePt = [number, number];
export type GlyphStrokes = StrokePt[][];

/** גופן הכתיבה — Quicksand (הגופן של שקפי ההיכרות), מוגדר ב-styles.css עם טווח משקלים */
export const TRACE_FONT = 'WilkTrace';
export const TRACE_WEIGHT = 600;
/** רזולוציית הקנבס (ריבוע) — הקואורדינטות מנורמלות אליו */
export const BOX = 400;
export const FONT_PX = Math.round(BOX * 0.6);
/** קו הבסיס — חלק מגובה הריבוע */
export const BASE_Y = 0.66;

export const fontSpec = () => `${TRACE_WEIGHT} ${FONT_PX}px ${TRACE_FONT}`;

let fontReady: Promise<void> | null = null;
export function loadTraceFont(): Promise<void> {
  fontReady ??= (async () => {
    try {
      const f = new FontFace(TRACE_FONT, `url(${BASE}ui/fonts/quicksand-variablefont_wght.ttf)`, { weight: '300 700' });
      document.fonts.add(await f.load());
    } catch { /* נופלים לגופן ברירת מחדל */ }
    guidesCache = null;
  })();
  return fontReady;
}

/** ארבעת קווי המחברת (חלק מגובה הריבוע): עליון, אמצע (x-height), בסיס, תחתון */
export interface Guides { top: number; mid: number; base: number; desc: number }

let guidesCache: Guides | null = null;
export function guides(): Guides {
  if (guidesCache) return guidesCache;
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = fontSpec();
  const cap = ctx.measureText('H').actualBoundingBoxAscent || FONT_PX * 0.7;
  const x = ctx.measureText('x').actualBoundingBoxAscent || FONT_PX * 0.5;
  const d = ctx.measureText('p').actualBoundingBoxDescent || FONT_PX * 0.2;
  const b = BASE_Y * BOX;
  const g = { top: (b - cap) / BOX, mid: (b - x) / BOX, base: BASE_Y, desc: (b + d) / BOX };
  if (document.fonts.check(fontSpec())) guidesCache = g;
  return g;
}

/** קווי מחברת + האות ברקע (לעורך ולשקף) */
export function drawGuides(ctx: CanvasRenderingContext2D) {
  const g = guides();
  const line = (y: number, w: number, c: string, dash: number[] = []) => {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.moveTo(BOX * 0.04, BOX * y);
    ctx.lineTo(BOX * 0.96, BOX * y);
    ctx.stroke();
  };
  line(g.top, 2.5, '#9fb4e8');
  line(g.mid, 2, '#b9c7ef', [10, 9]);
  line(g.base, 3.5, '#6f86d6');
  line(g.desc, 2.5, '#9fb4e8');
  ctx.setLineDash([]);
}

export function drawGlyph(ctx: CanvasRenderingContext2D, glyph: string, color: string) {
  ctx.font = fontSpec();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(glyph, BOX / 2, BOX * BASE_Y);
}

/** עובי הקו של הגופן (פיקסלים בקנבס) — נמדד מגזע האות l */
let stemCache = 0;
export function stemWidth(): number {
  if (stemCache) return stemCache;
  const c = document.createElement('canvas'); c.width = c.height = BOX;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  drawGlyph(ctx, 'l', '#000');
  const y = Math.round(BOX * (BASE_Y - 0.1));
  const row = ctx.getImageData(0, y, BOX, 1).data;
  let n = 0;
  for (let x = 0; x < BOX; x++) if (row[x * 4 + 3] > 60) n++;
  const w = n > 4 ? n : Math.round(FONT_PX * 0.11);
  if (document.fonts.check(fontSpec())) stemCache = w;
  return w;
}

/**
 * תוספות למסלול שהגופן לא מצייר (צ'ופציקים ב-I, הגג של J, הזנב של U):
 * רצפים של נקודות מהמסלול המוקלט שיוצאים מהאות — מצוירים באותו עובי ונהיים חלק מהאות.
 * רעידות קטנות בתוך שולי האות לא נחשבות.
 */
export function extraRuns(glyph: string, strokes: GlyphStrokes | null): StrokePt[][] {
  if (!strokes?.length) return [];
  const c = document.createElement('canvas'); c.width = c.height = BOX;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  drawGlyph(ctx, glyph, '#000');
  const stem = stemWidth();
  ctx.lineWidth = stem * 0.2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.strokeText(glyph, BOX / 2, BOX * BASE_Y);
  const d = ctx.getImageData(0, 0, BOX, BOX).data;
  // "בחוץ" = מה שמגיעים אליו משולי הריבוע בלי לחצות את האות. החור של a / p / o הוא לא בחוץ —
  // מסלול שעובר דרכו (חזרה אל הגזע) הוא לא תוספת.
  const outside = new Uint8Array(BOX * BOX);
  const queue: number[] = [];
  const push = (i: number) => { if (!outside[i] && d[i * 4 + 3] <= 30) { outside[i] = 1; queue.push(i); } };
  for (let k = 0; k < BOX; k++) { push(k); push((BOX - 1) * BOX + k); push(k * BOX); push(k * BOX + BOX - 1); }
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % BOX, y = (i / BOX) | 0;
    if (x > 0) push(i - 1);
    if (x < BOX - 1) push(i + 1);
    if (y > 0) push(i - BOX);
    if (y < BOX - 1) push(i + BOX);
  }
  const inside = ([x, y]: StrokePt) => {
    const xi = Math.round(x * BOX), yi = Math.round(y * BOX);
    return !(xi >= 0 && yi >= 0 && xi < BOX && yi < BOX) || !outside[yi * BOX + xi];
  };
  const runs: StrokePt[][] = [];
  for (const st of strokes) {
    let run: number[] = [];
    const flush = () => {
      if (run.length) {
        const a = Math.max(0, run[0] - 1), b = Math.min(st.length - 1, run[run.length - 1] + 1);
        const seg = st.slice(a, b + 1);
        let len = 0;
        for (let i = 1; i < seg.length; i++) len += Math.hypot(seg[i][0] - seg[i - 1][0], seg[i][1] - seg[i - 1][1]) * BOX;
        // תוספת אמיתית = יוצאת מהאות לאורך של שליש עובי קו לפחות (רעידה קטנה בקצה לא נחשבת)
        if (len >= stem * 0.3 || st.length <= 4) runs.push(seg);
      }
      run = [];
    };
    st.forEach((p, i) => { if (!inside(p)) run.push(i); else flush(); });
    flush();
  }
  return runs;
}

/**
 * האות + התוספות — אותו ציור לתבנית ולמסכה. עם מסלול מוקלט: חלקי גופן רחוקים מהמסלול
 * (כמו הזנב הגלי של Q בגופן, כשהמסלול מלמד זנב קצר) לא מוצגים — מציירים רק מה שכותבים.
 */
export function drawGlyphWithExtras(ctx: CanvasRenderingContext2D, glyph: string, extras: StrokePt[][], color: string, strokes?: GlyphStrokes | null) {
  if (strokes?.length) {
    const off = document.createElement('canvas'); off.width = off.height = BOX;
    const o = off.getContext('2d')!;
    drawGlyph(o, glyph, color);
    o.globalCompositeOperation = 'destination-in';
    o.lineCap = 'round'; o.lineJoin = 'round';
    o.lineWidth = stemWidth() * 2.4;
    o.strokeStyle = '#000';
    o.beginPath(); // נתיב אחד לכל המשיכות — destination-in פעם אחת על האיחוד
    for (const st of strokes) {
      st.forEach(([x, y], i) => (i ? o.lineTo(x * BOX, y * BOX) : o.moveTo(x * BOX, y * BOX)));
      if (st.length === 1) o.lineTo(st[0][0] * BOX + 0.1, st[0][1] * BOX);
    }
    o.stroke();
    ctx.drawImage(off, 0, 0);
  } else {
    drawGlyph(ctx, glyph, color);
  }
  if (!extras.length) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = stemWidth();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const r of extras) {
    ctx.beginPath();
    if (r.length === 1) { ctx.arc(r[0][0] * BOX, r[0][1] * BOX, stemWidth() / 2, 0, Math.PI * 2); ctx.fill(); continue; }
    r.forEach(([x, y], i) => (i ? ctx.lineTo(x * BOX, y * BOX) : ctx.moveTo(x * BOX, y * BOX)));
    ctx.stroke();
  }
  ctx.restore();
}

export const STROKE_COLORS = ['#16a34a', '#f59e0b', '#8b5cf6', '#e05252', '#3b82f6', '#0d9488'];

/** סדר האותיות כפי שהן נלמדות בתחנות */
export const COURSE_LETTERS = 'CATSHRFMNOPEKLBGDIVXJZUQYW'.split('');

// ── טעינה: שרת (חי) → עותק סטטי בבנייה → כלום ──

let cache: Promise<StrokeMap> | null = null;

export function loadStrokes(force = false): Promise<StrokeMap> {
  if (!cache || force) {
    cache = fetchStrokes()
      .catch(() => fetch(`${BASE}content/strokes.json`).then((r) => (r.ok ? r.json() : {})))
      .catch(() => ({}));
  }
  return cache;
}

export function setCachedStrokes(map: StrokeMap) {
  cache = Promise.resolve(map);
}

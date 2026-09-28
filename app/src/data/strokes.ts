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

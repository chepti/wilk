import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { BOX, BASE_Y, STROKE_COLORS, drawGlyph, drawGuides, fontSpec, type GlyphStrokes } from '../data/strokes';
import { playVoice, voicePlaying, playPositive } from '../lib/audio';
import { IconCheck } from './icons';

// ריבוע כתיבה לאות אחת: האות בהירה על קווי מחברת, נקודות התחלה ממוספרות,
// הדגמה מונפשת לפי המסלול שהוקלט, והילד מצייר עם האצבע. הקו כחול על האות וכתום כשהוא חורג.
// הצליל של האות מתנגן כל עוד מציירים. עוברים כשמכסים מספיק מהאות ומתחילים מהנקודה הנכונה.

const INK_W = 22;
const HIT_W = 46;
const TOLERANT_W = 40;
const COVER_PASS = 0.72;
const STRAY_MAX = 0.35;
const START_NEAR = 0.16;

interface Pt { x: number; y: number }
interface Mask { glyph: Uint8Array; tolerant: Uint8Array; count: number }

function buildMask(glyph: string): Mask {
  const c = document.createElement('canvas');
  c.width = BOX; c.height = BOX;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  drawGlyph(ctx, glyph, '#000');
  const g = ctx.getImageData(0, 0, BOX, BOX).data;
  ctx.lineWidth = TOLERANT_W;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.font = fontSpec();
  ctx.strokeText(glyph, BOX / 2, BOX * BASE_Y);
  const t = ctx.getImageData(0, 0, BOX, BOX).data;
  const mg = new Uint8Array(BOX * BOX), mt = new Uint8Array(BOX * BOX);
  let count = 0;
  for (let i = 0; i < BOX * BOX; i++) {
    if (g[i * 4 + 3] > 60) { mg[i] = 1; count++; }
    if (t[i * 4 + 3] > 30) mt[i] = 1;
  }
  return { glyph: mg, tolerant: mt, count: Math.max(1, count) };
}

export interface TraceBoxHandle { demo: () => void; clear: () => void }

export interface TraceBoxProps {
  glyph: string;
  strokes: GlyphStrokes | null;
  /** אפשר לצייר (לא מנוטרל / לא הושלם) */
  enabled: boolean;
  /** הצליל שמתנגן תוך כדי ציור */
  sound?: string | null;
  /** הושלם: firstTry = בלי ניסיון כושל קודם */
  onDone: (firstTry: boolean) => void;
  onHint?: (msg: string | null) => void;
  onFill?: (pct: number) => void;
  done?: boolean;
  autoDemo?: boolean;
  className?: string;
}

const TraceBox = forwardRef<TraceBoxHandle, TraceBoxProps>(function TraceBox(
  { glyph, strokes, enabled, sound, onDone, onHint, onFill, done, autoDemo = true, className }, ref,
) {
  const tplRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const demoRef = useRef<HTMLCanvasElement>(null);
  const hitRef = useRef<HTMLCanvasElement | null>(null);
  const mask = useRef<Mask | null>(null);
  const drawing = useRef(false);
  const last = useRef<Pt | null>(null);
  const firstPt = useRef<Pt | null>(null);
  const firstTry = useRef(true);
  const demoRaf = useRef<number | null>(null);
  const soundLoop = useRef(0);

  const pts = (strokes ?? []).map((s) => s.map(([x, y]) => ({ x: x * BOX, y: y * BOX })));

  const drawTemplate = () => {
    const ctx = tplRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, BOX, BOX);
    drawGuides(ctx);
    drawGlyph(ctx, glyph, done ? '#c9f0d6' : '#dfe6fb');
    if (done) return;
    // נקודות התחלה ממוספרות לכל משיכה
    pts.forEach((st, i) => {
      const s = st[0];
      ctx.beginPath();
      ctx.arc(s.x, s.y, i === 0 ? 15 : 12, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#16a34a' : '#5b6fc7';
      ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), s.x, s.y + 1);
    });
  };

  const demo = () => {
    const c = demoRef.current;
    if (!c || !pts.length) return;
    if (demoRaf.current) cancelAnimationFrame(demoRaf.current);
    const ctx = c.getContext('2d')!;
    const total = pts.reduce((n, s) => n + s.length, 0);
    const DURATION = Math.min(3800, 1000 + total * 18) + pts.length * 250;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / DURATION);
      ctx.clearRect(0, 0, BOX, BOX);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = INK_W;
      let remain = Math.max(1, Math.floor(p * total));
      let head = pts[0][0];
      pts.forEach((st, si) => {
        if (remain <= 0) return;
        const upto = Math.min(st.length, remain);
        ctx.strokeStyle = STROKE_COLORS[si % STROKE_COLORS.length] + '66';
        ctx.beginPath();
        ctx.moveTo(st[0].x, st[0].y);
        for (let i = 1; i < upto; i++) ctx.lineTo(st[i].x, st[i].y);
        ctx.stroke();
        head = st[upto - 1];
        remain -= st.length;
      });
      ctx.beginPath();
      ctx.arc(head.x, head.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#3346a8';
      ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      if (p < 1) demoRaf.current = requestAnimationFrame(step);
      else setTimeout(() => ctx.clearRect(0, 0, BOX, BOX), 450);
    };
    demoRaf.current = requestAnimationFrame(step);
  };

  const clear = () => {
    inkRef.current?.getContext('2d')!.clearRect(0, 0, BOX, BOX);
    hitRef.current?.getContext('2d')!.clearRect(0, 0, BOX, BOX);
    firstPt.current = null;
    last.current = null;
    onFill?.(0);
    onHint?.(null);
  };

  useImperativeHandle(ref, () => ({ demo, clear }));

  useEffect(() => {
    mask.current = buildMask(glyph);
    firstTry.current = true;
    if (!hitRef.current) {
      hitRef.current = document.createElement('canvas');
      hitRef.current.width = BOX; hitRef.current.height = BOX;
    }
    clear();
    drawTemplate();
    return () => { if (demoRaf.current) cancelAnimationFrame(demoRaf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph, JSON.stringify(strokes)]);

  useEffect(drawTemplate, [done]);

  // הדגמה כשהריבוע נפתח לציור
  useEffect(() => {
    if (enabled && autoDemo && !done) {
      const t = setTimeout(demo, 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, glyph, JSON.stringify(strokes)]);

  useEffect(() => () => { soundLoop.current++; }, []);

  const startSound = () => {
    if (!sound) return;
    const my = ++soundLoop.current;
    const loop = () => {
      if (my !== soundLoop.current || !drawing.current) return;
      if (voicePlaying()) return;
      playVoice(sound).then(() => { if (my === soundLoop.current && drawing.current) setTimeout(loop, 250); });
    };
    loop();
  };

  const toBox = (e: React.PointerEvent): Pt => {
    const r = inkRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * BOX, y: ((e.clientY - r.top) / r.height) * BOX };
  };

  const inside = (p: Pt) => {
    const xi = Math.round(p.x), yi = Math.round(p.y);
    if (xi < 0 || yi < 0 || xi >= BOX || yi >= BOX) return false;
    return mask.current!.tolerant[yi * BOX + xi] === 1;
  };

  const strokeTo = (p: Pt, begin: boolean) => {
    const from = begin || !last.current ? p : last.current;
    const ink = inkRef.current!.getContext('2d')!;
    ink.lineCap = 'round'; ink.lineJoin = 'round'; ink.lineWidth = INK_W;
    ink.strokeStyle = inside(p) ? '#3346a8' : '#f97316';
    ink.beginPath(); ink.moveTo(from.x, from.y); ink.lineTo(p.x, p.y); ink.stroke();
    const hit = hitRef.current!.getContext('2d')!;
    hit.lineCap = 'round'; hit.lineJoin = 'round'; hit.lineWidth = HIT_W; hit.strokeStyle = '#000';
    hit.beginPath(); hit.moveTo(from.x, from.y); hit.lineTo(p.x, p.y); hit.stroke();
    last.current = p;
  };

  const measure = () => {
    const m = mask.current!;
    const hit = hitRef.current!.getContext('2d')!.getImageData(0, 0, BOX, BOX).data;
    const ink = inkRef.current!.getContext('2d')!.getImageData(0, 0, BOX, BOX).data;
    let covered = 0, total = 0, out = 0;
    for (let i = 0; i < BOX * BOX; i++) {
      if (m.glyph[i] && hit[i * 4 + 3] > 0) covered++;
      if (ink[i * 4 + 3] > 0) { total++; if (!m.tolerant[i]) out++; }
    }
    return { coverage: covered / m.count, stray: total ? out / total : 0 };
  };

  const evaluate = () => {
    const { coverage, stray } = measure();
    onFill?.(Math.round(coverage * 100));
    const s0 = pts[0]?.[0];
    const fp = firstPt.current;
    const startOk = !s0 || (!!fp && Math.hypot(fp.x - s0.x, fp.y - s0.y) <= BOX * START_NEAR);
    if (coverage >= COVER_PASS && stray <= STRAY_MAX && startOk) {
      onHint?.(null);
      playPositive();
      onDone(firstTry.current);
      return;
    }
    if (coverage >= COVER_PASS && !startOk) {
      firstTry.current = false;
      onHint?.('מתחילים מהנקודה הירוקה — צפו בהדגמה ונסו שוב');
      setTimeout(() => { clear(); demo(); }, 1100);
    } else if (coverage >= COVER_PASS) {
      firstTry.current = false;
      onHint?.('כמעט! נסו להישאר על האות (הכתום יצא החוצה)');
    } else {
      onHint?.('ממשיכים לכתוב על כל האות...');
    }
  };

  return (
    <div className={`trace-box${enabled && !done ? ' on' : ''}${done ? ' done' : ''}${className ? ' ' + className : ''}`}>
      <canvas ref={tplRef} width={BOX} height={BOX} />
      <canvas
        ref={inkRef} width={BOX} height={BOX} className="trace-ink"
        onPointerDown={(e) => {
          if (!enabled || done) return;
          e.preventDefault();
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
          if (demoRaf.current) { cancelAnimationFrame(demoRaf.current); demoRef.current?.getContext('2d')!.clearRect(0, 0, BOX, BOX); }
          const p = toBox(e);
          drawing.current = true;
          if (!firstPt.current) firstPt.current = p;
          strokeTo(p, true);
          onHint?.(null);
          startSound();
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ev = e.nativeEvent;
          const list = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : [ev];
          for (const c of list.length ? list : [ev]) strokeTo(toBox(c as unknown as React.PointerEvent), false);
        }}
        onPointerUp={() => { if (!drawing.current) return; drawing.current = false; last.current = null; evaluate(); }}
        onPointerCancel={() => { drawing.current = false; last.current = null; }}
      />
      <canvas ref={demoRef} width={BOX} height={BOX} className="trace-demo" />
      {done && <div className="trace-done pop-in"><IconCheck size={64} strokeWidth={3} /></div>}
    </div>
  );
});

export default TraceBox;

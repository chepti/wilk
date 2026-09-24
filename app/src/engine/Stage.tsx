import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { Background, Sticker, Trace, Transform, TextSticker, SpriteSticker, EmbedSticker } from './types';
import { mediaUrl } from '../lib/mediaPaths';
import { themeBg, themeVars } from './theme';

// הבמה: 1920x1080 יחידות ייחוס (כמו ב-Jigzi), מוקטנת להתאמה למסך.

export const W = 1920;
export const H = 1080;

interface StageCtx { scale: number; sizes: Record<string, [number, number]>; toStage: (clientX: number, clientY: number) => [number, number] }
const Ctx = createContext<StageCtx>({ scale: 1, sizes: {}, toStage: (x, y) => [x, y] });
export const useStage = () => useContext(Ctx);

/** זווית מקווטרניון סביב z (רדיאנים, חיובי = עם כיוון השעון) */
export const angle = (t: Transform) => 2 * Math.atan2(t.rotation[2], t.rotation[3]);

export function StageFrame({ sizes, theme, children }: { sizes: Record<string, [number, number]>; theme: string; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / W, el.clientHeight / H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const toStage = (cx: number, cy: number): [number, number] => {
    const r = inner.current?.getBoundingClientRect();
    if (!r || !scale) return [0, 0];
    return [(cx - r.left) / scale, (cy - r.top) / scale];
  };
  return (
    <div ref={outer} className="stage-outer">
      <div
        ref={inner}
        className="stage"
        style={{ width: W, height: H, transform: `scale(${scale})`, opacity: scale ? 1 : 0, ...themeVars(theme) }}
        dir="ltr"
      >
        <Ctx.Provider value={{ scale: scale || 1, sizes, toStage }}>{children}</Ctx.Provider>
      </div>
    </div>
  );
}

// ── רקעים: ערכת עיצוב → שכבה 1 → שכבה 2 ──

function BgLayer({ bg }: { bg: Background }) {
  if (!bg) return null;
  if ('Image' in bg) return <img className="stage-fill" src={mediaUrl(bg.Image.id, 'webp')} alt="" draggable={false} />;
  if ('Color' in bg && bg.Color) {
    const c = bg.Color as unknown;
    const css = typeof c === 'string' ? c : (() => { const o = c as { r: number; g: number; b: number; a: number }; return `rgba(${o.r},${o.g},${o.b},${o.a / 255})`; })();
    return <div className="stage-fill" style={{ background: css }} />;
  }
  return null;
}

export function Backgrounds({ theme, layers }: { theme: string; layers: Background[] }) {
  const tb = themeBg(theme);
  return (
    <>
      {tb && <img className="stage-fill" src={tb} alt="" draggable={false} />}
      {layers.map((l, i) => <BgLayer key={i} bg={l} />)}
    </>
  );
}

// ── מדבקות ──

export function spriteBox(s: SpriteSticker['Sprite'], sizes: Record<string, [number, number]>) {
  const [w, h] = sizes[s.image.id] ?? [200, 200];
  const t = s.transform;
  return { w, h, cx: W / 2 + t.translation[0] * W, cy: H / 2 + t.translation[1] * H, sx: t.scale[0], sy: t.scale[1], rot: angle(t) };
}

export function SpriteView({ s, style, className, onPointerDown }: {
  s: SpriteSticker['Sprite']; style?: React.CSSProperties; className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const { sizes } = useStage();
  const b = spriteBox(s, sizes);
  const rw = s.effects?.includes('remove_white');
  return (
    <div
      className={`sticker ${className ?? ''}`}
      onPointerDown={onPointerDown}
      style={{
        left: (W - b.w) / 2, top: (H - b.h) / 2, width: b.w, height: b.h,
        transform: `translate(${s.transform.translation[0] * W}px, ${s.transform.translation[1] * H}px) rotate(${b.rot}rad) scale(${b.sx}, ${b.sy})`,
        ...style,
      }}
    >
      <img
        src={mediaUrl(s.image.id, 'webp', rw)} alt="" draggable={false}
        style={{ width: '100%', height: '100%', transform: `scale(${s.flip_horizontal ? -1 : 1}, ${s.flip_vertical ? -1 : 1})` }}
      />
    </div>
  );
}

interface RichLeaf {
  text: string; element?: string; font?: string; fontSize?: number; weight?: number;
  color?: string; highlightColor?: string; italic?: boolean; underline?: boolean;
}
interface RichDoc { content: { children: RichLeaf[]; align?: string }[]; boxColor?: string }

export function parseRich(value: string): RichDoc {
  try { return JSON.parse(value); } catch { return { content: [] }; }
}

export function richPlainText(value: string): string {
  return parseRich(value).content.map((p) => p.children.map((c) => c.text).join('')).join('\n');
}

/** "#RRGGBBAA" → צבע CSS */
const cssColor = (c?: string) => (c && /^#[0-9a-f]{8}$/i.test(c) ? `#${c.slice(1, 7)}${c.slice(7)}` : c);

export function RichText({ value, override }: { value: string; override?: string }) {
  const doc = parseRich(value);
  // כמו textValue של Jigzi: הטקסט נכנס לעלה האחרון שיש בו טקסט, והשאר נמחק
  let paras = doc.content;
  if (override !== undefined) {
    const withText = doc.content.flatMap((p) => p.children.filter((c) => c.text).map((c) => ({ p, c })));
    const last = withText[withText.length - 1];
    paras = [{ children: [{ ...(last?.c ?? { element: 'H1' }), text: override }], align: last?.p.align }];
  }
  return (
    <div className="rich" style={{ background: cssColor(doc.boxColor) }}>
      {paras.map((p, i) => (
        <p key={i} dir="auto" style={{ textAlign: p.align === 'Center' ? 'center' : p.align === 'Right' ? 'right' : undefined }}>
          {/* כמו ב-Jigzi: עלה ריק = <span><br/></span> עם הסגנון שלו — שורה ריקה בגובה מלא של הכותרת */}
          {p.children.map((c, j) => (
            <span
              key={j}
              data-type={c.element}
              style={{
                fontFamily: c.font, fontSize: c.fontSize ? `${c.fontSize}px` : undefined,
                fontWeight: c.weight, color: cssColor(c.color), backgroundColor: cssColor(c.highlightColor),
                fontStyle: c.italic ? 'italic' : undefined, textDecoration: c.underline ? 'underline' : undefined,
              }}
            >
              {c.text === '' ? <br /> : c.text}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

/**
 * מדבקת טקסט — בדיוק כמו Jigzi (components/src/stickers/text/dom.rs):
 * מודדים את התיבה ברוחב טבעי (שורה לא שבורה), וממקמים לפיה כך שמרכזה בנקודת המדבקה.
 * התיבה עצמה מוגבלת לשפת הבמה — שורה ארוכה נשברת שם ויורדת למטה (על זה צוירו אזורי המגע).
 * בשאלות (override) המידות והמיקום נלקחים מטקסט המקום המקורי.
 */
export function TextView({ s, override, style, className, onPointerDown }: {
  s: TextSticker['Text']; override?: string; style?: React.CSSProperties; className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const t = s.transform;
  const meas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  useLayoutEffect(() => {
    const el = meas.current;
    if (!el) return;
    const read = () => setSize((p) => (p && p[0] === el.offsetWidth && p[1] === el.offsetHeight ? p : [el.offsetWidth, el.offsetHeight]));
    read();
    document.fonts?.ready.then(read).catch(() => {});
  }, [s.value]);
  const [w, h] = size ?? [0, 0];
  const left = W / 2 + t.translation[0] * W - w / 2;
  const top = H / 2 + t.translation[1] * H - h / 2;
  return (
    <div
      className={`sticker text-sticker ${className ?? ''}`}
      onPointerDown={onPointerDown}
      style={{
        left, top, maxWidth: Math.max(40, W - left),
        transformOrigin: `${w / 2}px ${h / 2}px`,
        transform: `rotate(${angle(t)}rad)`,
        visibility: size ? undefined : 'hidden',
        ...style,
      }}
    >
      <RichText value={s.value} override={override} />
      <div ref={meas} className="text-measure" aria-hidden="true"><RichText value={s.value} /></div>
    </div>
  );
}

export function StickerView({ st, textOverride, embed }: {
  st: Sticker; textOverride?: string; embed?: (e: EmbedSticker['Embed']) => React.ReactNode;
}) {
  if ('Sprite' in st) return <SpriteView s={st.Sprite} />;
  if ('Text' in st) return <TextView s={st.Text} override={textOverride} />;
  if ('Embed' in st) return embed ? <>{embed(st.Embed)}</> : null;
  return null;
}

export function Stickers({ list, textOverrides, embed }: {
  list: Sticker[]; textOverrides?: Record<number, string>; embed?: (e: EmbedSticker['Embed']) => React.ReactNode;
}) {
  return <>{list.map((st, i) => <StickerView key={i} st={st} textOverride={textOverrides?.[i]} embed={embed} />)}</>;
}

// ── אזורי מגע (traces): ראשית בפינה השמאלית-עליונה של הבמה ──

export function traceGeom(t: Trace) {
  const sh = t.shape as Record<string, unknown>;
  let w = 0, h = 0, el: React.ReactElement | null = null;
  if ('Rect' in sh) {
    const [rw, rh] = sh.Rect as [number, number];
    w = rw * W; h = rh * H;
    el = <rect x={0} y={0} width={w} height={h} />;
  } else if ('Ellipse' in sh) {
    const [rx, ry] = sh.Ellipse as [number, number];
    w = rx * 2 * W; h = ry * 2 * H;
    el = <ellipse cx={rx * W} cy={ry * H} rx={rx * W} ry={ry * H} />;
  } else if ('Path' in sh) {
    const pts = sh.Path as [number, number][];
    const xs = pts.map((p) => p[0] * W), ys = pts.map((p) => p[1] * H);
    w = Math.max(...xs); h = Math.max(...ys);
    el = <path d={`M ${pts.map((p) => `${p[0] * W} ${p[1] * H}`).join(' ')} Z`} />;
  }
  const tr = t.transform;
  const transform = `translate(${tr.translation[0] * W} ${tr.translation[1] * H}) translate(${w / 2} ${h / 2}) rotate(${(angle(tr) * 180) / Math.PI}) scale(${tr.scale[0]} ${tr.scale[1]}) translate(${-w / 2} ${-h / 2})`;
  return { el, transform, w, h };
}

/** מרכז אזור מגע ורוחבו, בקואורדינטות במה (לבועות טקסט) */
export function traceCenter(t: Trace): { x: number; y: number; w: number; h: number } {
  const g = traceGeom(t);
  const tr = t.transform;
  return { x: tr.translation[0] * W + g.w / 2, y: tr.translation[1] * H + g.h / 2, w: g.w * tr.scale[0], h: g.h * tr.scale[1] };
}

export type TraceLook = 'hidden' | 'selected' | 'hint' | 'correct' | 'wrong';

export function TraceLayer({ traces, look, onTap, cutout, className }: {
  traces: Trace[];
  look: (i: number) => TraceLook;
  onTap?: (i: number) => void;
  /** מסכה כהה עם חורים (רמז) */
  cutout?: number[];
  className?: string;
}) {
  const geoms = traces.map(traceGeom);
  return (
    <svg className={`trace-layer ${className ?? ''}`} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {cutout && cutout.length > 0 && (
        <>
          <defs>
            <mask id="cut">
              <rect width={W} height={H} fill="white" />
              {cutout.map((i) => <g key={i} transform={geoms[i].transform} fill="black">{geoms[i].el}</g>)}
            </mask>
          </defs>
          <rect width={W} height={H} fill="black" fillOpacity={0.5} mask="url(#cut)" style={{ pointerEvents: 'none' }} />
        </>
      )}
      {geoms.map((g, i) => (
        <g
          key={i}
          transform={g.transform}
          className={`trace trace-${cutout?.includes(i) ? 'hint' : look(i)}`}
          onPointerDown={onTap ? (e) => { e.stopPropagation(); onTap(i); } : undefined}
          style={{ cursor: onTap ? 'pointer' : undefined, pointerEvents: onTap ? 'all' : 'none' }}
        >
          {g.el}
        </g>
      ))}
    </svg>
  );
}

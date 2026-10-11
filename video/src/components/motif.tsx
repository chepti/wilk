/*
 * המוטיב: הקו המוזהב. כוכב זהב (ה"עט" של שקף הכתיבה) מצייר אות במשיכה אחת, והמשיכה הזו
 * הופכת לשפת הסרטון — כותבת כותרות, מנקה את המסך, נהיית שביל המסע, וכותבת את שם המרחב בסוף.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { getLength } from '@remotion/paths';
import { C, bigShadow } from '../theme';
import { clamp, rnd, pop } from '../anim';
import { Ribbon, pathPoint } from './graphics';

/** כוכב חמש-קצוות מעוגל, שכבתי: הילה, גוף זהב, קו מתאר, ברק */
export const GoldStar: React.FC<{ size: number; glow?: number; rot?: number; dim?: boolean }> = ({ size, glow = 1, rot = 0, dim = false }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 0.46 : 1;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(' L') + ' Z';
  return (
    <svg width={size} height={size} viewBox="-1.5 -1.5 3 3" style={{ overflow: 'visible', transform: `rotate(${rot}deg)` }}>
      <defs>
        <radialGradient id="sg" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#fff6c9" />
          <stop offset="0.45" stopColor={C.accent2} />
          <stop offset="1" stopColor={C.accent} />
        </radialGradient>
        <radialGradient id="sh" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.accent2} stopOpacity="0.85" />
          <stop offset="1" stopColor={C.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow > 0 && <circle r={1.45} fill="url(#sh)" opacity={0.55 * glow} />}
      <path d={d} fill={dim ? '#5a6488' : 'url(#sg)'} stroke={dim ? '#3a4366' : '#c98a06'} strokeWidth={0.09} strokeLinejoin="round" />
      {!dim && <path d="M-0.18 -0.55 Q-0.05 -0.75 0.08 -0.6" stroke="#fff" strokeWidth={0.1} strokeLinecap="round" fill="none" opacity={0.85} />}
    </svg>
  );
};

/** הקו המוזהב: סרט זהב לאורך מסלול, עם כוכב שמוביל אותו */
export const GoldPen: React.FC<{
  d: string;
  head: number;
  tail?: number;
  width?: number;
  star?: number;
  id: string;
  profile?: 'crescent' | 'even' | 'taper';
}> = ({ d, head, tail = 0, width = 30, star = 70, id, profile = 'even' }) => {
  const f = useCurrentFrame();
  const h = Math.max(0, Math.min(1, head));
  const p = pathPoint(d, h);
  const showStar = h > 0.001 && h < 0.999 && star > 0;
  return (
    <g>
      <Ribbon d={d} head={h} tail={tail} width={width} from={C.accent2} to={C.accent} highlight="#fff8dc" profile={profile} id={id} />
      {showStar && (
        <foreignObject x={p.x - star} y={p.y - star} width={star * 2} height={star * 2} style={{ overflow: 'visible' }}>
          <div style={{ width: star * 2, height: star * 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GoldStar size={star} rot={f * 4} />
          </div>
        </foreignObject>
      )}
    </g>
  );
};

/** שמי לילה: גרדיאנט + כוכבים מנצנצים (דטרמיניסטי) */
export const NightSky: React.FC<{ seed?: number; count?: number; light?: number }> = ({ seed = 1, count = 110, light = 0 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: rnd(seed * 100 + i) * W, y: rnd(seed * 200 + i * 3) * H, r: 0.8 + rnd(seed * 300 + i) * 2.4, ph: rnd(i + seed) * 6.28,
  })), [W, H, count, seed]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1400px 800px at 70% -10%, rgba(91,118,240,${0.45 + light}), transparent 60%), linear-gradient(180deg, ${C.ink} 0%, ${C.night2} 100%)` }}>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.35 + 0.55 * (0.5 + 0.5 * Math.sin(f * 0.08 + s.ph))} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** טאבלט: מסך לוגי 1280×800 (כמו צילומי המסך), מסגרת כהה. ילדים ממוקמים בקואורדינטות המסך */
export const TAB_W = 1280;
export const TAB_H = 800;
export const Tablet: React.FC<{ children: React.ReactNode; scale?: number; style?: React.CSSProperties; screenStyle?: React.CSSProperties }> = ({
  children, scale = 1, style, screenStyle,
}) => (
  <div
    style={{
      width: TAB_W + 56, height: TAB_H + 56, borderRadius: 54, padding: 28, boxSizing: 'border-box',
      background: 'linear-gradient(145deg,#2c3346,#0c0f18 45%,#1d2233)',
      boxShadow: `${bigShadow}, inset 0 0 0 2px rgba(255,255,255,0.09)`,
      transform: `scale(${scale})`, transformOrigin: '50% 50%', position: 'relative', ...style,
    }}
  >
    <div style={{ width: TAB_W, height: TAB_H, borderRadius: 24, overflow: 'hidden', position: 'relative', background: C.ink, ...screenStyle }}>
      {children}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 30%)', pointerEvents: 'none', zIndex: 80 }} />
    </div>
    <div style={{ position: 'absolute', top: '50%', left: 11, width: 7, height: 7, marginTop: -3, borderRadius: 9, background: '#3a4256' }} />
  </div>
);

/** צילום מסך מהאפליקציה (רוחב 1280 לוגי), עם גלילה אופציונלית (y בפיקסלים לוגיים) */
export const Shot: React.FC<{ src: string; y?: number; h?: number; style?: React.CSSProperties }> = ({ src, y = 0, h, style }) => (
  <Img src={staticFile(`shots/${src}`)} style={{ position: 'absolute', left: 0, top: -y, width: TAB_W, height: h, ...style }} />
);

/** אצבע/לחיצה: עיגול שנלחץ + גל שמתרחב */
export const Tap: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const f = useCurrentFrame();
  if (f < at - 8 || f > at + 26) return null;
  const inT = interpolate(f, [at - 8, at], [0, 1], clamp);
  const ring = interpolate(f, [at, at + 22], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: x, top: y, zIndex: 70, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -60 * ring, top: -60 * ring, width: 120 * ring, height: 120 * ring, borderRadius: 999, border: `5px solid ${C.accent}`, opacity: 1 - ring }} />
      <div style={{ position: 'absolute', left: -22, top: -22, width: 44, height: 44, borderRadius: 999, background: 'rgba(255,255,255,0.85)', border: `4px solid ${C.accent}`, transform: `scale(${(1.25 - 0.25 * inT) * (f > at + 8 ? interpolate(f, [at + 8, at + 26], [1, 0], clamp) : 1)})`, opacity: inT, boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }} />
    </div>
  );
};

/** ניצוצות כוכבים קטנים שפורצים מנקודה (רגעי הצלחה) */
export const StarBurst: React.FC<{ x: number; y: number; at: number; n?: number; dist?: number; size?: number }> = ({ x, y, at, n = 9, dist = 180, size = 34 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at || f > at + 40) return null;
  const t = interpolate(f, [at, at + 36], [0, 1], { ...clamp, easing: (v) => 1 - Math.pow(1 - v, 3) });
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (Math.PI * 2 * i) / n + rnd(i + at) * 0.6;
        const dd = dist * (0.6 + rnd(i * 7 + at) * 0.6) * t;
        const s = pop(f, fps, at, 10, 200, 0.5) * (1 - interpolate(f, [at + 24, at + 40], [0, 1], clamp));
        return (
          <div key={i} style={{ position: 'absolute', left: x + Math.cos(a) * dd, top: y + Math.sin(a) * dd, transform: `translate(-50%,-50%) scale(${s})`, zIndex: 75 }}>
            <GoldStar size={size * (0.6 + rnd(i) * 0.6)} glow={0.6} rot={f * 6 + i * 30} />
          </div>
        );
      })}
    </>
  );
};

export const lengthOf = (d: string) => getLength(d);

/*
 * Generic motion-graphics primitives. None of these IS the motif — the motif is
 * designed per project from its own brand (see references/craft.md §1). These are
 * building blocks you can shape into it: a ribbon along any path, a self-drawing
 * stroke or frame, a pop-in shape, decorative blobs, a band wipe, grain, vignette.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { getLength, getPointAtLength, getTangentAtLength } from '@remotion/paths';
import { C } from '../theme';
import { clamp, pop, easeInOut, useLayout } from '../anim';

/* Point + heading on an SVG path at u ∈ 0..1 — for riding objects along a path */
export const pathPoint = (d: string, u: number) => {
  const len = getLength(d);
  const L = Math.max(0, Math.min(1, u)) * len;
  const p = getPointAtLength(d, L);
  const tg = getTangentAtLength(d, L);
  return { x: p.x, y: p.y, angle: (Math.atan2(tg.y, tg.x) * 180) / Math.PI };
};

/*
 * Ribbon — a filled band along any path with a variable width profile.
 * head/tail ∈ 0..1 animate drawing and erasing. Profile 'crescent' = thin→fat→round,
 * 'even' = constant, 'taper' = fat→thin. Use it for swooshes, underlines, timelines,
 * brush strokes, ink lines — whatever the brand's gesture is.
 */
export const Ribbon: React.FC<{
  d: string;
  head: number;
  tail?: number;
  width?: number;
  from?: string;
  to?: string;
  highlight?: string | null;
  profile?: 'crescent' | 'even' | 'taper';
  id: string;
}> = ({ d, head, tail = 0, width = 40, from = C.accent2, to = C.accent, highlight = '#ffffff', profile = 'crescent', id }) => {
  const len = useMemo(() => getLength(d), [d]);
  const h = Math.max(0, Math.min(1, head));
  const t = Math.max(0, Math.min(h, tail));
  if (h - t < 0.002) return null;
  const N = 90;
  const L1: string[] = [];
  const R1: string[] = [];
  const L2: string[] = [];
  const R2: string[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const L = (t + (h - t) * u) * len;
    const p = getPointAtLength(d, L);
    const tg = getTangentAtLength(d, L);
    const nx = -tg.y;
    const ny = tg.x;
    const prof =
      profile === 'even' ? 1 : profile === 'taper' ? Math.max(0.05, 1 - u * 0.95) : Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.78 + 0.02)), 0.9);
    const w = (width / 2) * Math.max(0.04, prof);
    L1.push(`${p.x + nx * w},${p.y + ny * w}`);
    R1.unshift(`${p.x - nx * w},${p.y - ny * w}`);
    L2.push(`${p.x + nx * w * 0.28},${p.y + ny * w * 0.28}`);
    R2.unshift(`${p.x - nx * w * 0.28},${p.y - ny * w * 0.28}`);
  }
  const p0 = getPointAtLength(d, t * len);
  const p1 = getPointAtLength(d, h * len);
  return (
    <g>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}>
          <stop offset="0" stopColor={from} stopOpacity="0.2" />
          <stop offset="0.45" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <polygon points={[...L1, ...R1].join(' ')} fill={`url(#${id})`} />
      {highlight && <polygon points={[...L2, ...R2].join(' ')} fill={highlight} opacity={0.35} />}
    </g>
  );
};

/* Self-drawing stroke (connector lines, outlines, signatures) */
export const DrawLine: React.FC<{ d: string; progress: number; color?: string; width?: number }> = ({ d, progress, color = C.accent, width = 6 }) => (
  <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${Math.max(0, progress)} 2`} opacity={progress <= 0 ? 0 : 1} />
);

/*
 * Self-drawing rectangular frame with an optional gap (top-right by default) —
 * useful when the brand has a box/frame something can "break out of".
 */
export const DrawFrame: React.FC<{ w: number; h: number; progress: number; stroke?: number; color?: string; gap?: number }> = ({
  w,
  h,
  progress,
  stroke = 14,
  color = C.primary,
  gap = 0,
}) => {
  const d = gap > 0 ? `M ${w} ${h * gap * 2.4} L ${w} ${h} L 0 ${h} L 0 0 L ${w * (1 - gap * 2.2)} 0` : `M ${w} 0 L ${w} ${h} L 0 ${h} L 0 0 Z`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', position: 'absolute', left: 0, top: 0 }}>
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square" strokeDasharray={`${progress} 2`} />
    </svg>
  );
};

/*
 * Pop — spring a shape in, hold, shrink out, with a little spin.
 * Pass any SVG/element as children (a brand glyph, a star, a dot, an icon).
 */
export const Pop: React.FC<{ x: number; y: number; at: number; life?: number; spin?: number; children: React.ReactNode }> = ({
  x,
  y,
  at,
  life = 40,
  spin = 60,
  children,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at || f > at + life + 12) return null;
  const s = pop(f, fps, at, 9, 220, 0.5) * interpolate(f, [at + life, at + life + 12], [1, 0], clamp);
  const r = interpolate(f, [at, at + life + 12], [-spin / 2, spin / 2], clamp);
  return <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${s}) rotate(${r}deg)` }}>{children}</div>;
};

/* A 4-point sparkle glyph — only an example shape; prefer a glyph from the brand. */
export const Spark: React.FC<{ size: number; color?: string }> = ({ size, color = C.accent }) => (
  <svg width={size} height={size} viewBox="-1.1 -1.1 2.2 2.2" style={{ overflow: 'visible' }}>
    <path d="M0 -1 C0.1 -0.22 0.22 -0.1 1 0 C0.22 0.1 0.1 0.22 0 1 C-0.1 0.22 -0.22 0.1 -1 0 C-0.22 -0.1 -0.1 -0.22 0 -1 Z" fill={color} />
  </svg>
);

/* Organic blob; coordinates are authored on a 1920×1080 grid and scale to any canvas. */
const BLOBS = [
  'M60,-58C77,-40,88,-20,87,-1C86,19,73,38,56,55C38,72,19,86,-3,89C-25,92,-50,83,-65,66C-80,49,-85,24,-83,1C-81,-21,-72,-43,-56,-61C-40,-78,-20,-92,1,-93C21,-93,43,-77,60,-58Z',
  'M49,-51C62,-36,70,-18,72,2C74,22,70,44,56,58C43,72,21,79,-1,80C-23,81,-46,76,-60,62C-74,47,-80,24,-78,2C-76,-20,-66,-41,-51,-56C-37,-71,-18,-81,0,-81C18,-81,36,-66,49,-51Z',
];
export const Blob: React.FC<{ x: number; y: number; size: number; color: string; shape?: number; rot?: number; scale?: number; opacity?: number }> = ({
  x: x0,
  y: y0,
  size,
  color,
  shape = 0,
  rot = 0,
  scale = 1,
  opacity = 1,
}) => {
  const { W, H } = useLayout();
  const x = (x0 / 1920) * W;
  const y = (y0 / 1080) * H;
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, transform: `rotate(${rot}deg) scale(${scale})`, opacity, overflow: 'visible' }}>
      <path d={BLOBS[shape % BLOBS.length]} fill={color} />
    </svg>
  );
};

/* Animated film grain */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seed = Math.floor(f / 2) % 12;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity }}>
      <svg width={width} height={height}>
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={width} height={height} filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.22 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(8,14,36,${strength}) 100%)` }} />
);

/*
 * BandWipe — a curved band sweeping right→left (RTL) that fully covers the screen at
 * `at` (put the cut there). Edge strokes are optional; color them from the motif.
 */
export const BandWipe: React.FC<{ at: number; color?: string; dur?: number; edges?: string[] }> = ({ at, color = C.primary, dur = 22, edges = [C.accent2, C.accent] }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const s = at - dur / 2;
  if (f < s || f > s + dur) return null;
  const t = interpolate(f, [s, s + dur], [0, 1], { ...clamp, easing: easeInOut });
  const bw = W + 580;
  const bulge = 380;
  const x = interpolate(t, [0, 1], [W + 380, -bw - 200]);
  const m = H / 2;
  const b = H + 100;
  const band = `M ${x} -100 Q ${x - bulge} ${m} ${x} ${b} L ${x + bw} ${b} Q ${x + bw - bulge} ${m} ${x + bw} -100 Z`;
  const edge = (o: number) => `M ${x - o} -100 Q ${x - bulge - o} ${m} ${x - o} ${b}`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H}>
        {edges.map((c, i) => (
          <path key={i} d={edge(90 - i * 50)} fill="none" stroke={c} strokeWidth={i === edges.length - 1 ? 46 : 14} strokeLinecap="round" />
        ))}
        <path d={band} fill={color} />
      </svg>
    </AbsoluteFill>
  );
};

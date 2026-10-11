import React from 'react';
import { Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { C, bigShadow } from '../theme';
import { clamp } from '../anim';

/** Photo with Ken-Burns drift, optional white print border */
export const Photo: React.FC<{
  src: string;
  w: number;
  h: number;
  from?: number;
  dur?: number;
  zoom?: [number, number];
  pan?: [number, number, number, number]; // x0,y0,x1,y1 in %
  border?: number;
  radius?: number;
  style?: React.CSSProperties;
  filter?: string;
  shadow?: boolean;
}> = ({ src, w, h, from = 0, dur = 180, zoom = [1.05, 1.16], pan = [0, 0, -2, -1], border = 0, radius = 0, style, filter, shadow = true }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [from, from + dur], [0, 1], clamp);
  const z = zoom[0] + (zoom[1] - zoom[0]) * t;
  const px = pan[0] + (pan[2] - pan[0]) * t;
  const py = pan[1] + (pan[3] - pan[1]) * t;
  return (
    <div
      style={{
        width: w,
        height: h,
        padding: border,
        background: border ? '#fff' : undefined,
        borderRadius: radius,
        boxShadow: shadow ? bigShadow : undefined,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: Math.max(0, radius - border / 2), position: 'relative' }}>
        <Img
          src={staticFile(`images/${src}`)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${z}) translate(${px}%, ${py}%)`,
            filter: filter ?? 'contrast(1.04) saturate(1.06)',
          }}
        />
      </div>
    </div>
  );
};

/** iPhone-ish device. Children render in a 390x844 logical screen. */
export const Phone: React.FC<{ children: React.ReactNode; scale?: number; style?: React.CSSProperties; glare?: boolean }> = ({
  children,
  scale = 1,
  style,
  glare = true,
}) => (
  <div
    style={{
      width: 414,
      height: 868,
      borderRadius: 68,
      background: 'linear-gradient(145deg,#2a2f3d,#0b0d14 40%,#1c2030)',
      padding: 12,
      boxSizing: 'border-box',
      boxShadow: `${bigShadow}, inset 0 0 0 2px rgba(255,255,255,0.08)`,
      transform: `scale(${scale})`,
      position: 'relative',
      ...style,
    }}
  >
    <div style={{ width: 390, height: 844, borderRadius: 56, overflow: 'hidden', position: 'relative', background: C.bg }}>
      {children}
      {/* dynamic island */}
      <div style={{ position: 'absolute', top: 12, left: '50%', marginLeft: -62, width: 124, height: 36, borderRadius: 20, background: '#07080c', zIndex: 50 }} />
      {glare && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 32%)',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        />
      )}
    </div>
  </div>
);

/** Journal page image with paper feel */
export const Page: React.FC<{ src: string; w: number; style?: React.CSSProperties }> = ({ src, w, style }) => (
  <div
    style={{
      width: w,
      height: w * 1.4,
      background: '#fff',
      borderRadius: 6,
      boxShadow: '0 30px 60px -20px rgba(40,30,20,0.35), 0 10px 20px -10px rgba(40,30,20,0.25)',
      overflow: 'hidden',
      ...style,
    }}
  >
    <Img src={staticFile(`images/${src}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>
);

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { C, display } from '../theme';
import { clamp, easeIn } from '../anim';

/**
 * Kinetic Hebrew headline. Words rise from a mask one by one.
 * Wrap a word in *asterisks* to highlight it (accent color).
 * Use \n for line breaks.
 */
export const Kinetic: React.FC<{
  text: string;
  at?: number;
  out?: number;
  size?: number;
  color?: string;
  hi?: string;
  weight?: number;
  font?: string;
  stagger?: number;
  align?: 'right' | 'center' | 'left';
  lineHeight?: number;
  style?: React.CSSProperties;
  mode?: 'rise' | 'pop' | 'slide';
}> = ({
  text,
  at = 0,
  out,
  size = 96,
  color = C.ink,
  hi = C.accent,
  weight = 800,
  font = display,
  stagger = 3,
  align = 'right',
  lineHeight = 1.08,
  style,
  mode = 'rise',
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split('\n');
  let wi = 0;
  let hiOn = false;
  // split a word on '*' toggles → [{t, hi}]
  const segs = (raw: string) =>
    raw.split('*').map((t, k) => {
      if (k > 0) hiOn = !hiOn;
      return { t, hi: hiOn };
    }).filter((s) => s.t.length > 0);
  return (
    <div
      style={{
        direction: 'rtl',
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        color,
        textAlign: align,
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {line.split(' ').map((raw, i) => {
            const idx = wi++;
            const parts = segs(raw);
            const s = spring({ frame: f - at - idx * stagger, fps, config: { damping: 15, stiffness: 160, mass: 0.7 } });
            const o = out !== undefined ? interpolate(f, [out + idx * 1.5, out + 10 + idx * 1.5], [0, 1], { ...clamp, easing: easeIn }) : 0;
            let transform = '';
            let opacity = 1;
            if (mode === 'rise') transform = `translateY(${(1 - s) * 110 - o * 110}%)`;
            if (mode === 'pop') {
              transform = `scale(${s * (1 - o)}) rotate(${(1 - s) * -8}deg)`;
            }
            if (mode === 'slide') {
              transform = `translateX(${(1 - s) * -60}px)`;
              opacity = s * (1 - o);
            }
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  overflow: mode === 'rise' ? 'hidden' : 'visible',
                  paddingBottom: '0.12em',
                  marginBottom: '-0.12em',
                  verticalAlign: 'top',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    transform,
                    opacity,
                    transformOrigin: '50% 80%',
                  }}
                >
                  {parts.map((p, k) => (
                    <span key={k} style={{ color: p.hi ? hi : undefined }}>
                      {p.t}
                    </span>
                  ))}
                </span>
                {' '}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Typewriter reveal (for UI typing). Returns substring by frame. */
export const typed = (text: string, f: number, at: number, cps = 22, fps = 30) => {
  const n = Math.max(0, Math.floor(((f - at) / fps) * cps));
  return text.slice(0, n);
};

export const Caret: React.FC<{ color?: string; h?: number }> = ({ color = C.accent, h = 22 }) => {
  const f = useCurrentFrame();
  return (
    <span
      style={{
        display: 'inline-block',
        width: 2.5,
        height: h,
        background: color,
        marginInline: 2,
        verticalAlign: 'middle',
        opacity: Math.floor(f / 8) % 2 ? 0.15 : 1,
      }}
    />
  );
};

/** Small pill label */
export const Tag: React.FC<{ children: React.ReactNode; color?: string; bg?: string; style?: React.CSSProperties }> = ({
  children,
  color = '#fff',
  bg = C.accent,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      direction: 'rtl',
      fontFamily: display,
      fontWeight: 700,
      fontSize: 28,
      color,
      background: bg,
      borderRadius: 999,
      padding: '10px 26px',
      ...style,
    }}
  >
    {children}
  </div>
);

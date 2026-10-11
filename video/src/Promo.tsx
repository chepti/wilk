import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, Freeze, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { S, TOTAL, MUSIC_OFFSET, FPS } from './timeline';
import { C } from './theme';
import { clamp, easeInOut, useLayout } from './anim';
import { Grain, Vignette, BandWipe } from './components/graphics';
import { Open, Chaos, Method, Reveal } from './scenes/Story';
import { MapScene, TapScene, GamesScene, TraceScene, RewardsScene, TeacherScene, ParentsScene } from './scenes/Demo';
import { Outro } from './scenes/End';

/*
 * רשימת העריכה. כל סצנה [from, to). reveal = הסצנה הבאה נפתחת מעל הקודמת:
 *   circle — מתרחבת מנקודה (למשל הווי שנלחץ); frame — איריס מלבני עם שוליים צבעוניים.
 * בין סצנות ההדגמה הטאבלט נשאר באותו מקום (חיתוך רציף) — רק המסך מתחלף.
 */
type Reveal =
  | { kind: 'circle'; x: [number, number]; y: [number, number]; pre: number; post: number; edge?: string }
  | { kind: 'frame'; pre: number; post: number; color: string };

type SceneDef = { Comp: React.FC<{ dur: number }>; from: number; to: number; reveal?: Reveal };

const SCENES: SceneDef[] = [
  { Comp: Open, from: S.open, to: S.chaos },
  { Comp: Chaos, from: S.chaos, to: S.method },
  { Comp: Method, from: S.method, to: S.reveal },
  { Comp: Reveal, from: S.reveal, to: S.map, reveal: { kind: 'frame', pre: 12, post: 6, color: C.accent } },
  { Comp: MapScene, from: S.map, to: S.tap },
  { Comp: TapScene, from: S.tap, to: S.games },
  { Comp: GamesScene, from: S.games, to: S.trace },
  { Comp: TraceScene, from: S.trace, to: S.rewards },
  { Comp: RewardsScene, from: S.rewards, to: S.teacher, reveal: { kind: 'circle', x: [395, 540], y: [430, 1180], pre: 12, post: 4, edge: C.accent } },
  { Comp: TeacherScene, from: S.teacher, to: S.parents },
  { Comp: ParentsScene, from: S.parents, to: S.outro },
  { Comp: Outro, from: S.outro, to: TOTAL, reveal: { kind: 'circle', x: [1500, 540], y: [800, 1700], pre: 14, post: 4, edge: C.accent } },
];

// פסי מעבר (בכיוון RTL) על עליות האנרגיה
const WIPES: { at: number; color: string }[] = [
  { at: S.trace, color: C.primary },
  { at: S.teacher, color: C.ink },
];

const MUSIC = 'music/driving-ambition.mp3';

const revealT = (g: number, from: number, r: Reveal) => interpolate(g, [from - r.pre, from + r.post], [0, 1], { ...clamp, easing: easeInOut });

const clipFor = (g: number, from: number, r: Reveal | undefined, V: boolean): string | undefined => {
  if (!r) return undefined;
  const t = revealT(g, from, r);
  if (t >= 1) return undefined;
  if (r.kind === 'circle') return `circle(${t * 2300}px at ${r.x[V ? 1 : 0]}px ${r.y[V ? 1 : 0]}px)`;
  const i = (1 - t) * 50;
  return `inset(${i}% ${i}% ${i}% ${i}%)`;
};

const SceneBlock: React.FC<SceneDef> = ({ Comp, from, to, reveal }) => {
  const g = useCurrentFrame();
  const { V } = useLayout();
  const clip = clipFor(g, from, reveal, V);
  const dur = to - from;
  return (
    <>
      {reveal && (
        <Sequence from={from - reveal.pre} durationInFrames={reveal.pre} layout="none">
          <AbsoluteFill style={{ clipPath: clip }}>
            <Freeze frame={0}>
              <Comp dur={dur} />
            </Freeze>
          </AbsoluteFill>
        </Sequence>
      )}
      <Sequence from={from} durationInFrames={dur} layout="none">
        <AbsoluteFill style={{ clipPath: clip }}>
          <Comp dur={dur} />
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

const RevealEdge: React.FC<{ from: number; r: Reveal }> = ({ from, r }) => {
  const g = useCurrentFrame();
  const { V, W, H } = useLayout();
  const t = revealT(g, from, r);
  if (t <= 0 || t >= 1) return null;
  if (r.kind === 'frame') {
    const w = W * t;
    const h = H * t;
    return <div style={{ position: 'absolute', left: W / 2 - w / 2 - 10, top: H / 2 - h / 2 - 10, width: w + 20, height: h + 20, border: `18px solid ${r.color}`, boxSizing: 'border-box' }} />;
  }
  const rad = t * 2300;
  const cx = r.x[V ? 1 : 0];
  const cy = r.y[V ? 1 : 0];
  return (
    <div style={{ position: 'absolute', left: cx - rad - 12, top: cy - rad - 12, width: (rad + 12) * 2, height: (rad + 12) * 2, borderRadius: 9999, border: `14px solid ${r.edge ?? C.accent}`, boxSizing: 'border-box' }} />
  );
};

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    {MUSIC && (
      <Html5Audio
        src={staticFile(MUSIC)}
        trimBefore={Math.round(MUSIC_OFFSET * FPS)}
        volume={(f) => interpolate(f, [0, 8, TOTAL - 105, TOTAL - 4], [0, 0.9, 0.9, 0], clamp)}
      />
    )}
    {SCENES.map((s, i) => (
      <SceneBlock key={i} {...s} />
    ))}
    {SCENES.map((s, i) => (s.reveal ? <RevealEdge key={`e${i}`} from={s.from} r={s.reveal} /> : null))}
    {WIPES.map((w, i) => (
      <BandWipe key={i} at={w.at} color={w.color} edges={[C.accent2, C.accent]} />
    ))}
    <Vignette />
    <Grain />
  </AbsoluteFill>
);

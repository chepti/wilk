import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C, display, eng } from '../theme';
import { lerp, easeInOut, easeIn, pop, soft, rnd, clamp, drift, useLayout } from '../anim';
import { Kinetic, Tag } from '../components/type';
import { GoldPen, GoldStar, NightSky, Tablet, Shot, StarBurst } from '../components/motif';
import { DrawFrame } from '../components/graphics';

/** מיקום הטאבלט — משותף לכל סצנות ההדגמה, כדי שהחיתוכים ירגישו רציפים */
export type TabPos = { x: number; y: number; scale: number };
/** לרוחב: משמאל, הכותרת מימין. לאורך: בחצי התחתון, הכותרת למעלה */
export const useTab = (): TabPos => useLayout().pick({ x: 610, y: 560, scale: 0.72 }, { x: 540, y: 1180, scale: 0.76 });
export const TabletAt: React.FC<{ children: React.ReactNode; dy?: number; s?: number; rot?: number }> = ({ children, dy = 0, s = 1, rot = 0 }) => {
  const TAB = useTab();
  return (
    <div style={{ position: 'absolute', left: TAB.x - 668, top: TAB.y - 428 + dy, transform: `scale(${s}) rotate(${rot}deg)`, transformOrigin: '50% 50%' }}>
      <Tablet scale={TAB.scale}>{children}</Tablet>
    </div>
  );
};

/* ── 1. פתיחה: הכוכב כותב C c במשיכה אחת ── */
const C_BIG = 'M 1016 382 A 210 210 0 1 0 1016 700';
const C_SMALL = 'M 1302 552 A 112 112 0 1 0 1302 708';
export const Open: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { W, H, pick } = useLayout();
  const out = lerp(f, [dur - 16, dur], [1, 0], easeIn);
  // לאורך: מזיזים את הזוג C c למרכז הפריים (הנתיבים כתובים בקואורדינטות הרוחב)
  const [dx, dy] = pick([0, 0], [-435, 300]);
  return (
    <AbsoluteFill>
      <NightSky seed={3} />
      <svg width={W} height={H} style={{ position: 'absolute', opacity: out }}>
        <g transform={`translate(${dx} ${dy})`}>
          <GoldPen d={C_BIG} head={lerp(f, [6, 44], [0, 1], easeInOut)} width={38} star={64} id="ob" />
          <GoldPen d={C_SMALL} head={lerp(f, [44, 70], [0, 1], easeInOut)} width={30} star={52} id="os" />
        </g>
      </svg>
      <StarBurst x={1016 + dx} y={700 + dy} at={44} n={7} dist={120} size={26} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: pick(800, 1140), display: 'flex', justifyContent: 'center' }}>
        <Kinetic text="כל אות — *סיפור*." at={66} out={dur - 14} size={pick(104, 96)} color="#fff" weight={900} align="center" />
      </div>
    </AbsoluteFill>
  );
};

/* ── 2. בלגן: אותיות מסתובבות, צלילים מבלבלים, המסך רועד — ואז הקו המוזהב מנקה הכול ── */
const ABC = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz'.split('');
const SOUNDS = ['אֵי?', 'אָה?', 'סִי?', 'קֵה?', 'בִּי?', 'אַ?', 'אֵייץ׳?', 'צֶ?'];
export const Chaos: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const SLASH = dur - 44;
  const blow = lerp(f, [SLASH + 6, SLASH + 26], [0, 1], easeIn);
  const shake = f < SLASH ? interpolate(f, [60, SLASH], [0, 14], clamp) : 0;
  const sx = drift(f, shake, 0.9, 1);
  const sy = drift(f, shake, 1.1, 4);
  const { W, H, V, pick } = useLayout();
  const slashD = pick('M 2050 -60 C 1500 300, 600 600, -120 1180', 'M 1200 -60 C 900 560, 340 1240, -120 2000');
  return (
    <AbsoluteFill>
      <NightSky seed={5} light={-0.15} />
      <AbsoluteFill style={{ transform: `translate(${sx}px,${sy}px)` }}>
        {ABC.map((ch, i) => {
          const at = Math.floor(i * 2.6);
          if (f < at) return null;
          const s = pop(f, fps, at, 11, 160, 0.6);
          const x0 = 100 + rnd(i * 3.1) * (W - 200);
          const y0 = 120 + rnd(i * 5.7) * (H - 240);
          const vx = (x0 - W / 2) * 0.004 + (rnd(i) - 0.5) * 2.2;
          const vy = (rnd(i * 9) - 0.5) * 1.6;
          const t = f - at;
          const bx = (x0 - W / 2) * blow * 2.4;
          const by = (y0 - H / 2) * blow * 2.4 - blow * 300;
          const col = i % 5 === 0 ? C.accent : i % 3 === 0 ? C.secondary : '#ffffff';
          return (
            <div key={i} style={{
              position: 'absolute', left: x0 + vx * t + bx, top: y0 + vy * t + by, fontFamily: eng, fontWeight: 700,
              fontSize: 60 + rnd(i * 2) * 110, color: col, opacity: (0.35 + rnd(i * 4) * 0.65) * (1 - blow),
              transform: `translate(-50%,-50%) scale(${s}) rotate(${(rnd(i * 6) - 0.5) * 70 + t * (rnd(i) - 0.5) * 3}deg)`,
            }}>{ch}</div>
          );
        })}
        {SOUNDS.map((snd, i) => {
          const at = 30 + i * 13;
          if (f < at) return null;
          const s = pop(f, fps, at, 9, 220, 0.5) * (1 - blow);
          const x = 160 + rnd(i * 11 + 2) * (W - 320);
          const y = 160 + rnd(i * 13 + 5) * (H - 380);
          return (
            <div key={`s${i}`} style={{
              position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${s}) rotate(${(rnd(i) - 0.5) * 16}deg)`,
              background: '#fff', color: C.text, fontFamily: display, fontWeight: 800, fontSize: 42, padding: '12px 26px', borderRadius: 999,
              boxShadow: '0 10px 24px rgba(0,0,0,0.35)', direction: 'rtl', whiteSpace: 'nowrap',
            }}>{snd}</div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 6 }}>
        <div style={{ background: 'rgba(11,19,48,0.78)', borderRadius: 40, padding: '26px 60px', opacity: 1 - blow, transform: `translate(${sx * 0.4}px,${sy * 0.4}px)` }}>
          <Kinetic text={V ? '*26* אותיות.\n*52* צורות.' : '*26* אותיות. *52* צורות.'} at={14} size={96} color="#fff" weight={900} align="center" />
          <Kinetic text={V ? 'וצלילים\nמבלבלים.' : 'וצלילים מבלבלים.'} at={58} size={82} color={C.secondary} weight={800} align="center" />
        </div>
      </AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        <GoldPen d={slashD} head={lerp(f, [SLASH, SLASH + 12], [0, 1], easeInOut)} tail={lerp(f, [SLASH + 16, SLASH + 34], [0, 1], easeIn)} width={110} star={90} profile="crescent" id="slash" />
      </svg>
    </AbsoluteFill>
  );
};

/* ── 3. השיטה: אות הופכת לדמות + רגע מהסרטון ── */
export const Method: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = soft(f, fps, 4);
  const morph = lerp(f, [70, 92], [0, 1], easeInOut);
  const pSpring = pop(f, fps, 30, 10, 170, 0.6);
  const pink = pop(f, fps, 118, 9, 180, 0.6);
  const { pick } = useLayout();
  // לאורך: כותרת למעלה, כרטיס הסרטון באמצע, המפלצת מתחתיו
  const cardPos = pick({ left: 110, top: 170 }, { left: 160, top: 640 });
  const pPos = pick({ left: 560, top: 470 }, { left: 520, top: 1120 });
  return (
    <AbsoluteFill>
      <NightSky seed={7} light={0.08} />
      {/* כרטיס הסרטון */}
      <div style={{ position: 'absolute', left: cardPos.left, top: cardPos.top, width: 760, height: 428, transform: `translateY(${(1 - card) * 120}px) rotate(${-3 + card * 1}deg)`, opacity: card }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)' }}>
          <Img src={staticFile('images/c-video.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + f * 0.0006})` }} />
        </div>
        <div style={{ position: 'absolute', left: -14, top: -14, width: 788, height: 456 }}>
          <DrawFrame w={788} h={456} progress={lerp(f, [10, 50], [0, 1], easeInOut)} stroke={8} color={C.accent} />
        </div>
      </div>
      {/* P → מפלצת P */}
      <div style={{ position: 'absolute', left: pPos.left, top: pPos.top, width: 440, height: 440 }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: eng, fontWeight: 700, fontSize: 400, color: C.accent, opacity: (1 - morph) * pSpring, transform: `scale(${pSpring * (1 + morph * 0.2)})`, textShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>P</div>
        <Img src={staticFile('images/monster-p.webp')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: morph, transform: `scale(${0.7 + morph * 0.3}) rotate(${(1 - morph) * 10}deg)` }} />
      </div>
      <StarBurst x={pPos.left + 220} y={pPos.top + 220} at={86} n={10} dist={230} size={34} />
      <Img src={staticFile('images/monster-b.webp')} style={{ position: 'absolute', left: 60, bottom: -40, width: 300, transform: `translateY(${(1 - pink) * 300}px) rotate(${drift(f, 4, 0.08)}deg)` }} />
      {/* כותרת */}
      <div style={{ position: 'absolute', right: pick(110, 70), top: pick(250, 150), width: pick(820, 940) }}>
        <Kinetic text={'בשיטה של\n*פנינה וילק*'} at={8} out={dur - 14} size={100} color="#fff" weight={900} />
        <div style={{ height: pick(34, 20) }} />
        <Kinetic text={'כל צורה של אות\nהופכת ל*סיפור*.'} at={96} out={dur - 12} size={76} color={C.secondary} weight={800} />
      </div>
    </AbsoluteFill>
  );
};

/* ── 4. חשיפה: הטאבלט עולה, הכוכב פורץ מהמסך, שם המרחב ── */
export const Reveal: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = soft(f, fps, 0);
  const starOut = soft(f, fps, 30);
  const { pick } = useLayout();
  const TAB = useTab();
  const starTo = pick({ x: 1440, y: 230 }, { x: 540, y: 250 });
  return (
    <AbsoluteFill>
      <NightSky seed={9} light={0.15} />
      <TabletAt dy={(1 - rise) * 900} rot={(1 - rise) * 6}>
        <Shot src="map-full.png" y={2655 - 800 - 40} />
      </TabletAt>
      {/* הכוכב יוצא מהמסך ומתמקם למעלה */}
      {f > 26 && (
        <div style={{ position: 'absolute', left: interpolate(starOut, [0, 1], [TAB.x, starTo.x]), top: interpolate(starOut, [0, 1], [TAB.y - 180, starTo.y]), transform: `translate(-50%,-50%) scale(${interpolate(starOut, [0, 1], [0.3, 1])})` }}>
          <GoldStar size={210} rot={f * 2} glow={1.2} />
        </div>
      )}
      <StarBurst x={starTo.x} y={starTo.y} at={52} n={11} dist={260} size={34} />
      <div style={{ position: 'absolute', right: pick(50, 40), top: pick(380, 440), width: pick(690, 1000), direction: 'ltr', textAlign: 'center' }}>
        <div style={{ fontFamily: eng, fontWeight: 700, fontSize: 86, color: '#fff', lineHeight: 1.02, transform: `scale(${pop(f, fps, 40, 11, 150, 0.7)})` }}>
          English through<br />the <span style={{ color: C.accent }}>STARS</span>
        </div>
        <div style={{ height: 30 }} />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Kinetic text="מסע האותיות באנגלית" at={58} out={dur - 10} size={60} color={C.secondary} weight={800} align="center" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** כותרת בצד ימין לסצנות ההדגמה (הטאבלט משמאל) */
export const SideHead: React.FC<{ text: string; sub?: string; at?: number; out: number; dark?: boolean; tag?: string; tagAt?: number }> = ({ text, sub, at = 6, out, dark = true, tag, tagAt = 40 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pick } = useLayout();
  return (
    <div style={{ position: 'absolute', right: pick(64, 70), top: pick(300, 170), width: pick(680, 940) }}>
      <Kinetic text={text} at={at} out={out} size={pick(80, 92)} color={dark ? '#fff' : C.text} hi={C.accent} weight={900} />
      {sub && (<><div style={{ height: 22 }} /><Kinetic text={sub} at={at + 18} out={out} size={pick(50, 56)} color={dark ? C.secondary : C.muted} weight={700} /></>)}
      {tag && (
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'flex-end', transform: `scale(${pop(f, fps, tagAt) * lerp(f, [out, out + 10], [1, 0])})`, transformOrigin: '100% 50%' }}>
          <Tag bg={dark ? 'rgba(255,255,255,0.12)' : C.primary} style={{ fontSize: 30, border: dark ? '2px solid rgba(255,255,255,0.3)' : undefined }}>{tag}</Tag>
        </div>
      )}
    </div>
  );
};

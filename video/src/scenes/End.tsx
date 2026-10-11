import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display, eng, ui } from '../theme';
import { lerp, easeInOut, easeIn, pop, drift } from '../anim';
import { Kinetic, Tag } from '../components/type';
import { GoldPen, GoldStar, NightSky, StarBurst } from '../components/motif';

/* ── 12. סיום: הקו המוזהב כותב קו תחתון לשם המרחב, כתובת, קרדיטים ── */
const SWOOSH = 'M 1560 548 C 1300 618, 760 618, 360 548';
export const Outro: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = lerp(f, [dur - 22, dur], [0, 1], easeIn);
  const mon = pop(f, fps, 70, 9, 160, 0.7);
  return (
    <AbsoluteFill>
      <NightSky seed={21} light={0.2} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center', direction: 'ltr', fontFamily: eng, fontWeight: 700, fontSize: 132, color: '#fff', lineHeight: 1, transform: `scale(${pop(f, fps, 4, 12, 140, 0.7)})` }}>
        English through the <span style={{ color: C.accent }}>STARS</span>
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <GoldPen d={SWOOSH} head={lerp(f, [10, 40], [0, 1], easeInOut)} width={26} star={60} profile="crescent" id="end" />
      </svg>
      <StarBurst x={360} y={548} at={40} n={8} dist={140} size={26} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 664, display: 'flex', justifyContent: 'center' }}>
        <Kinetic text="מסע האותיות באנגלית — בשיטת *פנינה וילק*" at={30} size={58} color={C.secondary} hi={C.accent2} weight={800} align="center" />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'center', transform: `scale(${pop(f, fps, 52)})` }}>
        <Tag bg={C.accent} color={C.ink} style={{ fontSize: 46, padding: '18px 46px', gap: 18 }}>
          <span>פתוח לכולם</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ direction: 'ltr', fontFamily: ui }}>chepti.com/wilk</span>
        </Tag>
      </div>
      {/* מפלצת P מנופפת ליד "מתחילים כאן!" */}
      <div style={{ position: 'absolute', left: 120, bottom: 70, width: 270, transform: `translateY(${(1 - mon) * 340}px) rotate(${drift(f, 5, 0.09)}deg)` }}>
        <Img src={staticFile('images/monster-p.webp')} style={{ width: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: 110, bottom: 470, transform: `scale(${pop(f, fps, 86)}) rotate(-6deg)`, transformOrigin: '0% 100%', fontFamily: display, fontWeight: 900, fontSize: 50, color: '#9be26b', direction: 'rtl' }}>
        מתחילים כאן!
      </div>
      <div style={{ position: 'absolute', right: 120, bottom: 120 }}>
        <GoldStar size={120} rot={f * 1.5} />
      </div>
      <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, textAlign: 'center', fontFamily: ui, fontSize: 24, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: lerp(f, [70, 92], [0, 1]) }}>
        השיטה: פנינה וילק · גרסה דיגיטלית: חפציה בן ארצי · הפקה: חולמים תקשוב · chepti.com
      </div>
      <AbsoluteFill style={{ background: C.ink, opacity: fade }} />
    </AbsoluteFill>
  );
};

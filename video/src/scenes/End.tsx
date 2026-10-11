import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display, eng, ui } from '../theme';
import { lerp, easeInOut, easeIn, pop, drift, useLayout } from '../anim';
import { Kinetic, Tag } from '../components/type';
import { GoldPen, GoldStar, NightSky, StarBurst } from '../components/motif';

/* ── 12. סיום: הקו המוזהב כותב קו תחתון לשם המרחב, כתובת, קרדיטים ── */
export const Outro: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { W, H, V, pick } = useLayout();
  const fade = lerp(f, [dur - 22, dur], [0, 1], easeIn);
  const mon = pop(f, fps, 70, 9, 160, 0.7);
  const swoosh = pick('M 1560 548 C 1300 618, 760 618, 360 548', 'M 950 860 C 780 930, 300 930, 130 860');
  const swEnd = pick({ x: 360, y: 548 }, { x: 130, y: 860 });
  return (
    <AbsoluteFill>
      <NightSky seed={21} light={0.2} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: pick(290, 520), textAlign: 'center', direction: 'ltr', fontFamily: eng, fontWeight: 700, fontSize: pick(132, 128), color: '#fff', lineHeight: 1, transform: `scale(${pop(f, fps, 4, 12, 140, 0.7)})` }}>
        English through{V ? <br /> : ' '}the <span style={{ color: C.accent }}>STARS</span>
      </div>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        <GoldPen d={swoosh} head={lerp(f, [10, 40], [0, 1], easeInOut)} width={26} star={60} profile="crescent" id="end" />
      </svg>
      <StarBurst x={swEnd.x} y={swEnd.y} at={40} n={8} dist={140} size={26} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: pick(664, 990), display: 'flex', justifyContent: 'center' }}>
        <Kinetic text={V ? 'מסע האותיות באנגלית\nבשיטת *פנינה וילק*' : 'מסע האותיות באנגלית — בשיטת *פנינה וילק*'} at={30} size={pick(58, 62)} color={C.secondary} hi={C.accent2} weight={800} align="center" />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: pick(790, 1210), display: 'flex', justifyContent: 'center', transform: `scale(${pop(f, fps, 52)})` }}>
        <Tag bg={C.accent} color={C.ink} style={{ fontSize: pick(46, 44), padding: '18px 46px', gap: 18 }}>
          <span>פתוח לכולם</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ direction: 'ltr', fontFamily: ui }}>chepti.com/wilk</span>
        </Tag>
      </div>
      {/* מפלצת P מנופפת ליד "מתחילים כאן!" */}
      <div style={{ position: 'absolute', left: pick(120, 90), bottom: pick(70, 230), width: pick(270, 330), transform: `translateY(${(1 - mon) * 340}px) rotate(${drift(f, 5, 0.09)}deg)` }}>
        <Img src={staticFile('images/monster-p.webp')} style={{ width: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: pick(110, 420), bottom: pick(470, 470), transform: `scale(${pop(f, fps, 86)}) rotate(-6deg)`, transformOrigin: '0% 100%', fontFamily: display, fontWeight: 900, fontSize: pick(50, 60), color: '#9be26b', direction: 'rtl' }}>
        מתחילים כאן!
      </div>
      <div style={{ position: 'absolute', right: pick(120, 110), bottom: pick(120, 300) }}>
        <GoldStar size={pick(120, 110)} rot={f * 1.5} />
      </div>
      <div style={{ position: 'absolute', bottom: pick(36, 70), left: pick(0, 80), right: pick(0, 80), textAlign: 'center', fontFamily: ui, fontSize: pick(24, 28), lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: lerp(f, [70, 92], [0, 1]) }}>
        השיטה: פנינה וילק · גרסה דיגיטלית: חפציה בן ארצי{V ? <br /> : ' · '}הפקה: חולמים תקשוב · chepti.com
      </div>
      <AbsoluteFill style={{ background: C.ink, opacity: fade }} />
    </AbsoluteFill>
  );
};

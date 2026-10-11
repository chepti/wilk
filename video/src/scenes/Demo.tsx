import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C, display, ui, letters } from '../theme';
import { lerp, easeInOut, easeIn, pop, soft, clamp, drift, useLayout } from '../anim';
import { NightSky, Shot, Tap, StarBurst, GoldStar } from '../components/motif';
import { TabletAt, SideHead, useTab, type TabPos } from './Story';
import meta from '../../public/shots/meta.json';
import strokes from '../data/strokes.json';

/* קואורדינטות מסך הטאבלט (1280×800) → קואורדינטות הסרטון */
const toScreen = (T: TabPos, x: number, y: number) => ({ x: T.x + (x - 640) * T.scale, y: T.y + (y - 400) * T.scale });

/** תג על אזור לחיץ — כמו באפליקציה: רמקול כחול מהבהב → וי ירוק */
const Badge: React.FC<{ x: number; y: number; done: boolean; doneAt: number }> = ({ x, y, done, doneAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = done ? pop(f, fps, doneAt, 9, 220, 0.5) : 1 + 0.1 * Math.sin(f * 0.25);
  return (
    <div style={{ position: 'absolute', left: x - 17, top: y - 17, width: 34, height: 34, borderRadius: 99, background: done ? C.green : C.primary, border: '3px solid #fff', boxShadow: '0 4px 12px rgba(20,30,80,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})`, zIndex: 20 }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={done ? 3.5 : 2.4} strokeLinecap="round" strokeLinejoin="round">
        {done ? <path d="M20 6 9 17l-5-5" /> : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>}
      </svg>
    </div>
  );
};

/** מונה בפינת המסך: "נשמעו 2 מתוך 5" */
const Counter: React.FC<{ label: string; done: number; total: number }> = ({ label, done, total }) => (
  <div style={{ position: 'absolute', left: 64, top: 112, zIndex: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: done >= total ? C.green : 'rgba(255,255,255,0.94)', color: done >= total ? '#fff' : C.text, fontFamily: ui, fontSize: 19, direction: 'rtl', boxShadow: '0 6px 16px rgba(20,30,80,0.18)' }}>
    {label} {done} מתוך {total}
  </div>
);

/* ── 5. מפת המסע ── */
export const MapScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const TAB = useTab();
  const { pick } = useLayout();
  const ts = (x: number, y: number) => toScreen(TAB, x, y);
  const top = meta.mapHeight - 800 - 40;
  const y = interpolate(f, [0, dur - 10], [top, 760], { ...clamp, easing: easeInOut });
  // תחנה 8 (הנוכחית) במפה — אוצר שפורץ החוצה
  return (
    <AbsoluteFill>
      <NightSky seed={9} light={0.15} />
      <TabletAt>
        <Shot src="map-full.png" y={y} />
      </TabletAt>
      {[30, 52, 74].map((at, i) => <StarBurst key={i} x={ts(330 + i * 120, 420 - i * 90).x} y={ts(330 + i * 120, 420 - i * 90).y} at={at} n={6} dist={110} size={22} />)}
      <SideHead text={'מסע הרפתקה\nשל *18* תחנות'} sub={'מתחילים מהאי —\nועולים עד הכוכבים'} out={dur - 12} tag="כל תחנה נפתחת לתיבת אוצר" tagAt={60} />
    </AbsoluteFill>
  );
};

/* ── 6. שומעים את הצליל: לחיצות על M, ירח, קוף, מפה ── */
export const TapScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const TAB = useTab();
  const { pick } = useLayout();
  const ts = (x: number, y: number) => toScreen(TAB, x, y);
  const order = [0, 1, 2, 3, 4]; // M, moon, monkey, map, m
  const taps = order.map((k, i) => ({ k, at: 18 + i * 24 }));
  const heard = taps.filter((t) => f >= t.at + 4).length;
  const tr = meta.mTraces;
  const center = (k: number) => ({ x: tr[k][0] + tr[k][2] / 2, y: tr[k][1] + tr[k][3] / 2 });
  return (
    <AbsoluteFill>
      <NightSky seed={11} light={0.1} />
      <TabletAt>
        <Shot src="slide-m.png" />
        {tr.map((r, k) => {
          const t = taps.find((x) => x.k === k)!;
          return <Badge key={k} x={r[0] + r[2] - 12} y={r[1] + 6} done={f >= t.at + 4} doneAt={t.at + 4} />;
        })}
        <Counter label="נשמעו" done={heard} total={5} />
        {taps.map((t, i) => <Tap key={i} x={center(t.k).x} y={center(t.k).y} at={t.at} />)}
      </TabletAt>
      {/* גלי צליל שיוצאים מהטאבלט אחרי כל לחיצה */}
      {taps.map((t, i) => {
        const c = ts(center(t.k).x, center(t.k).y);
        const p = interpolate(f, [t.at, t.at + 26], [0, 1], clamp);
        if (p <= 0 || p >= 1) return null;
        return [0, 1, 2].map((j) => (
          <div key={`${i}${j}`} style={{ position: 'absolute', left: c.x, top: c.y, width: 0, height: 0 }}>
            <div style={{ position: 'absolute', left: -(60 + j * 40) * p * 2, top: -(60 + j * 40) * p * 2, width: (120 + j * 80) * p * 2, height: (120 + j * 80) * p * 2, borderRadius: 999, border: `4px solid ${C.accent2}`, opacity: (1 - p) * (0.8 - j * 0.2) }} />
          </div>
        ));
      })}
      {heard >= 5 && <StarBurst x={ts(120, 125).x} y={ts(120, 125).y} at={taps[4].at + 6} n={8} dist={120} size={24} />}
      <SideHead text={'לוחצים —\nושומעים את *הצליל*'} sub={'סימונים קטנים מראים\nמה עוד לא נשמע'} out={dur - 12} />
    </AbsoluteFill>
  );
};

/* ── 7. משחקים: גוררים סיר אל המילה pot ── */
export const GamesScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const TAB = useTab();
  const { pick } = useLayout();
  const ts = (x: number, y: number) => toScreen(TAB, x, y);
  const { fps } = useVideoConfig();
  const it = meta.drag[3]; // הסיר העליון
  const tx = 548, ty = 245; // מעל המילה pot.
  const m = lerp(f, [14, 50], [0, 1], easeInOut);
  const x = interpolate(m, [0, 1], [it.x, tx]);
  const y = interpolate(m, [0, 1], [it.y, ty]) - Math.sin(m * Math.PI) * 120;
  const landed = f >= 52;
  const s = landed ? 1 + 0.25 * (1 - pop(f, fps, 52, 8, 260, 0.5)) : 1 + Math.sin(m * Math.PI) * 0.35;
  return (
    <AbsoluteFill>
      <NightSky seed={13} light={0.1} />
      <TabletAt>
        <Shot src="drag-bg.png" />
        <div style={{ position: 'absolute', left: x, top: y, width: it.w, height: it.h, transform: `scale(${s}) rotate(${m < 1 ? Math.sin(m * Math.PI) * -12 : 0}deg)`, backgroundImage: `url(${staticFile('shots/drag-full.png')})`, backgroundSize: '1280px 800px', backgroundPosition: `${-it.x}px ${-it.y}px`, filter: m > 0 && !landed ? 'drop-shadow(0 18px 14px rgba(0,0,0,0.35))' : undefined, zIndex: 10 }} />
        {f > 6 && f < 54 && <div style={{ position: 'absolute', left: x + it.w / 2 - 22, top: y + it.h / 2 - 22, width: 44, height: 44, borderRadius: 99, background: 'rgba(255,255,255,0.85)', border: `4px solid ${C.accent}`, zIndex: 11 }} />}
        <Counter label="במקום" done={landed ? 1 : 0} total={10} />
      </TabletAt>
      <StarBurst x={ts(tx + 40, ty + 26).x} y={ts(tx + 40, ty + 26).y} at={52} n={9} dist={150} size={28} />
      <SideHead text={'גוררים, משחקים\nו*קוראים*'} sub={'משפטים ראשונים —\nכבר בתחנה השישית'} out={dur - 10} />
    </AbsoluteFill>
  );
};

/* ── 8. כתיבה: הכוכב המוזהב מוביל את הדיו על M ואז m — לפי המסלול שהוקלט ── */
type Pt = [number, number];
const inkPath = (st: Pt[], box: number[]) => st.map(([px, py], i) => `${i ? 'L' : 'M'}${(box[0] + px * box[2]).toFixed(1)} ${(box[1] + py * box[3]).toFixed(1)}`).join(' ');
const Ink: React.FC<{ glyph: 'M' | 'm'; box: number[]; from: number; to: number }> = ({ glyph, box, from, to }) => {
  const f = useCurrentFrame();
  const S = (strokes as unknown as Record<string, Pt[][]>)[glyph];
  const total = S.reduce((n, s) => n + s.length, 0);
  const prog = lerp(f, [from, to], [0, 1], (t) => t) * total;
  let remain = prog;
  let head: { x: number; y: number } | null = null;
  const w = (22 / 400) * box[2];
  const paths = S.map((st, i) => {
    const n = Math.max(0, Math.min(st.length, remain));
    remain -= st.length;
    if (n < 2) return null;
    const part = st.slice(0, Math.ceil(n));
    const last = part[part.length - 1];
    head = { x: box[0] + last[0] * box[2], y: box[1] + last[1] * box[3] };
    return <path key={i} d={inkPath(part, box)} fill="none" stroke="#3346a8" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
  });
  const writing = f >= from && f <= to;
  return (
    <>
      <svg width={1280} height={800} style={{ position: 'absolute', left: 0, top: 0, zIndex: 15 }}>{paths}</svg>
      {writing && head && (
        <div style={{ position: 'absolute', left: (head as { x: number }).x, top: (head as { y: number }).y, transform: 'translate(-50%,-50%)', zIndex: 16 }}>
          <GoldStar size={46} rot={f * 5} glow={1} />
        </div>
      )}
    </>
  );
};
const DoneMark: React.FC<{ box: number[]; at: number }> = ({ box, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at) return null;
  const s = pop(f, fps, at, 9, 220, 0.5);
  return (
    <>
      <div style={{ position: 'absolute', left: box[0] - 3, top: box[1] - 3, width: box[2] + 6, height: box[3] + 6, borderRadius: 26, border: `4px solid ${C.green}`, zIndex: 17, opacity: s }} />
      <div style={{ position: 'absolute', left: box[0] + box[2] - 62, top: box[1] + 12, width: 50, height: 50, borderRadius: 99, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})`, zIndex: 18, boxShadow: '0 6px 14px rgba(0,0,0,0.25)' }}>
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
    </>
  );
};
export const TraceScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const TAB = useTab();
  const { pick } = useLayout();
  const ts = (x: number, y: number) => toScreen(TAB, x, y);
  const { fps } = useVideoConfig();
  const [b0, b1] = meta.traceBoxes;
  const M_END = 78, m_from = 100, m_end = 150;
  const out = soft(f, fps, 160);
  return (
    <AbsoluteFill>
      <NightSky seed={15} light={0.1} />
      <TabletAt>
        <Shot src="trace-m.png" />
        {/* הריבוע הקטן נדלק כשמגיע תורו */}
        {f > M_END + 10 && <div style={{ position: 'absolute', left: b1[0], top: b1[1], width: b1[2], height: b1[3], borderRadius: 24, background: 'rgba(251,252,255,0.55)', boxShadow: `0 0 0 6px rgba(111,134,214,0.35)`, border: '3px solid #6f86d6', zIndex: 12 }} />}
        <Ink glyph="M" box={b0} from={16} to={M_END} />
        <DoneMark box={b0} at={M_END + 4} />
        <Ink glyph="m" box={b1} from={m_from} to={m_end} />
        <DoneMark box={b1} at={m_end + 4} />
      </TabletAt>
      <StarBurst x={ts(b0[0] + b0[2] / 2, b0[1] + b0[3] / 2).x} y={ts(b0[0] + b0[2] / 2, b0[1] + b0[3] / 2).y} at={M_END + 4} n={9} dist={170} size={28} />
      {/* פריצה: ה-M m המוזהבים עפים מחוץ למסך */}
      {f > 158 && (
        <div style={{ position: 'absolute', left: interpolate(out, [0, 1], [ts(640, 400).x, pick(1490, 540)]), top: interpolate(out, [0, 1], [ts(640, 400).y, pick(840, 1700)]), transform: `translate(-50%,-50%) scale(${interpolate(out, [0, 1], [0.4, 1])}) rotate(${interpolate(out, [0, 1], [-10, -4])}deg)`, fontFamily: letters, fontWeight: 700, fontSize: 210, color: C.accent, textShadow: '0 0 40px rgba(245,184,46,0.6), 0 14px 30px rgba(0,0,0,0.5)', direction: 'ltr', whiteSpace: 'nowrap' }}>
          M m
        </div>
      )}
      <SideHead text={'כותבים —\n*עם הצליל*'} sub={'מסלול הכתיבה של כל אות,\nכמו שמלמדים בכיתה'} out={dur - 12} />
    </AbsoluteFill>
  );
};

/* ── 9. כוכבים ופרסים ── */
export const RewardsScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const TAB = useTab();
  const { pick } = useLayout();
  const ts = (x: number, y: number) => toScreen(TAB, x, y);
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <NightSky seed={17} light={0.2} />
      <TabletAt>
        <Shot src="pirate.png" />
      </TabletAt>
      {/* חמישה כוכבים נוחתים בקשת מעל הטאבלט */}
      {[0, 1, 2, 3, 4].map((i) => {
        const at = 8 + i * 7;
        const s = pop(f, fps, at, 8, 200, 0.6);
        const a = Math.PI * (0.82 - i * 0.16);
        const x = TAB.x + Math.cos(a) * 420;
        const y = TAB.y - 260 - Math.sin(a) * 170;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y + (1 - s) * -200, transform: `translate(-50%,-50%) scale(${s}) rotate(${(1 - s) * 90}deg)`, zIndex: 30 }}>
            <GoldStar size={130} rot={drift(f, 6, 0.06, i)} />
          </div>
        );
      })}
      <StarBurst x={TAB.x} y={TAB.y - 390} at={40} n={12} dist={300} size={30} />
      <SideHead text={'כוכבים, *אוצרות*\nודמות משלך'} sub={'עד 5 כוכבים בתחנה,\nאביזרים לשודד, תעודת קפטן'} out={dur - 10} />
    </AbsoluteFill>
  );
};

/* ── 10. המורה: קוד כיתה ומפת חום שמתמלאת ── */
export const TeacherScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const TAB = useTab();
  const { pick } = useLayout();
  const ts = (x: number, y: number) => toScreen(TAB, x, y);
  const { fps } = useVideoConfig();
  const fill = lerp(f, [26, 110], [0, 1], easeInOut);
  const pulse = pop(f, fps, 8, 8, 200, 0.6);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position: 'absolute', right: -200, top: -260, width: 900, height: 900, borderRadius: 999, background: C.soft1 }} />
      <div style={{ position: 'absolute', left: -240, bottom: -300, width: 760, height: 760, borderRadius: 999, background: C.soft2, opacity: 0.8 }} />
      <TabletAt>
        <Shot src="teacher-full.png" />
        {/* מפת החום נחשפת מימין לשמאל */}
        <div style={{ position: 'absolute', left: 26, top: 272, height: 520, width: (1 - fill) * 1105, background: '#fff', zIndex: 10 }} />
        {/* קוד הכיתה מודגש */}
        <div style={{ position: 'absolute', left: 1052, top: 110, width: 186, height: 72, borderRadius: 18, border: `5px solid ${C.accent}`, transform: `scale(${0.9 + 0.1 * pulse})`, opacity: lerp(f, [8, 14], [0, 1]) * lerp(f, [70, 84], [1, 0]), zIndex: 11 }} />
      </TabletAt>
      {/* שם מומצא יוצא מהטבלה */}
      <div style={{ position: 'absolute', left: pick(ts(1180, 300).x + 30, 330), top: pick(ts(1180, 300).y - 30, 1590), transform: `scale(${pop(f, fps, 120) * lerp(f, [dur - 14, dur - 4], [1, 0])})`, transformOrigin: '0% 50%', zIndex: 40 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '16px 26px', boxShadow: '0 20px 40px -12px rgba(20,30,80,0.35)', direction: 'rtl', fontFamily: display, color: C.text, minWidth: 330 }}>
          <div style={{ fontWeight: 800, fontSize: 32 }}>נועה · 7 תחנות</div>
          <div style={{ fontFamily: ui, fontSize: 22, color: C.muted, marginTop: 4 }}>מכירה: c · a · t · s · h · r · f · m</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>{[0, 1, 2, 3, 4].map((i) => <GoldStar key={i} size={30} glow={0} />)}</div>
        </div>
      </div>
      <SideHead dark={false} text={'המורה רואה\nאת *כל הכיתה*'} sub={'קוד כיתה בן 6 ספרות,\nומפת שליטה באותיות'} out={dur - 12} tag="בלי סיסמאות לילדים — שם ותמונה" tagAt={70} />
    </AbsoluteFill>
  );
};

/* ── 11. הורים ועזרים + רשת מסוננת ── */
export const ParentsScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const TAB = useTab();
  const { pick } = useLayout();
  const ts = (x: number, y: number) => toScreen(TAB, x, y);
  const { fps } = useVideoConfig();
  const y = interpolate(f, [10, 70], [0, 790], { ...clamp, easing: easeInOut });
  const chip = soft(f, fps, 86);
  const toggled = f > 112;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position: 'absolute', right: -200, top: -260, width: 900, height: 900, borderRadius: 999, background: C.soft1 }} />
      <div style={{ position: 'absolute', left: -240, bottom: -300, width: 760, height: 760, borderRadius: 999, background: C.soft2, opacity: 0.8 }} />
      <TabletAt>
        <Shot src="parents-full.png" y={y} />
      </TabletAt>
      {/* מתג יוטיוב ⇄ דרייב פורץ מהמסך */}
      {f > 84 && (
        <div style={{ position: 'absolute', left: interpolate(chip, [0, 1], [TAB.x, pick(1500, 540)]), top: interpolate(chip, [0, 1], [TAB.y, pick(800, 1700)]), transform: `translate(-50%,-50%) scale(${interpolate(chip, [0, 1], [0.3, 1])})`, zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: C.ink, color: '#fff', borderRadius: 999, padding: '16px 30px', fontFamily: display, fontWeight: 800, fontSize: 34, direction: 'rtl', boxShadow: '0 24px 44px -14px rgba(10,20,60,0.5)' }}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={C.accent2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
            <span style={{ opacity: toggled ? 0.45 : 1 }}>יוטיוב</span>
            <div style={{ width: 74, height: 40, borderRadius: 99, background: toggled ? C.green : '#3a4366', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 5, right: toggled ? 39 : 5, width: 30, height: 30, borderRadius: 99, background: '#fff', transition: 'none' }} />
            </div>
            <span style={{ opacity: toggled ? 1 : 0.45 }}>דרייב</span>
          </div>
        </div>
      )}
      <SideHead dark={false} text={'גם להורים:\nחוברת ו*עזרים*'} sub={'ועובד גם בבית ספר\nעם רשת מסוננת'} out={dur - 12} />
    </AbsoluteFill>
  );
};

export { easeIn };

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { nav } from '../App';
import type { StudentSession, ProgressData } from '../lib/api';
import { loadCatalog, mastery, SKILL_ORDER, type UnitMeta } from '../data/units';
import SkyStars from '../ui/Sky';
import Footer from '../ui/Footer';
import { IconLogOut, IconPlay, IconLock, IconCheck } from '../ui/icons';
import { avatarName } from '../data/avatars';

/** מצב יחידה לתצוגה */
function unitState(u: UnitMeta, p: ProgressData, unlocked: boolean) {
  const pos = p.positions[u.id];
  if (pos?.completed) return { kind: 'done' as const, pct: 1 };
  if (pos && pos.furthest > 0) return { kind: 'started' as const, pct: Math.min(0.98, pos.furthest / u.slides) };
  return { kind: unlocked ? ('open' as const) : ('locked' as const), pct: 0 };
}

export default function StarMap({ session, progress, onLogout }: {
  session: StudentSession; progress: ProgressData; onLogout: () => void;
}) {
  const [units, setUnits] = useState<UnitMeta[]>([]);
  useEffect(() => { loadCatalog().then(setUnits); }, []);

  const free = progress.freeNav ?? session.freeNav ?? true;
  // נעילה הדרגתית (כשהמורה כיבתה מסלול חופשי): פתוחה אם הקודמת הושלמה או התחילה
  const unlocked = (i: number) => free || i === 0 || !!progress.positions[units[i - 1]?.id]?.completed || !!progress.positions[units[i]?.id];

  // "להמשיך מאיפה שעצרתי": היחידה האחרונה שנגעו בה ולא הושלמה, אחרת הראשונה שלא הושלמה
  const inProgress = units
    .filter((u) => progress.positions[u.id] && !progress.positions[u.id].completed)
    .sort((a, b) => (progress.positions[b.id].at ?? '').localeCompare(progress.positions[a.id].at ?? ''))[0];
  const nextUnit = inProgress ?? units.find((u) => !progress.positions[u.id]?.completed);

  const doneCount = units.filter((u) => progress.positions[u.id]?.completed).length;

  return (
    <div className="night-sky">
      <SkyStars count={90} seed={11} />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="tip-host" style={{ fontSize: 34 }}>
            {session.emoji}
            <span className="tip">{avatarName(session.emoji)}</span>
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 19 }}>{session.nickname}</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>{session.className ?? (session.token === 'guest' ? 'משחק חופשי' : 'תצוגת מורה')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="pill" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>
            {doneCount} / {units.length || 18} תחנות
          </span>
          <button className="icon-btn" onClick={onLogout} aria-label="יציאה" title="יציאה"><IconLogOut size={19} /></button>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 12px 24px' }}>
        <h1 dir="ltr" style={{ textAlign: 'center', fontFamily: "'Fredoka One', 'Heebo', sans-serif", fontWeight: 400, fontSize: 'clamp(26px, 5vw, 40px)', margin: '4px 0 6px' }}>
          English through the Stars
        </h1>
        {nextUnit && (
          <div style={{ textAlign: 'center', margin: '8px 0 6px' }}>
            <button className="btn star" style={{ fontSize: 18 }} onClick={() => nav(`/unit/${nextUnit.id}`)}>
              <IconPlay size={18} />
              {inProgress ? `ממשיכים: תחנה ${nextUnit.n}` : `מתחילים: תחנה ${nextUnit.n}`}
            </button>
          </div>
        )}

        <Constellation units={units} progress={progress} unlocked={unlocked} current={nextUnit?.id} />

        <SkillShelf progress={progress} units={units} />
      </main>
      <Footer light />
    </div>
  );
}

// ── קבוצת הכוכבים: 18 תחנות על שביל מתפתל ──

function Constellation({ units, progress, unlocked, current }: {
  units: UnitMeta[]; progress: ProgressData; unlocked: (i: number) => boolean; current?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = w > 860 ? 6 : w > 560 ? 4 : 3;
  const rowH = w > 560 ? 150 : 128;
  const colW = w / cols;
  const pts = units.map((_, i) => {
    const r = Math.floor(i / cols);
    const cInRow = i % cols;
    const c = r % 2 === 0 ? cInRow : cols - 1 - cInRow; // נחש: שורה זוגית מימין לשמאל (RTL)
    const wobble = ((i * 37) % 3 - 1) * 12;
    return { x: w - (c + 0.5) * colW, y: r * rowH + rowH / 2 + wobble };
  });
  const rows = Math.ceil(units.length / cols) || 3;
  const h = rows * rowH;

  let d = '';
  pts.forEach((p, i) => {
    if (i === 0) { d = `M${p.x},${p.y}`; return; }
    const a = pts[i - 1];
    const my = (a.y + p.y) / 2;
    d += a.y === p.y || Math.abs(a.y - p.y) < 40 ? ` Q${(a.x + p.x) / 2},${my - 18} ${p.x},${p.y}` : ` C${a.x},${my + 40} ${p.x},${my - 40} ${p.x},${p.y}`;
  });

  return (
    <div ref={ref} style={{ position: 'relative', height: h, margin: '10px 0 26px' }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        <path d={d} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      </svg>
      {units.map((u, i) => {
        const st = unitState(u, progress, unlocked(i));
        return <StarNode key={u.id} u={u} st={st} x={pts[i].x} y={pts[i].y} isCurrent={u.id === current} />;
      })}
    </div>
  );
}

function StarNode({ u, st, x, y, isCurrent }: {
  u: UnitMeta; st: ReturnType<typeof unitState>; x: number; y: number; isCurrent: boolean;
}) {
  const locked = st.kind === 'locked';
  const size = 74;
  const R = 34;
  const circ = 2 * Math.PI * R;
  const fill = st.kind === 'done' ? '#f5b82e' : st.kind === 'locked' ? '#46537f' : '#8ea2ff';
  return (
    <button
      className="tip-host star-node"
      disabled={locked}
      onClick={() => nav(`/unit/${u.id}`)}
      style={{
        position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size + 26,
        background: 'none', border: 'none', padding: 0, color: '#fff', cursor: locked ? 'default' : 'pointer',
      }}
      aria-label={`תחנה ${u.n}: ${u.title}`}
    >
      <svg width={size} height={size} viewBox="0 0 80 80" style={{ overflow: 'visible', animation: isCurrent ? 'pulse-ring 2s infinite' : undefined, borderRadius: '50%' }}>
        {st.kind === 'started' && (
          <circle cx="40" cy="40" r={R} fill="none" stroke="#f5b82e" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${circ * st.pct} ${circ}`} transform="rotate(-90 40 40)" />
        )}
        <circle cx="40" cy="40" r="28" fill={fill} opacity={st.kind === 'done' ? 0.25 : 0.18} />
        <path
          d="M40 14l7.6 16.2 17.6 2.1-13 12.1 3.4 17.5L40 53.2l-15.6 8.7 3.4-17.5-13-12.1 17.6-2.1z"
          fill={fill} stroke={st.kind === 'done' ? '#7a4d00' : '#1b2350'} strokeWidth="2.4" strokeLinejoin="round"
        />
        <text x="40" y="45.5" textAnchor="middle" fontSize="15" fontWeight="800" fill={st.kind === 'done' ? '#5a3a00' : '#16224a'} fontFamily="Heebo, sans-serif">
          {u.n}
        </text>
      </svg>
      <span dir="ltr" style={{ display: 'block', fontFamily: "'Fredoka One', sans-serif", fontSize: 17, marginTop: -2, opacity: locked ? 0.5 : 1, whiteSpace: 'nowrap' }}>
        {u.title}
      </span>
      {locked && <span style={{ position: 'absolute', top: 2, left: 2, opacity: 0.8 }}><IconLock size={14} /></span>}
      {st.kind === 'done' && <span style={{ position: 'absolute', top: 0, left: 0, background: '#16a34a', borderRadius: 999, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={13} strokeWidth={3} /></span>}
      <span className="tip">
        {locked ? 'התחנה תיפתח אחרי שתסיימו את הקודמת' : st.kind === 'done' ? 'הושלמה — אפשר לשחק שוב' : st.kind === 'started' ? `התקדמתם ${Math.round(st.pct * 100)}%` : `${u.slides} שקפים`}
      </span>
    </button>
  );
}

// ── מדף האותיות: אותיות שהתלמיד כבר שולט בהן ──

function SkillShelf({ progress, units }: { progress: ProgressData; units: UnitMeta[] }) {
  const taught = new Set(units.flatMap((u) => u.skills));
  const skills = SKILL_ORDER.filter((s) => taught.has(s));
  const any = Object.keys(progress.skills).length > 0;
  if (!any) return null;
  return (
    <section style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 22, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.16)' }}>
      <h3 style={{ fontSize: 16, marginBottom: 10, opacity: 0.9 }}>האותיות והצלילים שלי</h3>
      <div dir="ltr" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {skills.map((s) => {
          const m = mastery(progress.skills[s], 2);
          const lit = m !== null && m >= 0.7;
          const mid = m !== null && !lit;
          return (
            <span key={s} className="tip-host" style={{
              minWidth: 44, height: 44, padding: '0 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Fredoka One', sans-serif", fontSize: 20,
              background: lit ? '#f5b82e' : mid ? 'rgba(245,184,46,0.3)' : 'rgba(255,255,255,0.06)',
              color: lit ? '#3b2600' : '#fff', opacity: m === null ? 0.45 : 1,
              border: lit ? '2px solid #ffe08a' : '1.5px solid rgba(255,255,255,0.25)',
            }}>
              {s}
              <span className="tip" dir="rtl">{m === null ? 'עוד לא תרגלנו' : lit ? 'אני מכיר/ה!' : 'בדרך — עוד קצת תרגול'}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { nav } from '../App';
import type { StudentSession, ProgressData } from '../lib/api';
import { loadCatalog, type UnitMeta } from '../data/units';
import { loadJourney, bgUrl, type JourneyConfig, type Pt } from '../data/journey';
import { unitStars } from '../data/stars';
import { avatarName } from '../data/avatars';
import { BASE } from '../lib/mediaPaths';
import JourneyScene from '../ui/JourneyScene';
import Footer from '../ui/Footer';
import { unitState, SkillShelf } from './StarMap';
import { IconLogOut, IconPlay, IconLock, IconHeart, IconSparkles, IconX } from '../ui/icons';

// מפת מסע אנכית: מתחילים למטה (אי האוצר) ומטפסים לכוכבים. כל תחנה = תיבת אוצר;
// הושלמה → תיבה פתוחה עם אבני חן. מעל כל תחנה קשת של 5 כוכבים.

const CHEST_CLOSED = `${BASE}journey/chest-closed.webp`;
const CHEST_OPEN = `${BASE}journey/chest-open.webp`;

export default function Journey({ session, progress, onLogout }: {
  session: StudentSession; progress: ProgressData; onLogout: () => void;
}) {
  const [units, setUnits] = useState<UnitMeta[]>([]);
  const [cfg, setCfg] = useState<JourneyConfig | null>(null);
  const [shelf, setShelf] = useState(false);
  useEffect(() => { loadCatalog().then(setUnits); loadJourney().then(setCfg); }, []);

  const free = progress.freeNav ?? session.freeNav ?? true;
  const unlocked = (i: number) => free || i === 0 || !!progress.positions[units[i - 1]?.id]?.completed || !!progress.positions[units[i]?.id];
  const inProgress = units
    .filter((u) => progress.positions[u.id] && !progress.positions[u.id].completed)
    .sort((a, b) => (progress.positions[b.id].at ?? '').localeCompare(progress.positions[a.id].at ?? ''))[0];
  const current = inProgress ?? units.find((u) => !progress.positions[u.id]?.completed);
  const totalStars = units.reduce((n, u) => n + (progress.positions[u.id] ? unitStars(u, progress) : 0), 0);

  return (
    <div className="journey-page">
      <header className="journey-bar">
        <div className="jb-who">
          <span className="tip-host jb-avatar">{session.emoji}<span className="tip">{avatarName(session.emoji)}</span></span>
          <div>
            <b>{session.nickname}</b>
            <span>{session.className ?? (session.token === 'guest' ? 'משחק חופשי' : 'תצוגת מורה')}</span>
          </div>
        </div>
        <div className="jb-actions">
          <span className="jb-stars tip-host">
            <StarGlyph /> {totalStars}
            <span className="tip">כוכבים שאספתי (עד 5 בכל תחנה)</span>
          </span>
          <button className="icon-btn" onClick={() => setShelf(true)} aria-label="האותיות שלי" title="האותיות שלי"><IconSparkles size={19} /></button>
          <button className="icon-btn" onClick={() => nav('/parents')} aria-label="להורים ולמורים" title="להורים ולמורים"><IconHeart size={18} /></button>
          <button className="icon-btn" onClick={onLogout} aria-label="יציאה" title="יציאה"><IconLogOut size={18} /></button>
        </div>
      </header>

      {cfg && units.length > 0 && (
        <Board cfg={cfg} units={units} progress={progress} unlocked={unlocked} current={current?.id} emoji={session.emoji} />
      )}

      {current && (
        <button className="btn star journey-go" onClick={() => nav(`/unit/${current.id}`)}>
          <IconPlay size={18} /> {inProgress ? 'ממשיכים' : 'מתחילים'}: תחנה {current.n}
        </button>
      )}

      {shelf && (
        <div className="slide-menu-backdrop" onClick={() => setShelf(false)}>
          <div className="shelf-modal pop-in" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn shelf-close" onClick={() => setShelf(false)} aria-label="סגירה"><IconX size={18} /></button>
            <SkillShelf progress={progress} units={units} always />
          </div>
        </div>
      )}
      <Footer light />
    </div>
  );
}

function Board({ cfg, units, progress, unlocked, current, emoji }: {
  cfg: JourneyConfig; units: UnitMeta[]; progress: ProgressData;
  unlocked: (i: number) => boolean; current?: string; emoji: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setW(el.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = w * cfg.ratio;
  const P = (p: Pt) => ({ x: (p.x / 100) * w, y: (p.y / 100) * h });
  const pts = cfg.stations.map(P);
  const bg = bgUrl(cfg);

  // גלילה לתחנה הנוכחית (או לתחתית) — המסע נטען מלמטה
  const scrolled = useRef(false);
  useEffect(() => {
    if (!w || scrolled.current) return;
    scrolled.current = true;
    const i = Math.max(0, units.findIndex((u) => u.id === current));
    const y = pts[i]?.y ?? h;
    const top = (ref.current?.offsetTop ?? 0) + y - window.innerHeight * 0.6;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }, [w]);

  // שביל: עקומה חלקה בין התחנות; החלק שהושלם — זהב
  const pathD = useMemo(() => smoothPath(pts), [w, cfg]);
  const doneUpTo = units.reduce((n, u, i) => (progress.positions[u.id]?.completed ? i : n), -1);
  const donePath = doneUpTo >= 0 ? smoothPath(pts.slice(0, doneUpTo + 2 > pts.length ? pts.length : doneUpTo + 2)) : '';
  const nodeW = Math.max(62, Math.min(96, w * 0.14));

  return (
    <div ref={ref} className="journey-board" style={{ height: h || undefined }}>
      {w > 0 && (
        <>
          {bg ? <img className="journey-bg" src={bg} alt="" /> : <JourneyScene ratio={cfg.ratio} />}
          <svg className="journey-path" width={w} height={h} aria-hidden="true">
            <path d={pathD} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={Math.max(8, w * 0.018)} strokeLinecap="round" strokeDasharray={`${w * 0.004} ${w * 0.028}`} />
            {donePath && <path d={donePath} fill="none" stroke="#f5b82e" strokeWidth={Math.max(8, w * 0.018)} strokeLinecap="round" strokeDasharray={`${w * 0.004} ${w * 0.028}`} />}
          </svg>

          {/* "מתחילים כאן!" — כמו בעמוד הישן */}
          <div className="journey-start" style={{ left: pts[0].x, top: pts[0].y + nodeW * 0.62 }}>מתחילים כאן!</div>
          {/* סיום למעלה */}
          <div className="journey-finish" style={{ left: pts[pts.length - 1].x, top: pts[pts.length - 1].y - nodeW * 1.55 }}>
            <FinishStar size={nodeW * 0.9} lit={!!progress.positions[units[units.length - 1]?.id]?.completed} />
          </div>

          {units.map((u, i) => {
            const st = unitState(u, progress, unlocked(i));
            const touched = !!progress.positions[u.id];
            const stars = touched ? unitStars(u, progress) : 0;
            const isCur = u.id === current;
            const p = pts[i];
            return (
              <button
                key={u.id}
                className={`jnode ${st.kind}${isCur ? ' current' : ''}`}
                style={{ left: p.x, top: p.y, width: nodeW }}
                disabled={st.kind === 'locked'}
                onClick={() => nav(`/unit/${u.id}`)}
                aria-label={`תחנה ${u.n}: ${u.title}${touched ? `, ${stars} כוכבים` : ''}`}
              >
                <StarArc stars={stars} show={touched} size={nodeW * 0.3} />
                <img className="jnode-chest" src={st.kind === 'done' ? CHEST_OPEN : CHEST_CLOSED} alt="" draggable={false} />
                <span className="jnode-num">{u.n}</span>
                <span className="jnode-label" dir="ltr">{u.title}</span>
                {st.kind === 'locked' && <span className="jnode-lock"><IconLock size={14} /></span>}
                {st.kind === 'started' && <ProgressRing pct={st.pct} />}
                {isCur && <span className="jnode-me" aria-hidden="true">{emoji}</span>}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

/** עקומת Catmull-Rom חלקה דרך הנקודות */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d;
}

const STAR_D = 'M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z';

/** 5 כוכבים בקשת מעל התחנה, חופפים מעט — האמצעי גבוה וגדול */
function StarArc({ stars, show, size }: { stars: number; show: boolean; size: number }) {
  if (!show) return null;
  const pos = [-2, -1, 0, 1, 2];
  return (
    <span className="star-arc" aria-hidden="true">
      {pos.map((k, i) => {
        const on = i < stars;
        const s = size * (k === 0 ? 1.18 : Math.abs(k) === 1 ? 1.02 : 0.88);
        const x = k * size * 0.62;
        const y = Math.abs(k) ** 1.4 * size * 0.22; // קשת: האמצעי למעלה, הקצוות נמוכים
        const rot = k * 12;
        return (
          <svg key={i} width={s} height={s} viewBox="0 0 24 24"
            style={{ transform: `translate(calc(-50% + ${x}px), ${y}px) rotate(${rot}deg)`, zIndex: 3 - Math.abs(k) }}>
            <path d={STAR_D} fill={on ? '#ffc93c' : 'rgba(255,255,255,0.35)'} stroke={on ? '#9a5d00' : 'rgba(40,50,90,0.55)'} strokeWidth="1.7" strokeLinejoin="round" />
            {on && <path d="M12 5.4l1.5 3.2" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.4" strokeLinecap="round" />}
          </svg>
        );
      })}
    </span>
  );
}

/** טבעת התקדמות סביב התיבה — ויזואלית, בלי מספר */
function ProgressRing({ pct }: { pct: number }) {
  const R = 46, C = 2 * Math.PI * R;
  return (
    <svg className="jnode-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={R} fill="rgba(11,19,48,0.28)" stroke="rgba(255,255,255,0.35)" strokeWidth="5" />
      <circle cx="50" cy="50" r={R} fill="none" stroke="#ffc93c" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 50 50)" />
    </svg>
  );
}

function FinishStar({ size, lit }: { size: number; lit: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={lit ? 'finish-lit' : ''} aria-label="סוף המסע">
      <circle cx="32" cy="33" r="30" fill="#ffe89a" opacity={lit ? 0.45 : 0.15} />
      <path d="M32 5l7.6 16.2 17.6 2.1-13 12.1 3.4 17.5L32 44.2l-15.6 8.7 3.4-17.5-13-12.1 17.6-2.1z"
        fill={lit ? '#ffc93c' : '#d8dcef'} stroke={lit ? '#8a5a00' : '#6b7596'} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M32 12l4.6 9.9 10.7 1.3" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function StarGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_D} fill="#ffc93c" stroke="#9a5d00" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

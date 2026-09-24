import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { nav } from '../App';
import type { StudentSession, ProgressData, SkillStat } from '../lib/api';
import { reportPosition, reportResult, reportVisit } from '../lib/api';
import { STAR_KINDS, starsFor, unitQuality, weakSlides } from '../data/stars';
import { BOOKLET_PDF, BOOKLET_PAGE, TEXTS_PDF, TEXTS_PAGE, FINALE, pdfPage } from '../data/resources';
import StarRow from '../ui/StarRow';
import { loadUnit, loadCatalog, SCORED_KINDS, type UnitMeta } from '../data/units';
import { loadThemes } from '../engine/theme';
import type { Instructions, UnitContent } from '../engine/types';
import { StageFrame } from '../engine/Stage';
import { PlayCtx, skillsFor, type PlayApi } from '../engine/play';
import { playVoice, stopVoice, onVoiceState, playWin, preloadAudio } from '../lib/audio';
import TappingBoard from '../games/TappingBoard';
import FindAnswer from '../games/FindAnswer';
import DragDrop from '../games/DragDrop';
import { CardQuiz, Matching, Memory, Flashcards } from '../games/Cards';
import { Cover, VideoSlide } from '../games/Design';
import SkyStars, { DrawnStar } from '../ui/Sky';
import { IconHome, IconChevronLeft, IconChevronRight, IconVolume, IconPlay, IconRotate, IconMaximize, IconCheck, IconRefresh, IconStar, IconPrint } from '../ui/icons';

type Assist = { a: Instructions; type: 'instructions' | 'feedback'; always: boolean };

function slideAssist(kind: string, c: any): { instructions: Instructions | null; feedback: Instructions | null } {
  const base = kind === 'dragDrop' ? c : c.base;
  return { instructions: base?.instructions ?? null, feedback: base?.feedback ?? null };
}
const hasContent = (a: Instructions | null | undefined): a is Instructions => !!a && (!!a.text || !!a.audio);

export default function PlayView({ unitId, jump, session, progress, onReported }: {
  unitId: string; jump?: number; session: StudentSession; progress: ProgressData; onReported: () => void;
}) {
  const [unit, setUnit] = useState<UnitContent | null>(null);
  const [catalog, setCatalog] = useState<UnitMeta[]>([]);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  // איכות הטובה ביותר לכל שקף ביחידה (index → 0..1) — מתעדכן תוך כדי משחק
  const [qMap, setQMap] = useState<Record<number, number>>({});
  const begun = useRef(false); // התחלה (וספירת כניסה) פעם אחת בלבד

  useEffect(() => {
    setUnit(null); setStarted(false); setDone(false);
    Promise.all([loadUnit(unitId), loadThemes(), loadCatalog()])
      .then(([u, , cat]) => {
        const q: Record<number, number> = {};
        u.slides.forEach((_, i) => { const v = progress.slides[`${u.id}:${i}`]?.q; if (v) q[i] = v; });
        setQMap(q);
        setUnit(u);
        setCatalog(cat);
      })
      .catch(() => setErr('לא הצלחנו לטעון את התחנה — בדקו את החיבור'));
    return () => stopVoice();
  }, [unitId]);

  const saved = progress.positions[unitId] && !progress.positions[unitId].completed ? progress.positions[unitId].slide : 0;
  const resumeAt = jump ?? saved;

  if (err) return <Centered><p>{err}</p><button className="btn star" onClick={() => nav('/map')}>למפה</button></Centered>;
  if (!unit) return <Centered><div className="loader" /></Centered>;

  if (done) {
    const nextUnit = catalog.find((u) => u.n === unit.n + 1);
    return <UnitDone unit={unit} nextUnit={nextUnit} qMap={qMap} />;
  }

  if (!started) {
    const begin = () => {
      if (begun.current) return;
      begun.current = true;
      try { new Audio().play().catch(() => {}); } catch { /* */ }
      preloadAudio(collectAudio(unit, resumeAt));
      reportVisit(session, unit.id);
      setIdx(resumeAt);
      setStarted(true);
    };
    // נכנסו מהמפה (הייתה נגיעה בדף) — פותחים ישר את הפעילות, ממשיכים מהשקף שבו עצרו.
    // רק כשהדף נפתח בלי שום נגיעה (קישור / רענון) צריך לחיצה אחת כדי שהדפדפן יתיר שמע.
    const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
    if (activated) { queueMicrotask(begin); return <Centered><div className="loader" /></Centered>; }
    return (
      <div className="night-sky" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <SkyStars seed={unit.n} />
        <button className="btn star play-big" onClick={begin} aria-label="מתחילים"><IconPlay size={44} /></button>
        <div dir="ltr" style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 30 }}>{unit.title}</div>
      </div>
    );
  }

  return (
    <UnitPlayer
      unit={unit} session={session} startIdx={idx} qMap={qMap}
      onQuality={(i, q) => setQMap((m) => (q > (m[i] ?? 0) ? { ...m, [i]: q } : m))}
      onExit={() => { onReported(); nav('/map'); }}
      onComplete={() => { onReported(); setDone(true); }}
    />
  );
}

function collectAudio(unit: UnitContent, from: number): string[] {
  const s = JSON.stringify(unit.slides.slice(from, from + 4));
  return [...new Set([...s.matchAll(/"id":"([0-9a-f-]{36})","lib":"User"\}/g)].map((m) => m[1]))];
}

// ── נגן: שקף אחרי שקף ──

function UnitPlayer({ unit, session, startIdx, qMap, onQuality, onExit, onComplete }: {
  unit: UnitContent; session: StudentSession; startIdx: number;
  qMap: Record<number, number>; onQuality: (slide: number, q: number) => void;
  onExit: () => void; onComplete: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [active, setActive] = useState(false);
  const [assist, setAssist] = useState<Assist | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const total = unit.slides.length;
  const slide = unit.slides[idx];
  const kinds = useMemo(() => unit.slides.map((s) => s.kind), [unit]);
  const stats = useRef({ correct: 0, wrong: 0, skills: {} as Record<string, SkillStat>, t0: Date.now(), finished: false, touched: false, quality: 0 });
  const finishing = useRef(false);

  useEffect(() => onVoiceState(setSpeaking), []);

  const { instructions, feedback } = useMemo(() => slideAssist(slide.kind, slide.content), [slide]);

  // תחילת שקף: הוראות (חלון אם יש טקסט / חובה, אחרת שמע בלבד) ← משחק
  useEffect(() => {
    stats.current = { correct: 0, wrong: 0, skills: {}, t0: Date.now(), finished: false, touched: false, quality: 0 };
    finishing.current = false;
    setActive(false);
    preloadAudio(collectAudio(unit, idx + 1));
    reportPosition(session, unit.id, idx, total).catch(() => {});
    // בלי "1, 2, 3 Go!" של Jigzi — שקף בלי הוראות מתחיל מיד
    if (hasContent(instructions)) {
      openAssist({ a: instructions, type: 'instructions', always: false });
    } else {
      setActive(true);
    }
    return () => stopVoice();
  }, [idx]);

  const assistRef = useRef<Assist | null>(null);
  const openAssist = (as: Assist) => {
    assistRef.current = as;
    setAssist(as);
    const popup = !!as.a.text || as.always;
    playVoice(as.a.audio?.id).then(() => {
      if (!popup) closeAssist(as);
    });
  };

  const closeAssist = (as: Assist) => {
    if (assistRef.current !== as) return; // כבר נסגר (דילוג + סוף השמע)
    assistRef.current = null;
    stopVoice();
    setAssist(null);
    if (as.type === 'instructions') setActive(true);
    else goNext(true);
  };

  const sendResult = (finished: boolean, nextIdx: number) => {
    const s = stats.current;
    const starKind = STAR_KINDS.has(slide.kind);
    if (!(SCORED_KINDS.has(slide.kind) || starKind) || (!s.touched && !finished && s.quality <= 0)) return;
    // כוכבי התחנה אחרי השקף הזה (לפי הטוב ביותר בכל שקף)
    const merged = { ...qMap, [idx]: Math.max(qMap[idx] ?? 0, s.quality) };
    const slidesView = Object.fromEntries(Object.entries(merged).map(([i, q]) => [`${unit.id}:${i}`, { c: 0, w: 0, n: 1, q }]));
    const stars = starsFor(unitQuality(unit.id, kinds, slidesView));
    if (starKind) onQuality(idx, s.quality);
    reportResult(session, {
      unitId: unit.id, slide: idx, kind: slide.kind,
      correct: s.correct, wrong: s.wrong, seconds: Math.round((Date.now() - s.t0) / 1000),
      skills: s.skills, next: nextIdx, total, quality: Math.round(s.quality * 100) / 100, stars,
    }).catch(() => {});
  };

  const goNext = (finished = false) => {
    assistRef.current = null;
    stopVoice();
    setAssist(null); // מעבר לא נתקע בגלל חלון הוראות פתוח
    sendResult(finished || stats.current.finished, idx + 1);
    if (idx + 1 >= total) {
      reportPosition(session, unit.id, total, total).catch(() => {});
      onComplete();
    } else {
      setIdx(idx + 1);
    }
  };

  const goPrev = () => {
    if (idx === 0) return;
    assistRef.current = null;
    stopVoice();
    setAssist(null);
    sendResult(false, idx - 1);
    setIdx(idx - 1);
  };

  const api: PlayApi = {
    active: active && !assist,
    unit,
    finish: () => {
      if (finishing.current) return;
      finishing.current = true;
      stats.current.finished = true;
      if (hasContent(feedback)) openAssist({ a: feedback, type: 'feedback', always: false });
      else goNext(true);
    },
    record: (ok, text) => {
      const s = stats.current;
      s.touched = true;
      if (ok) s.correct++; else s.wrong++;
      for (const k of skillsFor(text, unit.skills)) {
        const cur = s.skills[k] ?? { c: 0, w: 0 };
        s.skills[k] = ok ? { ...cur, c: cur.c + 1 } : { ...cur, w: cur.w + 1 };
      }
    },
    progress: (q) => {
      stats.current.quality = Math.max(stats.current.quality, Math.min(1, Math.max(0, q)));
    },
  };

  const fullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => {});
  };

  const theme = slide.kind === 'dragDrop' ? slide.content.theme : slide.content.base?.theme ?? 'Blank';

  return (
    <div className="player">
      <header className="player-bar">
        <button className="icon-btn" onClick={() => { stopVoice(); sendResult(false, idx); onExit(); }} aria-label="למפה" title="למפה"><IconHome size={20} /></button>
        <button
          className="icon-btn subtle" aria-label="מההתחלה" title="מההתחלה" disabled={idx === 0}
          onClick={() => { assistRef.current = null; stopVoice(); setAssist(null); sendResult(false, 0); setIdx(0); }}
        >
          <IconRotate size={18} />
        </button>
        <div className="player-progress" title={`שקף ${idx + 1} מתוך ${total}`}>
          <div style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
        <SlideCounter
          idx={idx} total={total} kinds={kinds} qMap={qMap}
          easy={session.token === 'teacher-preview'}
          onJump={(to) => {
            if (to === idx) return;
            assistRef.current = null;
            stopVoice();
            setAssist(null);
            sendResult(false, to);
            setIdx(to);
          }}
        />
        {hasContent(instructions) && (
          <button className={`icon-btn${speaking ? ' speaking' : ''}`} aria-label="שמיעת ההוראות שוב" title="שמיעת ההוראות שוב"
            onClick={() => openAssist({ a: instructions, type: 'instructions', always: false })}>
            <IconVolume size={20} />
          </button>
        )}
        <button className="icon-btn hide-mobile" onClick={fullscreen} aria-label="מסך מלא" title="מסך מלא"><IconMaximize size={19} /></button>
      </header>

      <div className="player-stage">
        <PlayCtx.Provider value={api}>
          <StageFrame key={idx} sizes={unit.sizes} theme={theme}>
            <SlideBody kind={slide.kind} c={slide.content} />
          </StageFrame>
        </PlayCtx.Provider>

        {assist && (
          // לחיצה מחוץ לחלון סוגרת אותו (כמו "הבנתי")
          <div className="assist-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeAssist(assist); }}>
            {(assist.a.text || assist.always) && (
              <div className="assist-bubble pop-in" dir="auto">
                <p>{assist.a.text}</p>
                <div className="assist-actions">
                  {assist.a.audio && (
                    <button className="btn secondary small" onClick={() => playVoice(assist.a.audio!.id)}><IconRefresh size={15} /> שוב</button>
                  )}
                  <button className="btn star small" onClick={() => closeAssist(assist)}><IconCheck size={16} /> הבנתי</button>
                </div>
              </div>
            )}
            {!assist.a.text && !assist.always && (
              <button className="assist-listening" onClick={() => closeAssist(assist)} aria-label="דילוג" title="דילוג"><IconVolume size={30} /></button>
            )}
          </div>
        )}

        <button className="nav-arrow prev" onClick={goPrev} disabled={idx === 0} aria-label="הקודם"><IconChevronLeft size={30} /></button>
        <button className="nav-arrow next" onClick={() => goNext(false)} aria-label="הבא"><IconChevronRight size={30} /></button>
      </div>
    </div>
  );
}

const KIND_NAME: Record<string, string> = {
  cover: 'שער', poster: 'פוסטר', video: 'סרטון', embed: 'סרטון', tappingBoard: 'הקשה ושמיעה',
  findAnswer: 'מצא את התשובה', dragDrop: 'גרירה', cardQuiz: 'חידון קלפים', matching: 'התאמה',
  memoryGame: 'זיכרון', flashcards: 'כרטיסיות',
};

/** מונה השקפים — לחיצה ארוכה פותחת תפריט מעבר לשקף (לא זמין בלחיצה סתמית) */
function SlideCounter({ idx, total, kinds, qMap, easy, onJump }: {
  idx: number; total: number; kinds: string[]; qMap: Record<number, number>; easy: boolean; onJump: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | null>(null);
  const start = () => {
    if (easy) return;
    setPressing(true);
    timer.current = window.setTimeout(() => { setOpen(true); setPressing(false); }, 700);
  };
  const cancel = () => {
    setPressing(false);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  return (
    <>
      <button
        className={`player-count tip-host${pressing ? ' pressing' : ''}`}
        onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
        onClick={() => easy && setOpen(true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {idx + 1}/{total}
        <span className="tip">{easy ? 'מעבר לשקף' : 'לחיצה ארוכה — מעבר לשקף'}</span>
      </button>
      {open && (
        <div className="slide-menu-backdrop" onClick={() => setOpen(false)}>
          <div className="slide-menu pop-in" onClick={(e) => e.stopPropagation()}>
            <h3>לאיזה שקף לעבור?</h3>
            <div className="slide-menu-grid">
              {kinds.map((k, i) => {
                const q = qMap[i] ?? 0;
                const state = !STAR_KINDS.has(k) ? '' : q >= 0.95 ? ' full' : q > 0 ? ' part' : ' none';
                return (
                  <button key={i} className={`slide-chip${i === idx ? ' cur' : ''}${state}`} onClick={() => { setOpen(false); onJump(i); }}>
                    <b>{i + 1}</b>
                    <span>{KIND_NAME[k] ?? k}</span>
                    {state === ' full' && <i className="chip-mark"><IconStar size={13} filled /></i>}
                    {state === ' part' && <i className="chip-mark part"><IconStar size={13} /></i>}
                  </button>
                );
              })}
            </div>
            <p className="slide-menu-legend">
              <IconStar size={13} filled /> בוצע מושלם · <IconStar size={13} /> אפשר לשפר
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function SlideBody({ kind, c }: { kind: string; c: any }) {
  switch (kind) {
    case 'tappingBoard': return <TappingBoard c={c} />;
    case 'findAnswer': return <FindAnswer c={c} />;
    case 'dragDrop': return <DragDrop c={c} />;
    case 'cardQuiz': return <CardQuiz c={c} />;
    case 'matching': return <Matching c={c} />;
    case 'memoryGame': return <Memory c={c} />;
    case 'flashcards': return <Flashcards c={c} />;
    case 'cover': return <Cover c={c} kind="cover" />;
    case 'poster': return <Cover c={c} kind="poster" />;
    case 'video':
    case 'embed': return <VideoSlide c={c} />;
    default: return null;
  }
}

// ── סיום תחנה ──

function UnitDone({ unit, nextUnit, qMap }: { unit: UnitContent; nextUnit?: UnitMeta; qMap: Record<number, number> }) {
  const kinds = unit.slides.map((s) => s.kind);
  const view = Object.fromEntries(Object.entries(qMap).map(([i, q]) => [`${unit.id}:${i}`, { c: 0, w: 0, n: 1, q }]));
  const stars = starsFor(unitQuality(unit.id, kinds, view));
  const weak = weakSlides(unit.id, kinds, view);
  useEffect(() => {
    playWin();
    if (stars >= 4) confetti({ particleCount: stars === 5 ? 180 : 100, spread: 80, origin: { y: 0.6 }, colors: ['#f5b82e', '#ffe08a', '#8ea2ff', '#ffffff'] });
  }, []);
  const msg = stars === 5 ? 'מושלם! כל הכוכבים שלכם'
    : stars === 4 ? 'כמעט מושלם! רוצים לנסות להגיע ל-5?'
    : 'יפה מאוד! אפשר להשיג עוד כוכבים — נסו שוב את השקפים שסימנו';
  const page = BOOKLET_PAGE[unit.n];
  const tpage = TEXTS_PAGE[unit.n];
  return (
    <div className="night-sky">
      <SkyStars seed={unit.n + 40} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card pop-in" style={{ textAlign: 'center', color: 'var(--ink)', maxWidth: 460, width: '100%' }}>
          <div style={{ fontSize: 15, color: 'var(--ink-soft)', fontWeight: 700 }}>
            תחנה {unit.n} · <span dir="ltr" style={{ fontFamily: "'Fredoka One', sans-serif" }}>{unit.title}</span>
          </div>
          <StarRow stars={stars} size={46} animate />
          <h2 style={{ fontSize: 24, margin: '4px 0 16px' }}>{msg}</h2>
          {unit.n === 18 && <p style={{ color: 'var(--ink-soft)', marginTop: -6 }}>{FINALE}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {weak.length > 0 && stars < 5 && (
              <button className={`btn ${stars >= 4 ? 'secondary' : 'star'}`} style={{ minWidth: 240 }} onClick={() => nav(`/unit/${unit.id}/${weak[0] + 1}`)}>
                <IconRefresh size={16} /> לשפר — מתחילים בשקף {weak[0] + 1}
              </button>
            )}
            {nextUnit && (
              <button className={`btn ${stars >= 4 || weak.length === 0 ? 'star' : 'secondary'}`} style={{ minWidth: 240 }} onClick={() => nav(`/unit/${nextUnit.id}`)}>
                <IconPlay size={17} /> לתחנה {nextUnit.n}: <span dir="ltr">{nextUnit.title}</span>
              </button>
            )}
            <button className="pill" onClick={() => nav('/map')}><IconHome size={15} /> למפת הכוכבים</button>
          </div>
          <div className="booklet-links">
            <a className="pill" href={pdfPage(BOOKLET_PDF, page)} target="_blank" rel="noopener noreferrer">
              <IconPrint size={15} /> דף הכתיבה בחוברת (עמוד {page})
            </a>
            <a className="pill" href={pdfPage(TEXTS_PDF, tpage)} target="_blank" rel="noopener noreferrer">
              <IconPrint size={15} /> הטקסטים של התחנה (עמוד {tpage})
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="night-sky" style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      {children}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { nav } from '../App';
import type { StudentSession, ProgressData, SkillStat } from '../lib/api';
import { reportPosition, reportResult } from '../lib/api';
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
import { IconHome, IconChevronLeft, IconChevronRight, IconVolume, IconPlay, IconRotate, IconMaximize, IconCheck, IconRefresh } from '../ui/icons';

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

  useEffect(() => {
    setUnit(null); setStarted(false); setDone(false);
    Promise.all([loadUnit(unitId), loadThemes(), loadCatalog()])
      .then(([u, , cat]) => { setUnit(u); setCatalog(cat); })
      .catch(() => setErr('לא הצלחנו לטעון את התחנה — בדקו את החיבור'));
    return () => stopVoice();
  }, [unitId]);

  const saved = progress.positions[unitId] && !progress.positions[unitId].completed ? progress.positions[unitId].slide : 0;
  const resumeAt = jump ?? saved;

  if (err) return <Centered><p>{err}</p><button className="btn star" onClick={() => nav('/map')}>למפה</button></Centered>;
  if (!unit) return <Centered><div className="loader" /></Centered>;

  if (done) {
    const nextUnit = catalog.find((u) => u.n === unit.n + 1);
    return <UnitDone unit={unit} nextUnit={nextUnit} />;
  }

  if (!started) {
    const begin = (from: number) => {
      // מחווה של המשתמש — פותחת שמע בדפדפן (בעיקר אייפד)
      try { new Audio().play().catch(() => {}); } catch { /* */ }
      preloadAudio(collectAudio(unit, from));
      setIdx(from);
      setStarted(true);
    };
    return (
      <div className="night-sky">
        <SkyStars seed={unit.n} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card pop-in" style={{ textAlign: 'center', color: 'var(--ink)', maxWidth: 420, width: '100%' }}>
            <DrawnStar size={70} />
            <div style={{ fontSize: 15, color: 'var(--ink-soft)', fontWeight: 700 }}>תחנה {unit.n}</div>
            <h1 dir="ltr" style={{ fontFamily: "'Fredoka One', sans-serif", fontWeight: 400, fontSize: 48, margin: '2px 0 18px' }}>{unit.title}</h1>
            {resumeAt > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <button className="btn star" style={{ fontSize: 19, minWidth: 240 }} onClick={() => begin(resumeAt)}>
                  <IconPlay size={18} /> ממשיכים משקף {resumeAt + 1}
                </button>
                <button className="btn secondary small" onClick={() => begin(0)}><IconRotate size={15} /> מההתחלה</button>
              </div>
            ) : (
              <button className="btn star play-big" onClick={() => begin(0)} aria-label="מתחילים">
                <IconPlay size={44} />
              </button>
            )}
            <div style={{ marginTop: 18 }}>
              <button className="pill" onClick={() => nav('/map')}><IconHome size={15} /> למפה</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <UnitPlayer
      unit={unit} session={session} startIdx={idx}
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

function UnitPlayer({ unit, session, startIdx, onExit, onComplete }: {
  unit: UnitContent; session: StudentSession; startIdx: number; onExit: () => void; onComplete: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [active, setActive] = useState(false);
  const [assist, setAssist] = useState<Assist | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const total = unit.slides.length;
  const slide = unit.slides[idx];
  const stats = useRef({ correct: 0, wrong: 0, skills: {} as Record<string, SkillStat>, t0: Date.now(), finished: false, touched: false });
  const finishing = useRef(false);

  useEffect(() => onVoiceState(setSpeaking), []);

  const { instructions, feedback } = useMemo(() => slideAssist(slide.kind, slide.content), [slide]);

  // תחילת שקף: הוראות (חלון אם יש טקסט / חובה, אחרת שמע בלבד) ← משחק
  useEffect(() => {
    stats.current = { correct: 0, wrong: 0, skills: {}, t0: Date.now(), finished: false, touched: false };
    finishing.current = false;
    setActive(false);
    preloadAudio(collectAudio(unit, idx + 1));
    reportPosition(session, unit.id, idx, total).catch(() => {});
    const always = slide.kind === 'findAnswer';
    if (hasContent(instructions) || always) {
      const a: Instructions = hasContent(instructions) ? instructions : { text: '1, 2, 3 Go!', audio: null };
      openAssist({ a, type: 'instructions', always });
    } else {
      setActive(true);
    }
    return () => stopVoice();
  }, [idx]);

  const openAssist = (as: Assist) => {
    setAssist(as);
    const popup = !!as.a.text || as.always;
    playVoice(as.a.audio?.id).then(() => {
      if (!popup) closeAssist(as);
    });
  };

  const closeAssist = (as: Assist) => {
    stopVoice();
    setAssist(null);
    if (as.type === 'instructions') setActive(true);
    else goNext(true);
  };

  const sendResult = (finished: boolean, nextIdx: number) => {
    const s = stats.current;
    if (!SCORED_KINDS.has(slide.kind) || (!s.touched && !finished)) return;
    reportResult(session, {
      unitId: unit.id, slide: idx, kind: slide.kind,
      correct: s.correct, wrong: s.wrong, seconds: Math.round((Date.now() - s.t0) / 1000),
      skills: s.skills, next: nextIdx, total,
    }).catch(() => {});
  };

  const goNext = useCallback((finished = false) => {
    stopVoice();
    sendResult(finished || stats.current.finished, idx + 1);
    if (idx + 1 >= total) {
      reportPosition(session, unit.id, total, total).catch(() => {});
      onComplete();
    } else {
      setIdx(idx + 1);
    }
  }, [idx, total]);

  const goPrev = () => {
    if (idx === 0) return;
    stopVoice();
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
        <div className="player-progress" title={`שקף ${idx + 1} מתוך ${total}`}>
          <div style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
        <span className="player-count">{idx + 1}/{total}</span>
        {hasContent(instructions) && (
          <button className={`icon-btn${speaking ? ' speaking' : ''}`} aria-label="שמיעת ההוראות שוב" title="שמיעת ההוראות שוב"
            onClick={() => openAssist({ a: instructions, type: 'instructions', always: slide.kind === 'findAnswer' })}>
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
          <div className="assist-backdrop">
            {(assist.a.text || assist.always) && (
              <div className="assist-bubble pop-in" dir="auto">
                <p>{assist.a.text || '1, 2, 3 Go!'}</p>
                <div className="assist-actions">
                  {assist.a.audio && (
                    <button className="btn secondary small" onClick={() => playVoice(assist.a.audio!.id)}><IconRefresh size={15} /> שוב</button>
                  )}
                  <button className="btn star small" onClick={() => closeAssist(assist)}><IconCheck size={16} /> הבנתי</button>
                </div>
              </div>
            )}
            {!assist.a.text && !assist.always && (
              <div className="assist-listening"><IconVolume size={30} /></div>
            )}
          </div>
        )}

        <button className="nav-arrow prev" onClick={goPrev} disabled={idx === 0} aria-label="הקודם"><IconChevronLeft size={30} /></button>
        <button className="nav-arrow next" onClick={() => goNext(false)} aria-label="הבא"><IconChevronRight size={30} /></button>
      </div>
    </div>
  );
}

function SlideBody({ kind, c }: { kind: string; c: any }) {
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

function UnitDone({ unit, nextUnit }: { unit: UnitContent; nextUnit?: UnitMeta }) {
  useEffect(() => {
    playWin();
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#f5b82e', '#ffe08a', '#8ea2ff', '#ffffff'] });
  }, []);
  return (
    <div className="night-sky">
      <SkyStars seed={unit.n + 40} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card pop-in" style={{ textAlign: 'center', color: 'var(--ink)', maxWidth: 420, width: '100%' }}>
          <DrawnStar size={96} />
          <h2 style={{ fontSize: 28, margin: '6px 0' }}>כל הכבוד!</h2>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 18px' }}>
            סיימתם את תחנה {unit.n} — <span dir="ltr" style={{ fontFamily: "'Fredoka One', sans-serif" }}>{unit.title}</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {nextUnit && (
              <button className="btn star" style={{ minWidth: 240 }} onClick={() => nav(`/unit/${nextUnit.id}`)}>
                <IconPlay size={17} /> לתחנה {nextUnit.n}: <span dir="ltr">{nextUnit.title}</span>
              </button>
            )}
            <button className="btn secondary" onClick={() => nav('/map')}><IconHome size={17} /> למפת הכוכבים</button>
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

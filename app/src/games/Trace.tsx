import React, { useEffect, useRef, useState } from 'react';
import { Backgrounds } from '../engine/Stage';
import { usePlay } from '../engine/play';
import { playVoice, stopVoice, playWin } from '../lib/audio';
import { loadStrokes, loadTraceFont, type GlyphStrokes } from '../data/strokes';
import TraceBox, { type TraceBoxHandle } from '../ui/TraceBox';
import { IconPlay, IconVolume, IconEraser } from '../ui/icons';

// שקף TRACING: אחרי שקף ההיכרות עם האות — כותבים את האות הגדולה ואז את הקטנה,
// על קווי מחברת, לפי המסלול שהוקלט בעורך. הצליל של האות חוזר תוך כדי כתיבה.

export interface TraceContent {
  letter: string;              // האות הגדולה, למשל "C"
  sound?: { id: string; lib: string } | null;
  base: { theme: string; backgrounds?: { layer_1: unknown; layer_2: unknown }; instructions: null; feedback: null };
}

const Q_FIRST = 1, Q_RETRY = 0.75;

export default function Trace({ c }: { c: TraceContent }) {
  const play = usePlay();
  const glyphs = [c.letter.toUpperCase(), c.letter.toLowerCase()];
  const [ready, setReady] = useState(false);
  const [strokes, setStrokes] = useState<Record<string, GlyphStrokes>>({});
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const q = useRef<number[]>([]);
  const boxes = [useRef<TraceBoxHandle>(null), useRef<TraceBoxHandle>(null)];

  useEffect(() => {
    let alive = true;
    Promise.all([loadTraceFont(), loadStrokes()]).then(([, map]) => {
      if (!alive) return;
      setStrokes(map as Record<string, GlyphStrokes>);
      setReady(true);
    });
    return () => { alive = false; stopVoice(); };
  }, []);

  // פתיחה: שומעים את הצליל פעם אחת
  useEffect(() => {
    if (play.active && ready && c.sound) playVoice(c.sound.id);
  }, [play.active, ready]);

  const done = (i: number, firstTry: boolean) => {
    q.current[i] = firstTry ? Q_FIRST : Q_RETRY;
    play.progress((q.current[0] ?? 0) / 2 + (q.current[1] ?? 0) / 2);
    if (i === 0) setTimeout(() => setStep(1), 700);
    else {
      setStep(2);
      setTimeout(() => { playWin(); play.finish(); }, 1100);
    }
  };

  const cur = Math.min(step, 1);
  return (
    <>
      <Backgrounds theme={c.base.theme} layers={[null, null]} />
      <div className="trace-slide">
        <h2 className="trace-title" dir="rtl">
          כותבים את האות <b dir="ltr">{glyphs[0]} {glyphs[1]}</b>
        </h2>
        <div className="trace-row">
          {glyphs.map((g, i) => (
            <div key={g} className="trace-col">
              {ready && (
                <TraceBox
                  ref={boxes[i]}
                  glyph={g}
                  strokes={strokes[g] ?? null}
                  enabled={play.active && step === i}
                  done={step > i}
                  sound={c.sound?.id}
                  onDone={(ft) => done(i, ft)}
                  onHint={setHint}
                />
              )}
              <div className="trace-label" dir="rtl">{i === 0 ? 'אות גדולה' : 'אות קטנה'}</div>
            </div>
          ))}
        </div>
        <div className="trace-hint" dir="rtl">{hint ?? (step < 2 ? 'מתחילים מהנקודה הירוקה וכותבים על האות' : 'כל הכבוד!')}</div>
        <div className="trace-actions" dir="rtl">
          <button className="pill" onClick={() => boxes[cur].current?.demo()} disabled={step > 1}><IconPlay size={30} /> איך כותבים?</button>
          {c.sound && <button className="pill" onClick={() => playVoice(c.sound!.id)}><IconVolume size={30} /> הצליל</button>}
          <button className="pill" onClick={() => boxes[cur].current?.clear()} disabled={step > 1}><IconEraser size={30} /> מוחקים</button>
        </div>
      </div>
    </>
  );
}

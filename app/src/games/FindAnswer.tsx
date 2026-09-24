import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FindAnswerContent } from '../engine/types';
import { Backgrounds, Stickers, TraceLayer, type TraceLook } from '../engine/Stage';
import { usePlay, shuffle, wait } from '../engine/play';
import { playVoice, stopVoice, playPositive, playNegative } from '../lib/audio';
import { TraceBubble } from './TappingBoard';
import { Q } from '../data/stars';

// מצא את התשובה: לכל שאלה אזורים נכונים (Correct) — צריך לגעת בכולם.
// נגיעה מחוץ לאזורים / באזור Wrong = טעות. אחרי n טעויות — רמז קצר.

export default function FindAnswer({ c }: { c: FindAnswerContent }) {
  const play = usePlay();
  const questions = useMemo(() => (c.play_settings.ordering === 'Randomize' ? shuffle(c.questions) : c.questions), [c]);
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);       // בזמן שמע שאלה / משוב — לא מקבלים נגיעות
  const [bubble, setBubble] = useState<{ i: number; text: string; key: number } | null>(null);
  const [shake, setShake] = useState(0);
  const wrongStreak = useRef(0);
  const failedThisQ = useRef(0);
  const ended = useRef(false);
  const hinted = useRef(false);
  const scores = useRef<number[]>([]); // איכות לכל שאלה (לכוכבים)
  const q = questions[qi];

  const textIdx = typeof c.question_field === 'object' && c.question_field && 'Text' in c.question_field ? (c.question_field as { Text: number }).Text : null;

  // תחילת שאלה: מנגנים את שמע השאלה (חוסם עד הסוף)
  useEffect(() => {
    if (!play.active || !q) return;
    let alive = true;
    ended.current = false;
    failedThisQ.current = 0;
    wrongStreak.current = 0;
    hinted.current = false;
    setSelected(new Set());
    if (q.question_audio) {
      setBusy(true);
      playVoice(q.question_audio.id).then(() => alive && setBusy(false));
    }
    return () => { alive = false; };
  }, [qi, play.active]);

  useEffect(() => () => stopVoice(), []);

  const correctIdx = q ? q.traces.map((t, i) => (t.kind === 'Correct' ? i : -1)).filter((i) => i >= 0) : [];

  const advance = () => {
    if (qi + 1 < questions.length) { setBubble(null); setQi(qi + 1); }
    else play.finish();
  };

  const wrong = async (traceIdx: number | null) => {
    // שליטה = ניסיון ראשון: טעות נרשמת פעם אחת לשאלה
    if (failedThisQ.current === 0) play.record(false, q.question_text);
    failedThisQ.current++;
    wrongStreak.current++;
    setShake((s) => s + 1);
    stopVoice();
    await playNegative();
    const t = traceIdx !== null ? q.traces[traceIdx] : null;
    if (t?.audio) await playVoice(t.audio.id);
    else if (q.incorrect_audio) await playVoice(q.incorrect_audio.id);
    setSelected((s) => new Set([...s].filter((i) => q.traces[i]?.kind === 'Correct')));
    const limit = c.play_settings.n_attempts ?? null;
    if (limit && wrongStreak.current >= limit) {
      wrongStreak.current = 0;
      hinted.current = true; // המערכת גילתה — השאלה שווה פחות בכוכבים
      setHint(true);
      await wait(1400);
      setHint(false);
    }
  };

  const tap = async (i: number) => {
    if (!play.active || busy || ended.current) return;
    const t = q.traces[i];
    if (t.kind === 'Wrong') { if (t.audio || q.incorrect_audio) setSelected((s) => new Set(s).add(i)); await wrong(i); return; }
    if (t.kind !== 'Correct') { stopVoice(); setSelected((s) => new Set(s).add(i)); return; }
    if (selected.has(i)) return;
    const next = new Set(selected).add(i);
    setSelected(next);
    wrongStreak.current = 0;
    const done = correctIdx.every((k) => next.has(k));
    if (done) ended.current = true;
    // כמו ב-Jigzi: נגיעה חדשה קוטעת את ההקלטה הקודמת (לא חוסמים), רק האחרונה מקדמת
    if (failedThisQ.current === 0 && done) play.record(true, q.question_text);
    const factor = hinted.current ? Q.hinted : failedThisQ.current ? Q.retry : Q.first;
    scores.current[qi] = (correctIdx.filter((k) => next.has(k)).length / Math.max(1, correctIdx.length)) * factor;
    play.progress(scores.current.reduce((a, b) => a + (b ?? 0), 0) / questions.length);
    stopVoice();
    await playPositive();
    if (t.audio) {
      if (t.text) setBubble({ i, text: t.text, key: Date.now() });
      await playVoice(t.audio.id);
    } else if (q.correct_audio) {
      await playVoice(q.correct_audio.id);
    } else if (t.text) {
      setBubble({ i, text: t.text, key: Date.now() });
    }
    if (done) advance();
  };

  if (!q) return null;
  const overrides = textIdx !== null ? { [textIdx]: q.question_text || ' ' } : undefined;
  const look = (i: number): TraceLook => (selected.has(i) ? (q.traces[i].kind === 'Correct' ? 'correct' : q.traces[i].kind === 'Wrong' ? 'wrong' : 'selected') : 'hidden');

  return (
    <div
      className="stage-fill"
      onPointerDown={(e) => {
        if (!play.active || busy || ended.current) return;
        const tag = (e.target as Element).tagName.toLowerCase();
        if (['rect', 'ellipse', 'path'].includes(tag)) return;
        wrong(null);
      }}
    >
      <Backgrounds theme={c.base.theme} layers={[c.base.backgrounds.layer_1, c.base.backgrounds.layer_2]} />
      <Stickers list={c.base.stickers} textOverrides={overrides} />
      {textIdx === null && q.question_text && play.active && <div className="question-banner" dir="auto">{q.question_text}</div>}
      <TraceLayer
        key={qi}
        traces={q.traces}
        look={look}
        onTap={play.active ? tap : undefined}
        cutout={hint ? correctIdx : undefined}
        className={shake ? `shake-${shake % 2}` : undefined}
      />
      {bubble && <TraceBubble key={bubble.key} trace={q.traces[bubble.i]} text={bubble.text} />}
      {questions.length > 1 && (
        <div className="q-dots">
          {questions.map((_, i) => <span key={i} className={i < qi ? 'done' : i === qi ? 'cur' : ''} />)}
        </div>
      )}
    </div>
  );
}

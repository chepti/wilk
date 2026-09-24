import React, { useEffect, useRef, useState } from 'react';
import type { TappingBoardContent, Trace } from '../engine/types';
import { Backgrounds, Stickers, TraceLayer, traceCenter } from '../engine/Stage';
import { usePlay, wait } from '../engine/play';
import { playVoice, stopVoice } from '../lib/audio';

// הקשה ושמיעה: כל אזור מנגן את ההקלטה שלו (ובועת טקסט אם יש). אין ניקוד.

export default function TappingBoard({ c }: { c: TappingBoardContent }) {
  const play = usePlay();
  const [current, setCurrent] = useState<number | null>(null);
  const [bubble, setBubble] = useState<{ i: number; text: string; key: number } | null>(null);
  const [hint, setHint] = useState(c.play_settings.hint === 'Highlight');
  const selected = useRef(new Set<number>());
  const token = useRef(0);
  const finished = useRef(false);
  const next = c.play_settings.next;

  // רמז: מסכה כהה עם חורים סביב כל האזורים ל-3 שניות
  useEffect(() => {
    if (!hint || !play.active) return;
    const t = setTimeout(() => setHint(false), 3000);
    return () => clearTimeout(t);
  }, [hint, play.active]);

  useEffect(() => () => stopVoice(), []);

  const evaluateEnd = () => {
    if (finished.current) return;
    const need = typeof next === 'object' && next && 'SelectSome' in next ? (next as { SelectSome: number }).SelectSome : c.traces.length;
    if ((next === 'SelectAll' || typeof next === 'object') && selected.current.size >= need) {
      finished.current = true;
      play.finish();
    }
  };

  const tap = async (i: number) => {
    if (!play.active || hint) return;
    const t: Trace = c.traces[i];
    const my = ++token.current;
    stopVoice();
    selected.current.add(i); // חשיפה, לא מבחן — לא נרשם כשליטה
    setCurrent(i);
    if (!t.audio && !t.text) return; // נשאר מסומן עד ההקשה הבאה
    if (t.text) setBubble({ i, text: t.text, key: my });
    if (t.audio) await playVoice(t.audio.id);
    else await wait(6000);
    if (token.current !== my) return;
    setCurrent(null);
    evaluateEnd();
  };

  return (
    <>
      <Backgrounds theme={c.base.theme} layers={[c.base.backgrounds.layer_1, c.base.backgrounds.layer_2]} />
      <Stickers list={c.base.stickers} />
      <TraceLayer
        traces={c.traces}
        look={(i) => (i === current ? 'selected' : 'hidden')}
        onTap={play.active && !hint ? tap : undefined}
        cutout={hint && play.active ? c.traces.map((_, i) => i) : undefined}
      />
      {bubble && <TraceBubble key={bubble.key} trace={c.traces[bubble.i]} text={bubble.text} />}
    </>
  );
}

/** בועת טקסט מתחת לאזור, נמוגה במשך 6 שניות */
export function TraceBubble({ trace, text }: { trace: Trace; text: string }) {
  const { x, y, h } = traceCenter(trace);
  return (
    <div className="trace-bubble" style={{ left: x, top: y + h / 2 + 18 }} dir="auto">
      {text}
    </div>
  );
}

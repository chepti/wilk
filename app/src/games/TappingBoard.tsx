import React, { useEffect, useRef, useState } from 'react';
import type { TappingBoardContent, Trace } from '../engine/types';
import { Backgrounds, Stickers, TraceLayer, traceCenter } from '../engine/Stage';
import { usePlay, wait } from '../engine/play';
import { playVoice, stopVoice } from '../lib/audio';
import { IconCheck, IconVolume, IconMove } from '../ui/icons';

// הקשה ושמיעה: כל אזור מנגן את ההקלטה שלו (ובועת טקסט אם יש). אין ניקוד.

export default function TappingBoard({ c, free = false }: { c: TappingBoardContent; free?: boolean }) {
  const play = usePlay();
  const [current, setCurrent] = useState<number | null>(null);
  const [bubble, setBubble] = useState<{ i: number; text: string; key: number } | null>(null);
  const [hint, setHint] = useState(c.play_settings.hint === 'Highlight');
  const selected = useRef(new Set<number>());
  const [heard, setHeard] = useState(0); // לסימונים ולמונה
  const total = c.traces.length;
  const guide = !free && total >= 1; // סימונים רק בשקף שהוא משימה (לא בשקף פרידה)

  // מה עוד חסר — לתזכורת כשלוחצים "הבא"
  useEffect(() => {
    if (!guide) return;
    const left = total - heard;
    play.pending(left > 0 ? `עוד ${left === 1 ? 'מקום אחד' : `${left} מקומות`} ללחוץ ולשמוע — הרמקולים הכחולים מראים איפה.` : null);
  }, [heard, guide]);
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
    setHeard(selected.current.size);
    play.progress(selected.current.size / c.traces.length); // כוכבים: צריך ללחוץ על כל הפריטים
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
      {guide && play.active && !hint && (
        <>
          {c.traces.map((t, i) => <TapBadge key={i} trace={t} done={selected.current.has(i)} small={total > 8} />)}
          {total >= 2 && <StageCounter done={heard} total={total} label="נשמעו" />}
        </>
      )}
    </>
  );
}

/** סימון על אזור לחיץ: רמקול מהבהב = עוד לא נשמע, וי = נשמע. לא תופס לחיצות */
function TapBadge({ trace, done, small }: { trace: Trace; done: boolean; small: boolean }) {
  const { x, y, w, h } = traceCenter(trace);
  const size = small ? 34 : 46;
  return (
    <div
      className={`tap-badge${done ? ' done' : ''}`}
      style={{ left: x + w / 2 - size * 0.6, top: y - h / 2 - size * 0.4, width: size, height: size }}
      aria-hidden
    >
      {done ? <IconCheck size={size * 0.55} strokeWidth={3} /> : <IconVolume size={size * 0.55} />}
    </div>
  );
}

/** מונה בפינת הבמה: "נשמעו 2 מתוך 5" */
export function StageCounter({ done, total, label, icon = 'volume' }: { done: number; total: number; label: string; icon?: 'volume' | 'move' }) {
  const all = done >= total;
  return (
    <div className={`stage-counter${all ? ' all' : ''}`} dir="rtl">
      {all ? <IconCheck size={30} strokeWidth={3} /> : icon === 'move' ? <IconMove size={28} /> : <IconVolume size={28} />}
      <span>{label} {done} מתוך {total}</span>
    </div>
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

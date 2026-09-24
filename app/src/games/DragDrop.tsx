import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DragDropContent, Transform } from '../engine/types';
import { Backgrounds, SpriteView, TextView, TraceLayer, spriteBox, useStage, angle, W, H, richPlainText } from '../engine/Stage';
import { hitIndex } from '../engine/geometry';
import { usePlay, wait } from '../engine/play';
import { Q } from '../data/stars';
import { playVoice, stopVoice, playPositive, playDropCorrect, playDropWrong } from '../lib/audio';

// גרירה: פריטים Interactive נגררים לאזורי יעד. נכונות נקבעת רק לפי item_targets.

const NONE = 16777215;
const DRAG_THRESHOLD = 20;

export default function DragDrop({ c }: { c: DragDropContent }) {
  const play = usePlay();
  const { toStage, sizes } = useStage();
  const traces = c.target_areas.map((a) => a.trace);
  const targets = useMemo(() => c.item_targets.filter((t) => t.trace_idx !== null && t.trace_idx !== NONE && t.trace_idx < traces.length), [c]);
  const interactive = c.items.map((it) => typeof it.kind === 'object' && 'Interactive' in it.kind);
  const required = c.items.map((_, i) => interactive[i] && targets.some((t) => t.sticker_idx === i));

  const [pos, setPos] = useState<Record<number, [number, number]>>({});   // תזוזה נוכחית (מנורמלת)
  const [done, setDone] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState<number | null>(null);
  const [hint, setHint] = useState(c.play_settings.hint === 'Highlight');
  const failed = useRef<Record<number, number>>({});
  const textEls = useRef<Record<number, HTMLDivElement | null>>({});
  const drag = useRef<{ i: number; sx: number; sy: number; ox: number; oy: number; moved: boolean; px: number; py: number } | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!hint || !play.active) return;
    const t = setTimeout(() => setHint(false), 900);
    return () => clearTimeout(t);
  }, [hint, play.active]);
  useEffect(() => () => stopVoice(), []);

  const baseT = (i: number): Transform => {
    const st = c.items[i].sticker;
    return ('Sprite' in st ? st.Sprite.transform : 'Text' in st ? st.Text.transform : (st as { Embed: { transform: Transform } }).Embed.transform);
  };
  const cur = (i: number): [number, number] => pos[i] ?? [baseT(i).translation[0], baseT(i).translation[1]];

  const itemText = (i: number) => {
    const st = c.items[i].sticker;
    return 'Text' in st ? richPlainText(st.Text.value) : null;
  };

  const onDown = (i: number) => (e: React.PointerEvent) => {
    if (!play.active || hint || done.has(i) || !interactive[i]) return;
    e.preventDefault();
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* */ }
    const [x, y] = toStage(e.clientX, e.clientY);
    const [ox, oy] = cur(i);
    drag.current = { i, sx: x, sy: y, ox, oy, moved: false, px: e.clientX, py: e.clientY };
    setDragging(i);
    const k = c.items[i].kind as { Interactive: { audio: { id: string } | null } };
    if (k.Interactive.audio) playVoice(k.Interactive.audio.id);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.px, e.clientY - d.py) < DRAG_THRESHOLD) return;
    d.moved = true;
    const [x, y] = toStage(e.clientX, e.clientY);
    setPos((p) => ({ ...p, [d.i]: [d.ox + (x - d.sx) / W, d.oy + (y - d.sy) / H] }));
  };

  const onUp = async () => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (!d || !d.moved) return;
    const i = d.i;
    const [tx, ty] = cur(i);
    const st = c.items[i].sticker;
    let box;
    if ('Sprite' in st) {
      const b = spriteBox(st.Sprite, sizes);
      box = { cx: W / 2 + tx * W, cy: H / 2 + ty * H, w: b.w * b.sx, h: b.h * b.sy, rot: b.rot };
    } else {
      const el = textEls.current[i];
      box = { cx: W / 2 + tx * W, cy: H / 2 + ty * H, w: el?.offsetWidth ?? 200, h: el?.offsetHeight ?? 100, rot: angle(baseT(i)) };
    }
    const hit = hitIndex(traces, box);
    const match = hit >= 0 && targets.find((t) => t.sticker_idx === i && t.trace_idx === hit);
    if (!match) {
      setPos((p) => { const n = { ...p }; delete n[i]; return n; });
      if (!failed.current[i]) play.record(false, itemText(i));
      failed.current[i] = (failed.current[i] ?? 0) + 1;
      playDropWrong();
      return;
    }
    // הצמדה ליעד אם רק פריט אחד שייך לאזור הזה
    const sameTrace = targets.filter((t) => t.trace_idx === hit);
    if (sameTrace.length === 1) setPos((p) => ({ ...p, [i]: [match.transform.translation[0], match.transform.translation[1]] }));
    const nextDone = new Set(done).add(i);
    setDone(nextDone);
    if (!failed.current[i]) play.record(true, itemText(i));
    const req = c.items.map((_, k) => k).filter((k) => required[k]);
    play.progress(req.reduce((s, k) => s + (nextDone.has(k) ? (failed.current[k] ? Q.retry : Q.first) : 0), 0) / Math.max(1, req.length));
    const all = c.items.every((_, k) => !required[k] || nextDone.has(k));
    if (!all) { playDropCorrect(); return; }
    if (finished.current) return;
    finished.current = true;
    await playPositive();
    await wait(200);
    play.finish();
  };

  return (
    <div className="stage-fill" style={{ touchAction: 'none' }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <Backgrounds theme={c.theme} layers={[c.backgrounds.layer_1, c.backgrounds.layer_2]} />
      {c.items.map((it, i) => {
        const st = it.sticker;
        const [tx, ty] = cur(i);
        const draggable = interactive[i] && !done.has(i);
        const cls = `${draggable ? 'draggable' : ''} ${dragging === i ? 'dragging' : ''} ${done.has(i) ? 'landed' : ''}`;
        if ('Sprite' in st) {
          const s = { ...st.Sprite, transform: { ...st.Sprite.transform, translation: [tx, ty, 0] as [number, number, number] } };
          return <SpriteView key={i} s={s} className={cls} onPointerDown={draggable ? onDown(i) : undefined} />;
        }
        if ('Text' in st) {
          const s = { ...st.Text, transform: { ...st.Text.transform, translation: [tx, ty, 0] as [number, number, number] } };
          return (
            <div key={i} ref={(el) => { textEls.current[i] = el?.firstElementChild as HTMLDivElement | null; }} style={{ display: 'contents' }}>
              <TextView s={s} className={cls} onPointerDown={draggable ? onDown(i) : undefined} />
            </div>
          );
        }
        return null;
      })}
      <TraceLayer traces={traces} look={() => 'hidden'} cutout={hint && play.active ? traces.map((_, i) => i) : undefined} />
    </div>
  );
}

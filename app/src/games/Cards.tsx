import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, CardGameContent } from '../engine/types';
import { Backgrounds, useStage, W, H } from '../engine/Stage';
import { cardBack } from '../engine/theme';
import { mediaUrl } from '../lib/mediaPaths';
import { usePlay, shuffle, wait } from '../engine/play';
import { playVoice, stopVoice, playPositive, playNegative, playFlip } from '../lib/audio';
import { Q } from '../data/stars';

// ── קלף משותף ──

type CardSize = 'memory' | 'matching' | 'target' | 'flash';
const SIZE: Record<CardSize, { px: number; border: number; font: number; radius: string }> = {
  memory: { px: 188, border: 3, font: 0.3, radius: '16px' },
  matching: { px: 253, border: 4.75, font: 0.45, radius: '16px' },
  target: { px: 431, border: 4.75, font: 0.8, radius: '16px' },
  flash: { px: 500, border: 16, font: 1, radius: '16%' },
};

const graphemes = (s: string) => [...s].length;
const cardText = (c: Card) => c.card_content.Text ?? '';

function fontPx(len: number, size: CardSize) {
  const s = SIZE[size].font;
  const l = Math.min(10, Math.max(1, len));
  return 200 * s + ((l - 1) * (60 * s - 200 * s)) / 9;
}

export function CardFace({
  card, size, side, mode, faceUp, theme, textLen, effect, style, onClick, onPointerDown, variant,
}: {
  card: Card; size: CardSize; side: 'left' | 'right'; mode: string; faceUp: boolean; theme: string;
  textLen?: number; effect?: 'positive'; style?: React.CSSProperties; variant?: 'dragging';
  onClick?: () => void; onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const S = SIZE[size];
  const txt = cardText(card);
  const font = mode === 'Lettering' ? (side === 'left' ? 'var(--card-font-left)' : 'var(--card-font-right)') : 'var(--card-font)';
  const img = card.card_content.Image;
  return (
    <div
      className={`card3d${faceUp ? ' up' : ''}${effect === 'positive' ? ' positive' : ''}`}
      style={{ width: S.px, height: S.px, ...style }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div className="card3d-inner">
        <div
          className="card-face"
          style={{
            borderRadius: S.radius, borderWidth: S.border,
            borderColor: variant === 'dragging' ? '#1160fb' : 'var(--card-border)',
          }}
        >
          {img ? (
            <img src={mediaUrl(img.id, 'webp')} alt="" draggable={false}
              style={{ width: S.px - (2 * S.border + 10), height: S.px - (2 * S.border + 10), objectFit: 'contain' }} />
          ) : (
            <span dir="auto" style={{ fontFamily: font, fontSize: fontPx(textLen ?? graphemes(txt), size) }}>{txt}</span>
          )}
        </div>
        <div className="card-back" style={{ borderRadius: S.radius }}>
          {cardBack(theme) && <img src={cardBack(theme)!} alt="" draggable={false} />}
        </div>
      </div>
    </div>
  );
}

function CardsBg({ c }: { c: CardGameContent }) {
  return <Backgrounds theme={c.base.theme} layers={[c.base.background]} />;
}

/** חפיסה: מוציאים מטרה, ומשלימים n-1 זוגות אקראיים אחרים */
function useRounds(pairs: [Card, Card][], nChoices: number, nRounds: number) {
  const deck = useRef<number[]>([]);
  return useMemo(() => {
    const rounds: { target: number; choices: number[] }[] = [];
    for (let r = 0; r < nRounds; r++) {
      if (deck.current.length === 0) deck.current = shuffle(pairs.map((_, i) => i));
      const target = deck.current.pop()!;
      const others = shuffle(pairs.map((_, i) => i).filter((i) => i !== target)).slice(0, Math.max(0, Math.min(nChoices, pairs.length) - 1));
      rounds.push({ target, choices: shuffle([target, ...others]) });
    }
    return rounds;
  }, [pairs, nChoices, nRounds]);
}

// ── חידון קלפים ──

export function CardQuiz({ c }: { c: CardGameContent }) {
  const play = usePlay();
  const ps = c.player_settings;
  const pairs = c.base.pairs;
  const rounds = useRounds(pairs, ps.n_choices ?? 3, ps.n_rounds ?? 3);
  const [r, setR] = useState(0);
  const [flippedWrong, setFlippedWrong] = useState<Set<number>>(new Set());
  const [won, setWon] = useState<number | null>(null);
  const failed = useRef(0);
  const roundQ = useRef<number[]>([]); // איכות לכל סבב (לכוכבים)
  const swap = !!ps.swap;
  const round = rounds[r];
  const tSide = swap ? 1 : 0;
  const oSide = swap ? 0 : 1;
  useEffect(() => () => stopVoice(), []);
  useEffect(() => { failed.current = 0; setFlippedWrong(new Set()); setWon(null); }, [r]);
  if (!round) return <CardsBg c={c} />;

  const target = pairs[round.target][tSide];
  const optLen = Math.max(...round.choices.map((i) => graphemes(cardText(pairs[i][oSide]))));

  const pick = async (i: number) => {
    if (!play.active || won !== null) return;
    const card = pairs[i][oSide];
    if (i === round.target) {
      setWon(i);
      if (failed.current === 0) play.record(true, cardText(pairs[i][0]) || cardText(pairs[i][1]));
      roundQ.current[r] = failed.current ? Q.retry : Q.first;
      play.progress(roundQ.current.reduce((a, b) => a + (b ?? 0), 0) / rounds.length);
      if (card.audio) await playVoice(card.audio.id);
      await playPositive();
      await wait(1600);
      if (r + 1 < rounds.length) setR(r + 1);
      else play.finish();
    } else {
      if (failed.current === 0) play.record(false, cardText(pairs[round.target][0]) || cardText(pairs[round.target][1]));
      failed.current++;
      setFlippedWrong((s) => new Set(s).add(i));
      await playNegative();
      if (card.audio) await playVoice(card.audio.id);
    }
  };

  return (
    <>
      <CardsBg c={c} />
      <div className="cards-col" style={{ gap: 105 }}>
        <CardFace card={target} size="target" side={swap ? 'right' : 'left'} mode={c.base.mode} faceUp theme={c.base.theme}
          onClick={() => target.audio && playVoice(target.audio.id)} />
        <div className="cards-row" style={{ gap: 80 }}>
          {round.choices.map((i) => (
            <CardFace
              key={`${r}-${i}`} card={pairs[i][oSide]} size="matching" side={swap ? 'left' : 'right'} mode={c.base.mode}
              theme={c.base.theme} textLen={optLen}
              faceUp={won === null ? !flippedWrong.has(i) : won === i}
              effect={won === i ? 'positive' : undefined}
              onClick={() => pick(i)}
            />
          ))}
        </div>
      </div>
      <RoundDots n={rounds.length} i={r} />
    </>
  );
}

// ── התאמה (גרירה לחריץ) ──

export function Matching({ c }: { c: CardGameContent }) {
  const play = usePlay();
  const { toStage } = useStage();
  const ps = c.player_settings;
  const pairs = c.base.pairs;
  const rounds = useRounds(pairs, ps.n_choices ?? 3, ps.n_rounds ?? 1);
  const [r, setR] = useState(0);
  const [landed, setLanded] = useState<Set<number>>(new Set());
  const [bottom, setBottom] = useState<number[]>([]);
  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const slotEls = useRef<Record<number, HTMLDivElement | null>>({});
  const tries = useRef<Record<number, number>>({});
  const matchQ = useRef<Record<string, number>>({}); // "סבב:זוג" → איכות
  const swap = !!ps.swap;
  const top = swap ? 1 : 0;
  const bot = swap ? 0 : 1;
  const round = rounds[r];

  useEffect(() => { if (round) { setBottom(shuffle(round.choices)); setLanded(new Set()); tries.current = {}; } }, [r]);
  useEffect(() => () => stopVoice(), []);
  if (!round) return <CardsBg c={c} />;

  const topLen = Math.max(...round.choices.map((i) => graphemes(cardText(pairs[i][top]))));
  const botLen = Math.max(...round.choices.map((i) => graphemes(cardText(pairs[i][bot]))));

  const slotAt = (x: number, y: number): number | null => {
    const half = SIZE.matching.px / 2;
    for (const i of round.choices) {
      const el = slotEls.current[i];
      if (!el || landed.has(i)) continue;
      const b = el.getBoundingClientRect();
      const [l, t] = toStage(b.left, b.top);
      const [rr, bb] = toStage(b.right, b.bottom);
      // חפיפה בין הקלף הנגרר (מרכזו בנקודה) לחריץ
      if (x + half > l && x - half < rr && y + half > t && y - half < bb) return i;
    }
    return null;
  };

  const down = (i: number) => (e: React.PointerEvent) => {
    if (!play.active) return;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* */ }
    const [x, y] = toStage(e.clientX, e.clientY);
    setDrag({ i, x, y });
    const a = pairs[i][bot].audio;
    if (a) playVoice(a.id);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const [x, y] = toStage(e.clientX, e.clientY);
    setDrag({ ...drag, x, y });
    setOver(slotAt(x, y));
  };
  const up = async () => {
    if (!drag) return;
    const { i, x, y } = drag;
    setDrag(null);
    setOver(null);
    const slot = slotAt(x, y);
    if (slot === null) return;
    const word = cardText(pairs[i][0]) || cardText(pairs[i][1]);
    if (slot !== i) {
      if (!tries.current[i]) play.record(false, word);
      tries.current[i] = (tries.current[i] ?? 0) + 1;
      playNegative();
      return;
    }
    if (!tries.current[i]) play.record(true, word);
    matchQ.current[`${r}:${i}`] = tries.current[i] ? Q.retry : Q.first;
    const allItems = rounds.reduce((s, rd) => s + rd.choices.length, 0);
    play.progress(Object.values(matchQ.current).reduce((a, b) => a + b, 0) / Math.max(1, allItems));
    const next = new Set(landed).add(i);
    setLanded(next);
    await playPositive();
    if (round.choices.every((k) => next.has(k))) {
      await wait(500);
      if (r + 1 < rounds.length) setR(r + 1);
      else play.finish();
    }
  };

  return (
    <div className="stage-fill" style={{ touchAction: 'none' }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <CardsBg c={c} />
      <div className="cards-col" style={{ justifyContent: 'flex-start', paddingTop: 38, gap: 38 }}>
        <div className="cards-row" style={{ gap: 64, alignItems: 'flex-start' }}>
          {round.choices.map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CardFace card={pairs[i][top]} size="matching" side={swap ? 'right' : 'left'} mode={c.base.mode} faceUp theme={c.base.theme}
                textLen={topLen} onClick={() => pairs[i][top].audio && playVoice(pairs[i][top].audio!.id)} />
              <div ref={(el) => { slotEls.current[i] = el; }}>
                {landed.has(i)
                  ? <CardFace card={pairs[i][bot]} size="matching" side={swap ? 'left' : 'right'} mode={c.base.mode} faceUp theme={c.base.theme} textLen={botLen} effect="positive" />
                  : <div className={`card-slot${over === i ? ' over' : ''}`} style={{ width: SIZE.matching.px, height: SIZE.matching.px }}>?</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="cards-row" style={{ gap: 38 }}>
          {bottom.map((i) => landed.has(i) ? null : drag?.i === i
            ? <div key={i} className="card-hole" style={{ width: SIZE.matching.px, height: SIZE.matching.px }} />
            : <CardFace key={i} card={pairs[i][bot]} size="matching" side={swap ? 'left' : 'right'} mode={c.base.mode} faceUp theme={c.base.theme}
                textLen={botLen} onPointerDown={down(i)} style={{ cursor: 'grab', touchAction: 'none' }} />)}
        </div>
      </div>
      {drag && (
        <CardFace card={pairs[drag.i][bot]} size="matching" side={swap ? 'left' : 'right'} mode={c.base.mode} faceUp theme={c.base.theme}
          textLen={botLen} variant="dragging"
          style={{ position: 'absolute', left: drag.x - SIZE.matching.px / 2, top: drag.y - SIZE.matching.px / 2, pointerEvents: 'none', zIndex: 20 }} />
      )}
      <RoundDots n={rounds.length} i={r} />
    </div>
  );
}

// ── זיכרון ──

export function Memory({ c }: { c: CardGameContent }) {
  const play = usePlay();
  const cards = useMemo(() => {
    const n = Math.min(14, c.player_settings.pairs_to_display ?? c.base.pairs.length);
    const chosen = shuffle(c.base.pairs.map((_, i) => i)).slice(0, n);
    return shuffle(chosen.flatMap((p) => [{ p, side: 0 as const }, { p, side: 1 as const }]));
  }, [c]);
  const [up, setUp] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]); // מזהי זוגות, לפי סדר המציאה
  const lock = useRef(false);
  useEffect(() => () => stopVoice(), []);

  const count = cards.length;
  const cols = count === 6 ? 3 : count < 17 ? 4 : count < 21 ? 5 : count < 25 ? 6 : 7;

  const click = async (k: number) => {
    if (!play.active || lock.current || up.includes(k) || found.includes(cards[k].p)) return;
    const card = c.base.pairs[cards[k].p][cards[k].side];
    if (up.length === 0) {
      setUp([k]);
      await playFlip();
      if (card.audio) playVoice(card.audio.id);
      return;
    }
    const first = up[0];
    setUp([first, k]);
    lock.current = true;
    if (card.audio) await playVoice(card.audio.id);
    const pair = c.base.pairs[cards[k].p];
    const word = cardText(pair[0]) || cardText(pair[1]);
    if (cards[first].p === cards[k].p) {
      play.record(true, word);
      await playPositive();
      const nf = [...found, cards[k].p];
      setFound(nf);
      play.progress(nf.length / (count / 2));
      setUp([]);
      lock.current = false;
      if (nf.length * 2 >= count) { await wait(900); play.finish(); }
    } else {
      playNegative();
      await wait(2000);
      setUp([]);
      lock.current = false;
    }
  };

  return (
    <>
      <CardsBg c={c} />
      <div className="memory-wrap">
        <div className="memory-side">
          {[...found].reverse().map((p) => (
            <div key={p} className="memory-pair float-up">
              <CardFace card={c.base.pairs[p][0]} size="memory" side="left" mode={c.base.mode} faceUp theme={c.base.theme} style={{ transform: 'scale(0.65)', margin: -33 }} />
              <CardFace card={c.base.pairs[p][1]} size="memory" side="right" mode={c.base.mode} faceUp theme={c.base.theme} style={{ transform: 'scale(0.65)', margin: -33 }} />
            </div>
          ))}
        </div>
        <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${cols}, ${SIZE.memory.px}px)` }}>
          {cards.map((cd, k) => (
            <div key={k} style={{ visibility: found.includes(cd.p) ? 'hidden' : 'visible' }}>
              <CardFace card={c.base.pairs[cd.p][cd.side]} size="memory" side={cd.side === 0 ? 'left' : 'right'} mode={c.base.mode}
                faceUp={up.includes(k)} theme={c.base.theme} onClick={() => click(k)} style={{ cursor: 'pointer' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── כרטיסיות ──

export function Flashcards({ c }: { c: CardGameContent }) {
  const play = usePlay();
  const pairs = c.base.pairs;
  const order = useMemo(() => shuffle(pairs.map((_, i) => i)), [pairs]);
  const total = Math.min(c.player_settings.view_pairs ?? pairs.length, pairs.length);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const token = useRef(0);
  const swap = !!c.player_settings.swap;
  const shownSide = swap ? 0 : 1;
  const hiddenSide = swap ? 1 : 0;
  const pair = pairs[order[i]];

  useEffect(() => {
    if (!play.active || !pair) return;
    setRevealed(false);
    const a = pair[shownSide].audio;
    if (a) playVoice(a.id);
  }, [i, play.active]);
  useEffect(() => () => stopVoice(), []);

  const next = () => {
    token.current++;
    play.progress((i + 1) / total); // כמה כרטיסים נצפו
    if (i + 1 >= total) play.finish();
    else setI(i + 1);
  };

  const flip = async () => {
    if (!play.active || revealed) return;
    const my = ++token.current;
    setRevealed(true);
    await playFlip();
    const a = pair[hiddenSide].audio;
    if (a) await playVoice(a.id);
    await wait(6000);
    if (token.current !== my) return;
    setRevealed(false);
    await wait(1000);
    if (token.current === my) next();
  };

  if (!pair) return <CardsBg c={c} />;
  return (
    <>
      <CardsBg c={c} />
      <div className="cards-col" style={{ gap: 48 }}>
        <div className="cards-row" style={{ gap: 56 }}>
          <CardFace card={pair[shownSide]} size="flash" side={swap ? 'left' : 'right'} mode={c.base.mode} faceUp theme={c.base.theme}
            onClick={() => pair[shownSide].audio && playVoice(pair[shownSide].audio!.id)} style={{ cursor: 'pointer' }} />
          <CardFace card={pair[hiddenSide]} size="flash" side={swap ? 'right' : 'left'} mode={c.base.mode} faceUp={revealed} theme={c.base.theme}
            onClick={flip} style={{ cursor: 'pointer' }} />
        </div>
        <button className="stage-next" onClick={next} aria-label="הבא">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>
      <RoundDots n={total} i={i} />
    </>
  );
}

function RoundDots({ n, i }: { n: number; i: number }) {
  if (n <= 1) return null;
  return <div className="q-dots">{Array.from({ length: n }, (_, k) => <span key={k} className={k < i ? 'done' : k === i ? 'cur' : ''} />)}</div>;
}

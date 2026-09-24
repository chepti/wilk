// שמע: ערוץ "קול" אחד (הוראות, מילים, צלילים — הקלטה חדשה עוצרת את הקודמת)
// וצלילי משוב קצרים (נכון / טעות / ניצחון).

import { mediaUrl } from './mediaPaths';

let voice: HTMLAudioElement | null = null;
let voiceDone: (() => void) | null = null;
const listeners = new Set<(playing: boolean) => void>();

function setPlaying(p: boolean) { listeners.forEach((fn) => fn(p)); }

export function onVoiceState(fn: (playing: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function stopVoice(): void {
  if (voice) {
    voice.onended = null;
    voice.onerror = null;
    voice.pause();
    voice = null;
  }
  const done = voiceDone;
  voiceDone = null;
  done?.();
  setPlaying(false);
}

/** מנגן הקלטה; ההבטחה מתממשת בסיום (או כשהקלטה אחרת קוטעת אותה) */
export function playVoice(id: string | null | undefined): Promise<void> {
  stopVoice();
  if (!id) return Promise.resolve();
  return new Promise((resolve) => {
    const a = new Audio(mediaUrl(id, 'mp3'));
    voice = a;
    voiceDone = resolve;
    const finish = () => {
      if (voice !== a) return;
      voice = null;
      voiceDone = null;
      setPlaying(false);
      resolve();
    };
    a.onended = finish;
    a.onerror = finish;
    setPlaying(true);
    a.play().catch(finish); // חסימת autoplay — ממשיכים בלי קול
  });
}

export function voicePlaying(): boolean {
  return !!voice && !voice.paused;
}

// ── צלילי משוב — מסונתזים ב-WebAudio (שלנו, בלי קבצים ובלי הצלילים של Jigzi) ──

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (typeof AudioContext === 'undefined') return null;
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

/** תו אחד עם מעטפת רכה; freqTo = גלישת גובה */
function tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; freqTo?: number } = {}) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type ?? 'sine';
  const t = a.currentTime + start;
  o.frequency.setValueAtTime(freq, t);
  if (opts.freqTo) o.frequency.exponentialRampToValueAtTime(opts.freqTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** רעש קצר מסונן (הפיכת קלף) */
function swish(start: number, dur: number) {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2200;
  const g = a.createGain();
  g.gain.value = 0.22;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

const done = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** נכון — צלצול כוכבים עולה (שתי גרסאות, לגיוון) */
export function playPositive(): Promise<void> {
  if (Math.random() < 0.5) {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.075, 0.28, { type: 'triangle', gain: 0.16 }));
    tone(2093, 0.3, 0.35, { gain: 0.06 });
  } else {
    tone(880, 0, 0.18, { type: 'triangle', gain: 0.17 });
    tone(1319, 0.1, 0.4, { type: 'triangle', gain: 0.16 });
    tone(2637, 0.14, 0.3, { gain: 0.04 });
  }
  return done(520);
}

/** טעות — "בום" רך ויורד, לא מפחיד */
export function playNegative(): Promise<void> {
  tone(330, 0, 0.22, { type: 'triangle', gain: 0.16, freqTo: 220 });
  tone(247, 0.16, 0.3, { type: 'triangle', gain: 0.14, freqTo: 165 });
  return done(480);
}

/** הפיכת קלף */
export function playFlip(): Promise<void> {
  swish(0, 0.12);
  tone(660, 0.02, 0.06, { gain: 0.05 });
  return done(160);
}

/** הנחה נכונה בגרירה — "פופ" */
export function playDropCorrect(): Promise<void> {
  tone(520, 0, 0.12, { gain: 0.18, freqTo: 1040 });
  return done(160);
}

/** הנחה לא נכונה — חבטה קטנה */
export function playDropWrong(): Promise<void> {
  tone(180, 0, 0.16, { type: 'triangle', gain: 0.18, freqTo: 110 });
  return done(200);
}

/** סיום תחנה — פנפרה קצרה */
export function playWin(): Promise<void> {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.32, { type: 'triangle', gain: 0.16 }));
  tone(1319, 0.5, 0.6, { gain: 0.1 });
  tone(1568, 0.5, 0.6, { gain: 0.07 });
  return done(1100);
}

/** טעינה מוקדמת של הקלטות היחידה, כדי שלא יהיה עיכוב בלחיצה */
export function preloadAudio(ids: string[]): void {
  for (const id of ids.slice(0, 120)) {
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = mediaUrl(id, 'mp3');
    document.head.appendChild(l);
  }
}

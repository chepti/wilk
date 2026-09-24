// שמע: ערוץ "קול" אחד (הוראות, מילים, צלילים — הקלטה חדשה עוצרת את הקודמת)
// וצלילי משוב קצרים (נכון / טעות / ניצחון).

import { mediaUrl, BASE_EFFECTS } from './mediaPaths';

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

// ── צלילי משוב — ברירות המחדל של Jigzi (כשלג'יג אין רשימה משלו) ──

const effects: Record<string, HTMLAudioElement[]> = {};
const POSITIVE = ['pos1', 'pos2'];          // voice-yippee, xylophone
const NEGATIVE = ['neg1', 'neg2', 'neg3'];  // boing, buzz, jump-wrong

/** מנגן אפקט; ההבטחה מתממשת בסיומו */
function effect(name: string, volume = 0.7): Promise<void> {
  return new Promise((resolve) => {
    try {
      const pool = (effects[name] ??= []);
      let a = pool.find((x) => x.paused || x.ended);
      if (!a) {
        a = new Audio(`${BASE_EFFECTS}${name}.mp3`);
        pool.push(a);
      }
      const el = a;
      el.volume = volume;
      el.currentTime = 0;
      el.onended = () => resolve();
      el.onerror = () => resolve();
      el.play().catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const playPositive = () => effect(pick(POSITIVE), 0.7);
export const playNegative = () => effect(pick(NEGATIVE), 0.6);
export const playFlip = () => effect('flip', 0.6);
export const playDropCorrect = () => effect('drop-correct', 0.7);
export const playDropWrong = () => effect('drop-wrong', 0.7);
export const playWin = () => effect('win', 0.6);

/** טעינה מוקדמת של הקלטות היחידה, כדי שלא יהיה עיכוב בלחיצה */
export function preloadAudio(ids: string[]): void {
  for (const id of ids.slice(0, 120)) {
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = mediaUrl(id, 'mp3');
    document.head.appendChild(l);
  }
}

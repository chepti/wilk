// החוזה בין נגן היחידה לבין משחק בודד

import { createContext, useContext } from 'react';
import type { UnitContent } from './types';

export interface PlayApi {
  /** ההוראות הסתיימו — המשחק רשאי לפעול */
  active: boolean;
  unit: UnitContent;
  /** המשחק הושלם → משוב (אם יש) → מעבר אוטומטי לשקף הבא */
  finish: () => void;
  /** אירוע מדיד: הצלחה / טעות, עם טקסט (מילה/אות) לשיוך לצליל */
  record: (ok: boolean, text?: string | null) => void;
  /** איכות הביצוע עד עכשיו בשקף (0–1) — לכוכבים. נשלחת כשיוצאים מהשקף */
  progress: (quality: number) => void;
}

export const PlayCtx = createContext<PlayApi | null>(null);

export function usePlay(): PlayApi {
  const p = useContext(PlayCtx);
  if (!p) throw new Error('usePlay outside player');
  return p;
}

/** שיוך טקסט לצלילי היחידה: קודם צליל שהמילה מתחילה בו, אחר כך צליל שמופיע בה, אחרת כל צלילי היחידה */
export function skillsFor(text: string | null | undefined, unitSkills: string[]): string[] {
  const t = (text ?? '').trim().toLowerCase().replace(/[^a-z\s]/g, '');
  if (!t) return unitSkills;
  const words = t.split(/\s+/).filter(Boolean);
  // מהארוך לקצר, כדי ש-"ck" יזכה לפני "c"
  const sorted = [...unitSkills].sort((a, b) => b.length - a.length);
  const starts = sorted.filter((s) => words.some((w) => w.startsWith(s)));
  if (starts.length) return [starts[0]];
  const has = sorted.filter((s) => words.some((w) => w.includes(s)));
  if (has.length) return [has[0]];
  return unitSkills;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

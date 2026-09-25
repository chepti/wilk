// כוכבי איכות לתחנה (0–5): ממוצע איכות הביצוע בשקפים הפעילים.
// איכות שקף 0–1: מושלם בניסיון ראשון = 1, הצלחה אחרי טעות = 0.6, אחרי שהמערכת גילתה (רמז) = 0.3, דילוג = 0.

import type { SlideStat } from '../lib/api';

/** שקפים שנכנסים לכוכבים (שער/פוסטר לא) */
export const STAR_KINDS = new Set(['tappingBoard', 'findAnswer', 'dragDrop', 'cardQuiz', 'matching', 'memoryGame', 'flashcards', 'video', 'embed']);

export const Q = { first: 1, retry: 0.6, hinted: 0.3 } as const;

export function unitQuality(unitId: string, kinds: string[], slides: Record<string, SlideStat>): number {
  let sum = 0, n = 0;
  kinds.forEach((k, i) => {
    if (!STAR_KINDS.has(k)) return;
    n++;
    sum += slides[`${unitId}:${i}`]?.q ?? 0;
  });
  return n ? sum / n : 0;
}

export function starsFor(q: number): number {
  if (q >= 0.95) return 5;
  if (q >= 0.8) return 4;
  if (q >= 0.6) return 3;
  if (q >= 0.35) return 2;
  return q > 0 ? 1 : 0;
}

/**
 * "מכיר את האות": גם דיוק (70%+ בניסיון ראשון, מ-3 תשובות לפחות)
 * וגם כיסוי — התחנה שמלמדת את האות בוצעה ברמה של 3 כוכבים ומעלה. דילוגים לא "מדליקים" אות.
 */
export function skillLevel(
  skill: string,
  units: { id: string; skills: string[]; kinds: string[] }[],
  progress: { skills: Record<string, { c: number; w: number }>; slides: Record<string, SlideStat> },
): 'known' | 'progress' | 'none' {
  const st = progress.skills[skill];
  const n = st ? st.c + st.w : 0;
  const unit = units.find((u) => u.skills.includes(skill));
  const cover = unit ? unitQuality(unit.id, unit.kinds, progress.slides) : 0;
  if (n === 0 && cover === 0) return 'none';
  if (n >= 3 && st!.c / n >= 0.7 && cover >= 0.6) return 'known';
  return 'progress';
}

/** כוכבי תחנה: הטוב מבין השמור בשרת לבין החישוב מהשקפים */
export function unitStars(
  u: { id: string; kinds: string[] },
  p: { positions: Record<string, { stars?: number }>; slides: Record<string, SlideStat> },
): number {
  return Math.max(p.positions[u.id]?.stars ?? 0, starsFor(unitQuality(u.id, u.kinds, p.slides)));
}

/** שקפים שעוד אפשר לשפר (לתפריט השקפים ולמסך הסיום) */
export function weakSlides(unitId: string, kinds: string[], slides: Record<string, SlideStat>): number[] {
  return kinds.flatMap((k, i) => (STAR_KINDS.has(k) && (slides[`${unitId}:${i}`]?.q ?? 0) < 0.95 ? [i] : []));
}

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

/** שקפים שעוד אפשר לשפר (לתפריט השקפים ולמסך הסיום) */
export function weakSlides(unitId: string, kinds: string[], slides: Record<string, SlideStat>): number[] {
  return kinds.flatMap((k, i) => (STAR_KINDS.has(k) && (slides[`${unitId}:${i}`]?.q ?? 0) < 0.95 ? [i] : []));
}

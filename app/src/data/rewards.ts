// תגמולים שמעודדים חזרה, השלמה ואיכות:
// להבת התמדה (פעמיים בשבוע), אבני חן (כל תחנה ב-5 כוכבים), בקבוק עם פתק (אות שעוד לא נשלטה).

import type { ProgressData } from '../lib/api';
import { STAR_KINDS, skillLevel, unitStars } from './stars';

export const WEEK_GOAL = 2; // "כדאי לחזור לכאן פעמיים בשבוע" — מהעמוד הישן

/** תחילת שבוע (יום ראשון) לתאריך YYYY-MM-DD */
function weekKey(d: string): string {
  const t = new Date(d + 'T12:00:00');
  t.setDate(t.getDate() - t.getDay());
  return t.toISOString().slice(0, 10);
}

/** השבוע: כמה ימי עבודה; רצף: כמה שבועות ברצף עם 2 ימים ומעלה */
export function persistence(days: string[] | undefined): { thisWeek: number; streak: number } {
  const byWeek = new Map<string, number>();
  for (const d of days ?? []) byWeek.set(weekKey(d), (byWeek.get(weekKey(d)) ?? 0) + 1);
  const now = weekKey(new Date().toISOString().slice(0, 10));
  const thisWeek = byWeek.get(now) ?? 0;
  let streak = 0;
  const cur = new Date(now + 'T12:00:00');
  // השבוע הנוכחי נספר רק אם כבר הושלם; אחרת מתחילים מהשבוע הקודם (עוד יש זמן)
  if (thisWeek < WEEK_GOAL) cur.setDate(cur.getDate() - 7);
  while ((byWeek.get(cur.toISOString().slice(0, 10)) ?? 0) >= WEEK_GOAL) {
    streak++;
    cur.setDate(cur.getDate() - 7);
  }
  return { thisWeek, streak };
}

type U = { id: string; n: number; skills: string[]; kinds: string[] };

/** אבן חן לכל תחנה שהושגו בה 5 כוכבים — בפעם הראשונה או אחרי שיפור */
export function gems(units: U[], p: ProgressData): number {
  return units.filter((u) => p.positions[u.id] && unitStars(u, p) === 5).length;
}

/**
 * בקבוק עם פתק: אות שנלמדה בתחנה שכבר הושלמה אבל עוד לא "מוכרת" (דיוק + כיסוי).
 * מוביל לשקף החלש ביותר בתחנה. בקבוק אחד בכל פעם — הכי מוקדם במסע.
 */
export function bottle(units: U[], p: ProgressData): { unit: U; skill: string; slide: number } | null {
  for (const u of units) {
    if (!p.positions[u.id]?.completed) continue;
    // רק צליל שיש עליו תשובות אמיתיות ועדיין לא נשלט (לא צליל שמעולם לא נמדד)
    const skill = u.skills.find((s) => { const st = p.skills[s]; return !!st && st.c + st.w >= 2 && skillLevel(s, units, p) !== 'known'; });
    if (!skill) continue;
    let slide = -1, low = 2;
    u.kinds.forEach((k, i) => {
      if (!STAR_KINDS.has(k) || k === 'video' || k === 'embed') return;
      const q = p.slides[`${u.id}:${i}`]?.q ?? 0;
      if (q < low) { low = q; slide = i; }
    });
    if (slide >= 0) return { unit: u, skill, slide };
  }
  return null;
}

// קטלוג היחידות וטעינת תוכן יחידה (נבנה מהארכיון ע"י tools/build-content.mjs)

import { BASE } from '../lib/mediaPaths';
import type { UnitContent } from '../engine/types';

export { mediaUrl } from '../lib/mediaPaths';

export interface UnitMeta {
  id: string;
  n: number;
  title: string;
  skills: string[];
  slides: number;
  kinds: string[];
}

let catalog: Promise<UnitMeta[]> | null = null;
const cache = new Map<string, Promise<UnitContent>>();

export function loadCatalog(): Promise<UnitMeta[]> {
  catalog ??= fetch(`${BASE}content/units.json`).then((r) => r.json());
  return catalog;
}

export function loadUnit(id: string): Promise<UnitContent> {
  if (!cache.has(id)) cache.set(id, fetch(`${BASE}content/${id}.json`).then((r) => r.json()));
  return cache.get(id)!;
}

/** שקפים שמודדים משהו (ולא רק מציגים) */
export const SCORED_KINDS = new Set(['tappingBoard', 'findAnswer', 'dragDrop', 'cardQuiz', 'memoryGame', 'matching', 'flashcards']);

/** אותיות וצלילים — סדר להצגה במפת החום */
export const SKILL_ORDER = [
  'c', 'a', 't', 's', 'h', 'r', 'f', 'm', 'n', 'o', 'p', 'on', 'e', 'k', 'l', 'b', 'ck', 'g', 'd',
  'i', 'in', 'v', 'and', 'x', 'can', 'j', 'z', 'u', 'q', 'qu', 'y', 'w', 'ow',
];

/** שליטה 0–1, או null אם אין מספיק נתונים */
export function mastery(s: { c: number; w: number } | undefined, min = 3): number | null {
  if (!s) return null;
  const n = s.c + s.w;
  return n < min ? null : s.c / n;
}

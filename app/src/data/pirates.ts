// דמויות שודדי ים (בסיסיות — יוחלפו באיורים) ואבזרים שנפתחים לפי כוכבים שנאספו.
// הדמות מוצגת לאחרים; האימוג'י של הכניסה נשאר סודי.

export interface PirateLook {
  base: number;       // אינדקס ב-BASES
  items: string[];    // מזהי פריטים שהילד בחר לענוד (רק כאלה שנפתחו)
}

export const BASES: { name: string; skin: string; shirt: string; band: string }[] = [
  { name: 'טל', skin: '#f5c9a0', shirt: '#e74c3c', band: '#2c3e50' },
  { name: 'נוי', skin: '#d9a47a', shirt: '#2e86de', band: '#e84393' },
  { name: 'גיל', skin: '#8d5b3e', shirt: '#27ae60', band: '#f1c40f' },
  { name: 'רון', skin: '#f0b890', shirt: '#8e44ad', band: '#16a085' },
  { name: 'שיר', skin: '#c68a5e', shirt: '#f39c12', band: '#c0392b' },
  { name: 'עוז', skin: '#6e4630', shirt: '#34495e', band: '#e67e22' },
];

export interface PirateItem { id: string; name: string; stars: number; slot: 'head' | 'face' | 'ear' | 'shoulder' | 'hand' | 'body' }

/** הפריטים נפתחים לפי סך הכוכבים (18 תחנות × 5 = 90 לכל היותר). כוכבים לא "מתבזבזים" */
export const ITEMS: PirateItem[] = [
  { id: 'earring', name: 'עגיל זהב', stars: 3, slot: 'ear' },
  { id: 'patch', name: 'רטייה', stars: 8, slot: 'face' },
  { id: 'hat', name: 'כובע שודדים', stars: 14, slot: 'head' },
  { id: 'parrot', name: 'תוכי', stars: 22, slot: 'shoulder' },
  { id: 'scope', name: 'משקפת', stars: 30, slot: 'hand' },
  { id: 'sword', name: 'חרב', stars: 40, slot: 'hand' },
  { id: 'map', name: 'מפת אוצר', stars: 52, slot: 'hand' },
  { id: 'coat', name: 'מעיל קפטן', stars: 65, slot: 'body' },
  { id: 'crown', name: 'כתר מלך הים', stars: 80, slot: 'head' },
];

export const DEFAULT_LOOK: PirateLook = { base: 0, items: [] };

export function unlockedItems(stars: number): PirateItem[] {
  return ITEMS.filter((i) => stars >= i.stars);
}

/** הפריט הבא שייפתח — "עוד 4 כוכבים לתוכי!" */
export function nextItem(stars: number): PirateItem | undefined {
  return ITEMS.find((i) => stars < i.stars);
}

/** ענידה: פריט אחד לכל מקום בגוף; רק פריטים שנפתחו */
export function wearable(look: PirateLook, stars: number): string[] {
  const open = new Set(unlockedItems(stars).map((i) => i.id));
  const bySlot = new Map<string, string>();
  for (const id of look.items) {
    const it = ITEMS.find((x) => x.id === id);
    if (it && open.has(id)) bySlot.set(it.slot, id);
  }
  return [...bySlot.values()];
}

export function parseLook(raw: unknown): PirateLook | null {
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object') return null;
    const base = Math.max(0, Math.min(BASES.length - 1, Number((o as PirateLook).base) || 0));
    const items = Array.isArray((o as PirateLook).items) ? (o as PirateLook).items.filter((x) => typeof x === 'string').slice(0, 8) : [];
    return { base, items };
  } catch {
    return null;
  }
}

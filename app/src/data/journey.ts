// מפת המסע: מיקומי 18 התחנות (באחוזים מהלוח) ורקע.
// אפשר להחליף בלי קוד: public/journey/journey.json → { "bg": "bg.webp", "ratio": 2.6, "stations": [{x,y}×18] }
// עורך גרירה: #/path-edit (מורה) — מעתיקים את ה-JSON שנוצר לקובץ.

import { BASE } from '../lib/mediaPaths';

export interface Pt { x: number; y: number }
export interface JourneyConfig {
  /** קובץ רקע ב-public/journey (אם אין — רקע מצויר מובנה) */
  bg?: string;
  /** גובה הלוח ביחס לרוחב */
  ratio: number;
  stations: Pt[];
}

/** שביל מתפתל מלמטה (תחנה 1) למעלה (תחנה 18) */
export function defaultStations(n = 18): Pt[] {
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round((50 + 28 * Math.sin(i * 0.78 + 0.2)) * 10) / 10,
    y: Math.round((93 - i * (86 / (n - 1))) * 10) / 10,
  }));
}

export const DEFAULT_JOURNEY: JourneyConfig = { ratio: 3.4, stations: defaultStations() };

const LS_EDIT = 'wilk_journey_edit';
let cache: Promise<JourneyConfig> | null = null;

export function loadJourney(): Promise<JourneyConfig> {
  cache ??= fetch(`${BASE}journey/journey.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((cfg: Partial<JourneyConfig> | null) => {
      const base: JourneyConfig = { ...DEFAULT_JOURNEY, ...(cfg ?? {}) };
      if (!Array.isArray(base.stations) || base.stations.length !== 18) base.stations = DEFAULT_JOURNEY.stations;
      // טיוטה מהעורך (רק במכשיר הזה) גוברת — כדי לראות מיד את השינוי
      try {
        const draft = localStorage.getItem(LS_EDIT);
        if (draft) {
          const d = JSON.parse(draft) as Pt[];
          if (Array.isArray(d) && d.length === 18) base.stations = d;
        }
      } catch { /* */ }
      return base;
    });
  return cache;
}

export function saveDraft(pts: Pt[] | null) {
  try { pts ? localStorage.setItem(LS_EDIT, JSON.stringify(pts)) : localStorage.removeItem(LS_EDIT); } catch { /* */ }
  cache = null;
}

export const bgUrl = (cfg: JourneyConfig) => (cfg.bg ? `${BASE}journey/${cfg.bg}` : null);

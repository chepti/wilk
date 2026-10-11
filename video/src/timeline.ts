export const FPS = 30;

/*
 * מוזיקה: Driving Ambition (Mixkit), 99.4 BPM, פעמה ראשונה ב-0.418s, מחזור 0.6037s.
 * מתחילים את הרצועה ב-19.737s (פעמה 32) — כך שכל פעמה בסרטון = k × 0.6037s מאפס,
 * ועליות האנרגיה של הרצועה (38/43/48/57/67/75s) נופלות על 18.3/23.3/28.3/37.3/47.3/55.3s בסרטון.
 */
export const MUSIC_OFFSET = 19.737;
export const BEAT = 0.6037;
export const FIRST = 0;
export const beat = (n: number) => Math.round((FIRST + n * BEAT) * FPS);

export const S = {
  open: 0,
  chaos: beat(7), //  4.2s
  method: beat(18), // 10.9s
  reveal: beat(30), // 18.1s — עליית אנרגיה ראשונה
  map: beat(38), // 22.9s — עלייה
  tap: beat(47), // 28.4s — עלייה
  games: beat(56), // 33.8s
  trace: beat(62), // 37.4s — עלייה גדולה
  rewards: beat(73), // 44.1s
  teacher: beat(80), // 48.3s — עלייה
  parents: beat(92), // 55.5s — עלייה
  outro: beat(101), // 61.0s
};

export const TOTAL = beat(118); // ~71s

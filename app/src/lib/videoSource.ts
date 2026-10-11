// מקור הסרטונים: יוטיוב (ברירת מחדל) או גוגל דרייב — לתלמידים שאצלם יוטיוב מסונן.
// סדר עדיפות: בחירה ידנית במכשיר → זיהוי אוטומטי שיוטיוב חסום (נזכר 14 יום) → ברירת המחדל של הכיתה → יוטיוב.

export type VideoSource = 'youtube' | 'drive';

const PREF = 'wilk_video_src';
const AUTO = 'wilk_video_auto';
const AUTO_DAYS = 14;

let classDefault: VideoSource | null = null;

function get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function set(k: string, v: string | null) {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* מצב פרטי */ }
}

export function setClassVideoSource(v: VideoSource | null | undefined) {
  classDefault = v === 'drive' || v === 'youtube' ? v : null;
}

function autoDrive(): boolean {
  const t = Number(get(AUTO) || 0);
  return t > 0 && Date.now() - t < AUTO_DAYS * 864e5;
}

export function videoSource(): VideoSource {
  const p = get(PREF);
  if (p === 'drive' || p === 'youtube') return p;
  if (autoDrive()) return 'drive';
  return classDefault ?? 'youtube';
}

/** בחירה ידנית (מתג בנגן) — גוברת על הכול במכשיר הזה */
export function chooseVideoSource(v: VideoSource) {
  set(PREF, v);
  if (v === 'youtube') set(AUTO, null);
  window.dispatchEvent(new Event('wilk-videosrc'));
}

/** יוטיוב לא נטען / שגיאת נגן — עוברים לדרייב אוטומטית (אלא אם בחרו ידנית יוטיוב) */
export function markYoutubeBlocked() {
  if (get(PREF) === 'youtube') return;
  set(AUTO, String(Date.now()));
  window.dispatchEvent(new Event('wilk-videosrc'));
}

export function onVideoSource(fn: () => void): () => void {
  window.addEventListener('wilk-videosrc', fn);
  return () => window.removeEventListener('wilk-videosrc', fn);
}

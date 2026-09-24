// נתיב הבסיס נקבע בבנייה (vite base): /wilk/ בייצור, /wilk-beta/ לבדיקה
export const BASE = import.meta.env.BASE_URL;
export const BASE_EFFECTS = `${BASE}sfx/`;

export function mediaUrl(id: string, ext: 'webp' | 'mp3', removeWhite = false): string {
  return `${BASE}media/${id}${removeWhite ? '.rw' : ''}.${ext}`;
}

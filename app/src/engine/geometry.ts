// בדיקת פגיעה בין פריט נגרר לאזורי יעד — גאומטריה טהורה בקואורדינטות במה

import type { Trace } from './types';
import { W, H, angle } from './Stage';

function localSize(t: Trace): [number, number] {
  const sh = t.shape as Record<string, unknown>;
  if ('Rect' in sh) { const [w, h] = sh.Rect as [number, number]; return [w * W, h * H]; }
  if ('Ellipse' in sh) { const [rx, ry] = sh.Ellipse as [number, number]; return [rx * 2 * W, ry * 2 * H]; }
  if ('Path' in sh) {
    const pts = sh.Path as [number, number][];
    return [Math.max(...pts.map((p) => p[0] * W)), Math.max(...pts.map((p) => p[1] * H))];
  }
  return [0, 0];
}

/** האם נקודת במה (x,y) בתוך אזור המגע (כולל סיבוב וקנה מידה) */
export function pointInTrace(t: Trace, x: number, y: number): boolean {
  const [w, h] = localSize(t);
  const tr = t.transform;
  // P = T(t) · T(c) · R · S · T(-c) · p  →  p = T(c) · S⁻¹ · R⁻¹ · T(-c) · T(-t) · P
  let px = x - tr.translation[0] * W - w / 2;
  let py = y - tr.translation[1] * H - h / 2;
  const a = -angle(tr);
  const rx = px * Math.cos(a) - py * Math.sin(a);
  const ry = px * Math.sin(a) + py * Math.cos(a);
  px = rx / (tr.scale[0] || 1) + w / 2;
  py = ry / (tr.scale[1] || 1) + h / 2;

  const sh = t.shape as Record<string, unknown>;
  if ('Rect' in sh) return px >= 0 && py >= 0 && px <= w && py <= h;
  if ('Ellipse' in sh) {
    const [erx, ery] = sh.Ellipse as [number, number];
    const ax = erx * W, ay = ery * H;
    const dx = (px - ax) / ax, dy = (py - ay) / ay;
    return dx * dx + dy * dy <= 1;
  }
  if ('Path' in sh) {
    const pts = (sh.Path as [number, number][]).map((p) => [p[0] * W, p[1] * H]);
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  return false;
}

/** איזה אזור מקבל הכי הרבה חפיפה מתיבת הפריט (דגימת רשת), או -1 */
export function hitIndex(traces: Trace[], box: { cx: number; cy: number; w: number; h: number; rot: number }): number {
  const N = 9;
  const counts = new Array(traces.length).fill(0);
  const cos = Math.cos(box.rot), sin = Math.sin(box.rot);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const lx = ((i + 0.5) / N - 0.5) * box.w;
      const ly = ((j + 0.5) / N - 0.5) * box.h;
      const x = box.cx + lx * cos - ly * sin;
      const y = box.cy + lx * sin + ly * cos;
      traces.forEach((t, k) => { if (pointInTrace(t, x, y)) counts[k]++; });
    }
  }
  let best = -1, bestN = 0;
  counts.forEach((n, k) => { if (n > bestN) { bestN = n; best = k; } });
  return best;
}

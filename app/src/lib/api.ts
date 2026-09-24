// שכבת תקשורת: מול השרת (PHP) כשהתלמיד מחובר לכיתה,
// ומצב "אורח" (localStorage בלבד) כשמתרגלים בלי קוד כיתה.

import { BASE } from './mediaPaths';

const API = `${BASE}api`;

export interface StudentSession {
  token: string;       // 'guest' במצב אורח, 'teacher-preview' לתצוגת מורה
  nickname: string;
  emoji: string;       // "הסיסמה הקטנה" — מזהה את התלמיד יחד עם השם
  classId?: number;
  className?: string;
  freeNav?: boolean;   // true: כל היחידות פתוחות
}

export interface Position { slide: number; furthest: number; completed: boolean; at?: string }
export interface SkillStat { c: number; w: number }

export interface ProgressData {
  positions: Record<string, Position>;                         // לפי unit id
  slides: Record<string, { c: number; w: number; n: number }>;  // "u3:5" → ניסיון ראשון + מספר ניסיונות
  skills: Record<string, SkillStat>;
  freeNav?: boolean;
}

export const emptyProgress = (): ProgressData => ({ positions: {}, slides: {}, skills: {} });

export interface SlideResult {
  unitId: string;
  slide: number;
  kind: string;
  correct: number;
  wrong: number;
  seconds: number;
  skills: Record<string, SkillStat>;
  next: number;   // השקף שממנו ממשיכים
  total: number;  // מספר השקפים ביחידה
}

const LS_SESSION = 'wilk_session';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, v: string | null): void {
  try { v === null ? localStorage.removeItem(key) : localStorage.setItem(key, v); } catch { /* מצב פרטי */ }
}

/** התקדמות אורח נשמרת לפי שם+אימוג'י — כמה תלמידים יכולים לחלוק מחשב */
function guestKey(s: StudentSession): string {
  return `wilk_guest_${s.nickname}_${s.emoji}`;
}

export function loadSession(): StudentSession | null {
  const raw = safeGet(LS_SESSION);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function saveSession(s: StudentSession | null): void {
  safeSet(LS_SESSION, s ? JSON.stringify(s) : null);
  window.dispatchEvent(new Event('wilk-session'));
}

async function request<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'שגיאת שרת');
  return data as T;
}

// ─── תלמיד ───

export async function joinClass(code: string, nickname: string, emoji: string): Promise<StudentSession> {
  const r = await request<{ token: string; classId: number; className: string; freeNav: boolean }>(
    'student.php?a=join', { code, nickname, emoji });
  const s: StudentSession = { token: r.token, nickname, emoji, classId: r.classId, className: r.className, freeNav: r.freeNav };
  saveSession(s);
  return s;
}

export function guestSession(nickname: string, emoji: string): StudentSession {
  const s: StudentSession = { token: 'guest', nickname, emoji, freeNav: true };
  saveSession(s);
  return s;
}

export function teacherPreviewSession(): StudentSession {
  const s: StudentSession = { token: 'teacher-preview', nickname: 'מורה', emoji: '🍎', freeNav: true };
  saveSession(s);
  return s;
}

export function isLocalSession(s: StudentSession): boolean {
  return s.token === 'guest' || s.token === 'teacher-preview';
}

function loadGuest(s: StudentSession): ProgressData {
  try {
    const raw = safeGet(guestKey(s));
    return { ...emptyProgress(), ...(raw ? JSON.parse(raw) : {}), freeNav: true };
  } catch {
    return { ...emptyProgress(), freeNav: true };
  }
}

function saveGuest(s: StudentSession, p: ProgressData) {
  const { freeNav, ...rest } = p;
  safeSet(guestKey(s), JSON.stringify(rest));
}

function applyPosition(p: ProgressData, unitId: string, slide: number, total: number) {
  const prev = p.positions[unitId] ?? { slide: 0, furthest: 0, completed: false };
  const done = total > 0 && slide >= total;
  p.positions[unitId] = {
    slide: done ? 0 : Math.max(0, slide),
    furthest: Math.max(prev.furthest, slide),
    completed: prev.completed || done,
    at: new Date().toISOString(),
  };
}

export async function fetchProgress(s: StudentSession): Promise<ProgressData> {
  if (isLocalSession(s)) return loadGuest(s);
  return request<ProgressData>('student.php?a=progress', undefined, s.token);
}

export async function reportResult(s: StudentSession, r: SlideResult): Promise<void> {
  if (isLocalSession(s)) {
    const p = loadGuest(s);
    for (const [k, e] of Object.entries(r.skills)) {
      const cur = p.skills[k] ?? { c: 0, w: 0 };
      p.skills[k] = { c: cur.c + e.c, w: cur.w + e.w };
    }
    const key = `${r.unitId}:${r.slide}`;
    const prev = p.slides[key];
    p.slides[key] = prev ? { ...prev, n: prev.n + 1 } : { c: r.correct, w: r.wrong, n: 1 };
    applyPosition(p, r.unitId, r.next, r.total);
    saveGuest(s, p);
    return;
  }
  await request('student.php?a=result', r, s.token);
}

export async function reportPosition(s: StudentSession, unitId: string, slide: number, total: number): Promise<void> {
  if (isLocalSession(s)) {
    const p = loadGuest(s);
    applyPosition(p, unitId, slide, total);
    saveGuest(s, p);
    return;
  }
  await request('student.php?a=position', { unitId, slide, total }, s.token);
}

// ─── מורה ───

export interface TeacherSession { token: string; name: string; email: string }

const LS_TEACHER = 'wilk_teacher';

export function loadTeacher(): TeacherSession | null {
  const raw = safeGet(LS_TEACHER);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function saveTeacher(t: TeacherSession | null): void {
  safeSet(LS_TEACHER, t ? JSON.stringify(t) : null);
}

export async function teacherRegister(name: string, email: string, password: string): Promise<TeacherSession> {
  const r = await request<TeacherSession>('teacher.php?a=register', { name, email, password });
  saveTeacher(r);
  return r;
}

export async function teacherLogin(email: string, password: string): Promise<TeacherSession> {
  const r = await request<TeacherSession>('teacher.php?a=login', { email, password });
  saveTeacher(r);
  return r;
}

export interface ClassInfo { id: number; name: string; code: string; freeNav: boolean; students: number }

export async function fetchClasses(t: TeacherSession): Promise<ClassInfo[]> {
  return (await request<{ classes: ClassInfo[] }>('teacher.php?a=classes', undefined, t.token)).classes;
}

export async function createClass(t: TeacherSession, name: string): Promise<ClassInfo> {
  return request<ClassInfo>('teacher.php?a=create_class', { name }, t.token);
}

export async function setClassFree(t: TeacherSession, classId: number, free: boolean): Promise<void> {
  await request('teacher.php?a=set_free', { classId, free }, t.token);
}

export async function deleteStudent(t: TeacherSession, classId: number, studentId: number): Promise<void> {
  await request('teacher.php?a=delete_student', { classId, studentId }, t.token);
}

export interface HeatmapStudent extends ProgressData {
  id: number;
  nickname: string;
  emoji: string;
  lastSeen: string | null;
}

export async function fetchHeatmap(t: TeacherSession, classId: number): Promise<HeatmapStudent[]> {
  return (await request<{ students: HeatmapStudent[] }>(`teacher.php?a=heatmap&class=${classId}`, undefined, t.token)).students;
}

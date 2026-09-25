import React, { useEffect, useState } from 'react';
import { nav } from '../App';
import {
  loadTeacher, saveTeacher, teacherLogin, teacherRegister, fetchClasses, createClass, setClassFree,
  fetchHeatmap, deleteStudent, teacherPreviewSession, setClassFriends, type TeacherSession, type ClassInfo, type HeatmapStudent,
} from '../lib/api';
import { loadCatalog, mastery, SKILL_ORDER, type UnitMeta } from '../data/units';
import { avatarName } from '../data/avatars';
import { BASE } from '../lib/mediaPaths';
import { unitStars } from '../data/stars';
import ResourcesPanel from '../ui/Resources';
import PlaysChart from '../ui/PlaysChart';
import { fetchPlays } from '../lib/api';
import { skillLevel, unitQuality } from '../data/stars';
import Footer from '../ui/Footer';
import { IconLogOut, IconPlus, IconCopy, IconEye, IconRefresh, IconTrash, IconUsers, IconGrid, IconArrowRight, IconCheck } from '../ui/icons';

/** כניסות לכל תחנה בכל האתר (לא רק בכיתה) */
function SitePlays() {
  const [units, setUnits] = useState<UnitMeta[]>([]);
  const [plays, setPlays] = useState<Record<string, number>>({});
  useEffect(() => { loadCatalog().then(setUnits); fetchPlays().then(setPlays); }, []);
  return <PlaysChart units={units} plays={plays} />;
}

export default function Teacher() {
  const [t, setT] = useState<TeacherSession | null>(loadTeacher());
  if (!t) return <TeacherAuth onIn={setT} />;
  return <Dashboard t={t} onOut={() => { saveTeacher(null); setT(null); }} />;
}

function TeacherAuth({ onIn }: { onIn: (t: TeacherSession) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      onIn(mode === 'login' ? await teacherLogin(email, pass) : await teacherRegister(name, email, pass));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'שגיאה');
    } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <form className="card" onSubmit={submit} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ textAlign: 'center' }}>{mode === 'login' ? 'כניסת מורים' : 'הרשמת מורה'}</h2>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)', margin: 0, fontSize: 14 }}>כיתות, קוד הצטרפות ומפת התקדמות</p>
          {mode === 'register' && <input className="field" placeholder="שם" value={name} onChange={(e) => setName(e.target.value)} />}
          <input className="field" placeholder="אימייל" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="field" placeholder="סיסמה" type="password" dir="ltr" value={pass} onChange={(e) => setPass(e.target.value)} />
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? 'רגע…' : mode === 'login' ? 'כניסה' : 'הרשמה'}</button>
          <button type="button" className="pill" style={{ alignSelf: 'center', border: 'none' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'אין לי חשבון — הרשמה' : 'יש לי חשבון — כניסה'}
          </button>
          <button type="button" className="pill" style={{ alignSelf: 'center', border: 'none' }} onClick={() => nav('/')}><IconArrowRight size={14} /> לדף הבית</button>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function Dashboard({ t, onOut }: { t: TeacherSession; onOut: () => void }) {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState('');

  const reload = async () => {
    try {
      const cs = await fetchClasses(t);
      setClasses(cs);
      if (sel === null && cs.length) setSel(cs[0].id);
    } catch (ex) {
      const m = ex instanceof Error ? ex.message : '';
      if (m.includes('להתחבר')) onOut(); else setErr(m);
    }
  };
  useEffect(() => { reload(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const c = await createClass(t, newName.trim());
    setNewName('');
    setClasses([c, ...classes]);
    setSel(c.id);
  };

  const cls = classes.find((c) => c.id === sel) ?? null;

  return (
    <div className="page">
      <header className="teacher-bar">
        <div><b>{t.name}</b> <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>· English through the Stars</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pill" onClick={() => { teacherPreviewSession(); nav('/map'); }}><IconEye size={15} /> לשחק כמו תלמיד</button>
          <button className="pill" onClick={onOut}><IconLogOut size={15} /> יציאה</button>
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 1280, margin: '0 auto', padding: '8px 16px 24px' }}>
        {err && <p className="err">{err}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {classes.map((c) => (
            <button key={c.id} className={`pill${c.id === sel ? ' on' : ''}`} onClick={() => setSel(c.id)}>
              <IconUsers size={14} /> {c.name} <span style={{ opacity: 0.6 }}>({c.students})</span>
            </button>
          ))}
          <form onSubmit={add} style={{ display: 'flex', gap: 6 }}>
            <input className="field" style={{ padding: '6px 12px', fontSize: 14, width: 160, borderRadius: 999 }} placeholder="כיתה חדשה" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn small"><IconPlus size={15} /> הוספה</button>
          </form>
        </div>
        {cls ? <ClassView t={t} cls={cls} onChange={reload} /> : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>צרו כיתה ראשונה — תקבלו קוד בן 6 ספרות שהתלמידים מקלידים</div>
        )}
        <ResourcesPanel audience="teacher" />
        <SitePlays />
      </main>
      <Footer />
    </div>
  );
}

function ClassView({ t, cls, onChange }: { t: TeacherSession; cls: ClassInfo; onChange: () => void }) {
  const [students, setStudents] = useState<HeatmapStudent[] | null>(null);
  const [units, setUnits] = useState<UnitMeta[]>([]);
  const [tab, setTab] = useState<'skills' | 'units'>('skills');
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${BASE}#/join/${cls.code}`;

  const load = () => fetchHeatmap(t, cls.id).then(setStudents).catch(() => setStudents([]));
  useEffect(() => { setStudents(null); load(); loadCatalog().then(setUnits); }, [cls.id]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
  };

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="tip-host">
            <div className="class-code" dir="ltr">{cls.code}</div>
            <span className="tip">התלמידים נכנסים ב-chepti.com/wilk ומקלידים את הקוד, או פותחים את הקישור</span>
          </div>
          <button className="pill" onClick={copy}><IconCopy size={14} /> {copied ? 'הועתק' : 'העתקת קישור הצטרפות'}</button>
          <label className="pill tip-host" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={cls.freeNav} onChange={async (e) => { await setClassFree(t, cls.id, e.target.checked); onChange(); }} />
            מסלול חופשי
            <span className="tip">מסומן: כל התחנות פתוחות. לא מסומן: כל תחנה נפתחת אחרי שמסיימים את הקודמת</span>
          </label>
          <label className="pill tip-host" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={!!cls.showFriends} onChange={async (e) => { await setClassFriends(t, cls.id, e.target.checked); onChange(); }} />
            חברים על המפה
            <span className="tip">מסומן: כל תלמיד רואה במפה את דמויות החברים לכיתה ליד התחנה שבה הם נמצאים (שם פרטי בלבד, בלי כוכבים וציונים). אפשר לכבות אם לא רוצים תחרותיות</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`pill${tab === 'skills' ? ' on' : ''}`} onClick={() => setTab('skills')}><IconGrid size={14} /> אותיות וצלילים</button>
          <button className={`pill${tab === 'units' ? ' on' : ''}`} onClick={() => setTab('units')}><IconGrid size={14} /> תחנות</button>
          <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={load} aria-label="רענון" title="רענון"><IconRefresh size={16} /></button>
        </div>
      </div>

      {!students ? <p style={{ color: 'var(--ink-soft)' }}>טוען…</p> : students.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', marginTop: 18 }}>עוד אין תלמידים בכיתה. שתפו את הקוד או את הקישור.</p>
      ) : tab === 'skills' ? (
        <SkillsHeatmap students={students} units={units} onDelete={async (s) => {
          if (!confirm(`למחוק את ${s.nickname} ${s.emoji} וכל ההתקדמות?`)) return;
          await deleteStudent(t, cls.id, s.id); load(); onChange();
        }} />
      ) : (
        <UnitsHeatmap students={students} units={units} />
      )}
    </div>
  );
}

function heat(m: number | null): { bg: string; fg: string } {
  if (m === null) return { bg: '#f1f5f9', fg: '#94a3b8' };
  if (m >= 0.85) return { bg: '#16a34a', fg: '#fff' };
  if (m >= 0.7) return { bg: '#86efac', fg: '#14532d' };
  if (m >= 0.5) return { bg: '#fde68a', fg: '#713f12' };
  return { bg: '#fca5a5', fg: '#7f1d1d' };
}

const ago = (s: string | null) => {
  if (!s) return '—';
  const d = (Date.now() - new Date(s.replace(' ', 'T') + 'Z').getTime()) / 86400000;
  return d < 1 ? 'היום' : d < 2 ? 'אתמול' : `לפני ${Math.floor(d)} ימים`;
};

function StudentCell({ s, onDelete }: { s: HeatmapStudent; onDelete?: () => void }) {
  return (
    <td className="hm-name">
      <span className="tip-host">
        <span style={{ fontSize: 20 }}>{s.emoji}</span> {s.nickname}
        <span className="tip">{avatarName(s.emoji)} · נראה לאחרונה: {ago(s.lastSeen)}</span>
      </span>
      {onDelete && <button className="hm-del" onClick={onDelete} aria-label="מחיקה"><IconTrash size={13} /></button>}
    </td>
  );
}

/** תא בטבלת האותיות: רמה (עבודה אמיתית = דיוק + כיסוי התחנה), דיוק בניסיון ראשון, כיסוי */
function skillCell(k: string, s: HeatmapStudent, units: UnitMeta[]) {
  const st = s.skills[k];
  const n = st ? st.c + st.w : 0;
  const acc = n ? st!.c / n : null;
  const unit = units.find((u) => u.skills.includes(k));
  const cover = unit ? unitQuality(unit.id, unit.kinds, s.slides) : 0;
  const level = skillLevel(k, units, s);
  const kind: 'known' | 'low' | 'progress' | 'none' =
    level === 'known' ? 'known' : level === 'none' ? 'none' : n >= 3 && acc! < 0.5 ? 'low' : 'progress';
  return { st, acc, cover, kind };
}

const LEVEL_STYLE = {
  known: { bg: '#16a34a', fg: '#fff' },
  progress: { bg: '#fde68a', fg: '#713f12' },
  low: { bg: '#fca5a5', fg: '#7f1d1d' },
  none: { bg: '#f1f5f9', fg: '#94a3b8' },
} as const;

function SkillsHeatmap({ students, units, onDelete }: { students: HeatmapStudent[]; units: UnitMeta[]; onDelete: (s: HeatmapStudent) => void }) {
  const taught = new Set(units.flatMap((u) => u.skills));
  const skills = SKILL_ORDER.filter((s) => taught.has(s));
  // לכל צליל: כמה תלמידים באמת מכירים — עוזר לראות מה הכיתה צריכה לתרגל
  const knownCount = skills.map((k) => students.filter((s) => skillCell(k, s, units).kind === 'known').length);
  return (
    <div className="hm-scroll">
      <table className="hm">
        <thead>
          <tr>
            <th className="hm-name">תלמיד</th>
            {skills.map((k) => <th key={k} dir="ltr" className="hm-skill">{k}</th>)}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <StudentCell s={s} onDelete={() => onDelete(s)} />
              {skills.map((k) => {
                const c = skillCell(k, s, units);
                const h = LEVEL_STYLE[c.kind];
                return (
                  <td key={k} className={`hm-cell tip-host lvl-${c.kind}`} style={{ background: h.bg, color: h.fg }}>
                    {c.acc === null ? (c.cover > 0 ? '·' : '') : Math.round(c.acc * 100)}
                    <span className="tip">
                      {c.kind === 'known' ? 'מכיר/ה' : c.kind === 'low' ? 'דיוק נמוך — כדאי לחזור' : c.kind === 'progress' ? 'בדרך' : 'עוד לא תרגל/ה'}
                      {c.st ? ` · דיוק בניסיון ראשון ${Math.round(c.acc! * 100)}% (${c.st.c} נכון, ${c.st.w} טעויות)` : ''}
                      {` · התחנה בוצעה ${Math.round(c.cover * 100)}%`}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="hm-avg">
            <td className="hm-name">מכירים</td>
            {knownCount.map((n, i) => (
              <td key={i} className="hm-cell tip-host" style={{ background: '#fff', color: n ? '#16a34a' : '#94a3b8' }}>
                {n}/{students.length}
                <span className="tip">{n} מתוך {students.length} תלמידים מכירים את <span dir="ltr">{skills[i]}</span></span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <Legend />
    </div>
  );
}

function UnitsHeatmap({ students, units }: { students: HeatmapStudent[]; units: UnitMeta[] }) {
  return (
    <div className="hm-scroll">
      <table className="hm">
        <thead>
          <tr>
            <th className="hm-name">תלמיד</th>
            {units.map((u) => <th key={u.id} className="hm-unit"><span className="tip-host">{u.n}<span className="tip" dir="ltr">{u.title}</span></span></th>)}
          </tr>
          <tr className="hm-sub">
            <th className="hm-name">נכנסו</th>
            {units.map((u) => {
              const who = students.filter((s) => (s.positions[u.id]?.visits ?? 0) > 0 || s.positions[u.id]);
              const visits = students.reduce((n, s) => n + (s.positions[u.id]?.visits ?? 0), 0);
              return (
                <th key={u.id} className="tip-host">
                  {who.length || ''}
                  <span className="tip">{who.length} מתוך {students.length} תלמידים · {visits} כניסות</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <StudentCell s={s} />
              {units.map((u) => {
                const p = s.positions[u.id];
                // דיוק בניסיון הראשון בשקפים המדידים של התחנה
                let c = 0, w = 0;
                for (let i = 0; i < u.slides; i++) { const r = s.slides[`${u.id}:${i}`]; if (r) { c += r.c; w += r.w; } }
                const acc = c + w > 0 ? c / (c + w) : null;
                const stars = p ? unitStars(u, s) : 0;
                const pct = p ? (p.completed ? 1 : Math.min(0.99, p.furthest / u.slides)) : 0;
                const bg = !p ? '#f1f5f9' : p.completed ? ['#fee2e2', '#fee2e2', '#fde68a', '#fde68a', '#86efac', '#16a34a'][stars] : '#e0e7ff';
                return (
                  <td key={u.id} className="hm-cell hm-stars tip-host" style={{ background: bg, color: stars === 5 && p?.completed ? '#fff' : '#243578' }}>
                    {p ? (p.completed ? <><b>{stars}</b><StarGlyph /></> : `${Math.round(pct * 100)}%`) : ''}
                    <span className="tip">
                      {p ? (p.completed ? `הושלמה · ${stars} כוכבים` : `עצר/ה בשקף ${p.slide + 1} מתוך ${u.slides} · ${stars} כוכבים עד כה`) : 'עוד לא נכנס/ה'}
                      {p?.visits ? ` · ${p.visits} כניסות` : ''}
                      {acc !== null ? ` · דיוק בניסיון ראשון ${Math.round(acc * 100)}%` : ''}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        תא כחול = באמצע התחנה (אחוז התקדמות) · תא צבעוני = הושלמה, מספר הכוכבים (0–5) לפי איכות הביצוע: דילוגים, טעויות ורמזים מורידים כוכבים
      </p>
    </div>
  );
}

function StarGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" style={{ marginRight: 2, verticalAlign: '-1px' }} aria-hidden="true">
      <path d="M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" fill="currentColor" />
    </svg>
  );
}

function Legend() {
  const items: [string, keyof typeof LEVEL_STYLE][] = [['מכיר/ה', 'known'], ['בדרך', 'progress'], ['דיוק נמוך', 'low'], ['עוד לא תרגל/ה', 'none']];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 13, color: 'var(--ink-soft)' }}>
      {items.map(([l, k]) => <span key={l} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><i style={{ width: 14, height: 14, borderRadius: 4, background: LEVEL_STYLE[k].bg, display: 'inline-block' }} />{l}</span>)}
      <span>· המספר = דיוק בניסיון הראשון. "מכיר/ה" רק כשהדיוק 70%+ וגם התחנה בוצעה (3 כוכבים ומעלה) — דילוגים לא נחשבים שליטה</span>
    </div>
  );
}

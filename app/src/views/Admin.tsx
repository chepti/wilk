import React, { useEffect, useMemo, useState } from 'react';
import { nav } from '../App';
import { loadTeacher, teacherMe, fetchAdminStats, type AdminStats, type AdminDay } from '../lib/api';
import { loadCatalog, type UnitMeta } from '../data/units';
import PlaysChart from '../ui/PlaysChart';
import TimeSeries, { type SeriesPoint } from '../ui/TimeSeries';
import StarLoader from '../ui/StarLoader';
import Footer from '../ui/Footer';
import { IconArrowRight, IconRefresh, IconPen, IconUsers, IconChevronLeft } from '../ui/icons';

// אזור אדמין (רק למנהלת התוכן): כמה מורים פתחו מרחב, כמה תלמידים, כניסות לתחנות, ופעילות לאורך זמן.

type Range = 30 | 90 | 0;
const RANGES: { v: Range; label: string }[] = [{ v: 30, label: '30 יום' }, { v: 90, label: '90 יום' }, { v: 0, label: 'הכול' }];
type Metric = 'plays' | 'active' | 'newStudents' | 'newTeachers';

const fmt = (n: number) => n.toLocaleString('he-IL');
const dayStr = (d: Date) => d.toISOString().slice(0, 10);
const short = (iso: string) => { const [, m, d] = iso.split('-'); return `${+d}/${+m}`; };
const when = (s: string | null) => {
  if (!s) return '—';
  const days = Math.floor((Date.now() - Date.parse(s.replace(' ', 'T') + 'Z')) / 864e5);
  return days <= 0 ? 'היום' : days === 1 ? 'אתמול' : `לפני ${days} ימים`;
};

/** ימים רצופים (כולל ימים בלי פעילות = 0); מעל 120 יום — מקבצים לשבועות */
type Bucket = { label: string; from: string; v: Record<Metric, number> };
function buckets(timeline: AdminDay[], range: Range): { rows: Bucket[]; weekly: boolean } {
  const by = new Map(timeline.map((d) => [d.day, d]));
  const today = new Date();
  const first = range ? new Date(today.getTime() - (range - 1) * 864e5) : new Date((timeline[0]?.day ?? dayStr(today)) + 'T00:00:00Z');
  const days: Bucket[] = [];
  for (let t = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()); t <= today.getTime(); t += 864e5) {
    const k = dayStr(new Date(t));
    const d = by.get(k);
    days.push({ label: short(k), from: k, v: { plays: d?.plays ?? 0, active: d?.active ?? 0, newStudents: d?.newStudents ?? 0, newTeachers: d?.newTeachers ?? 0 } });
  }
  if (days.length <= 120) return { rows: days, weekly: false };
  const weeks: Bucket[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    const sum = (m: Metric) => chunk.reduce((s, c) => s + c.v[m], 0);
    weeks.push({ label: chunk[0].label, from: chunk[0].from, v: { plays: sum('plays'), active: Math.max(...chunk.map((c) => c.v.active)), newStudents: sum('newStudents'), newTeachers: sum('newTeachers') } });
  }
  return { rows: weeks, weekly: true };
}

export default function Admin() {
  const t = loadTeacher();
  const [allowed, setAllowed] = useState<boolean | null>(t ? null : false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [units, setUnits] = useState<UnitMeta[]>([]);
  const [range, setRange] = useState<Range>(30);
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const load = () => {
    if (!t) return;
    setErr('');
    fetchAdminStats(t).then(setStats).catch((e) => setErr(e.message));
  };
  useEffect(() => {
    loadCatalog().then(setUnits);
    if (!t) return;
    teacherMe(t).then((r) => { setAllowed(!!(r.admin ?? r.strokeAdmin)); if (r.admin ?? r.strokeAdmin) load(); }).catch(() => setAllowed(false));
  }, []);

  const { rows: series, weekly } = useMemo(() => (stats ? buckets(stats.timeline, range) : { rows: [], weekly: false }), [stats, range]);
  const pts = (m: Metric): SeriesPoint[] => series.map((b) => ({ label: b.label, value: b.v[m] }));
  const sum = (m: Metric) => series.reduce((s, b) => s + b.v[m], 0);
  const peak = (m: Metric) => series.reduce((s, b) => Math.max(s, b.v[m]), 0);

  if (allowed === false) {
    return (
      <div className="page" dir="rtl">
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ textAlign: 'center', maxWidth: 420 }}>
            <h2>אזור אדמין</h2>
            <p style={{ color: 'var(--ink-soft)' }}>{t ? 'האזור הזה פתוח רק למנהלת התוכן.' : 'צריך להתחבר באזור המורים עם חשבון מנהלת התוכן.'}</p>
            <button className="btn" onClick={() => nav('/teacher')}>לאזור המורים</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  if (!stats) {
    return <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>{err ? <p className="err">{err}</p> : <StarLoader />}</div>;
  }

  const T = stats.totals;
  const plays: Record<string, number> = Object.fromEntries(Object.entries(stats.units).map(([k, v]) => [k, v.plays]));
  const classesOf = (tid: number) => stats.classes.filter((c) => c.teacher_id === tid);

  return (
    <div className="page" dir="rtl">
      <header className="teacher-bar">
        <div><b>אזור אדמין</b> <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>· English through the Stars</span></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="pill" onClick={() => nav('/trace-edit')}><IconPen size={15} /> מסלולי כתיבה</button>
          <button className="pill" onClick={load}><IconRefresh size={15} /> רענון</button>
          <button className="pill" onClick={() => nav('/teacher')}><IconArrowRight size={15} /> לאזור המורים</button>
        </div>
      </header>
      <main className="admin" style={{ flex: 1, width: '100%', maxWidth: 1180, margin: '0 auto', padding: '8px 16px 28px' }}>
        <section className="stat-tiles">
          <Tile label="מורים שפתחו מרחב" value={T.teachers} sub={`${fmt(T.classes)} כיתות`} />
          <Tile label="תלמידים בכיתות" value={T.students} sub={`${fmt(T.active7)} פעילים השבוע · ${fmt(T.active30)} בחודש`} />
          <Tile label="כניסות לתחנות" value={T.plays} sub={`${fmt(T.plays30)} ב-30 הימים האחרונים · כולל אורחים`} />
          <Tile label="תחנות שהושלמו" value={T.completed} sub={`${fmt(T.results)} תשובות בשקפים`} />
        </section>

        <section className="card">
          <div className="admin-head">
            <h2>פעילות לאורך זמן</h2>
            <div className="seg" role="tablist">
              {RANGES.map((r) => (
                <button key={r.v} role="tab" aria-selected={range === r.v} className={`pill${range === r.v ? ' on' : ''}`} onClick={() => { setRange(r.v); setHover(null); }}>{r.label}</button>
              ))}
            </div>
          </div>
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 13.5 }}>
            {weekly ? 'כל נקודה = שבוע.' : 'כל נקודה = יום.'} ריחוף מראה את אותו {weekly ? 'שבוע' : 'יום'} בכל הגרפים. תלמידים פעילים = ענו על שקף אחד לפחות (אורחים לא נספרים — הם רק בכניסות).
          </p>
          <div className="ts-grid">
            <TimeSeries title="כניסות לתחנות" unit="כניסות" total={`${fmt(sum('plays'))} בטווח`} points={pts('plays')} hover={hover} onHover={setHover} />
            <TimeSeries title={weekly ? 'תלמידים פעילים (שיא יומי בשבוע)' : 'תלמידים פעילים ביום'} unit="תלמידים" total={`שיא: ${fmt(peak('active'))}`} points={pts('active')} hover={hover} onHover={setHover} />
            <TimeSeries title="תלמידים חדשים" unit="תלמידים" total={`${fmt(sum('newStudents'))} בטווח`} points={pts('newStudents')} hover={hover} onHover={setHover} />
            <TimeSeries title="מורים חדשים" unit="מורים" total={`${fmt(sum('newTeachers'))} בטווח`} points={pts('newTeachers')} hover={hover} onHover={setHover} />
          </div>
          <details className="plays-table">
            <summary>הצגה כטבלה</summary>
            <table>
              <thead><tr><th>{weekly ? 'שבוע' : 'יום'}</th><th>כניסות</th><th>תלמידים פעילים</th><th>תלמידים חדשים</th><th>מורים חדשים</th></tr></thead>
              <tbody>
                {[...series].reverse().filter((b) => b.v.plays || b.v.active || b.v.newStudents || b.v.newTeachers).map((b) => (
                  <tr key={b.from}><td>{b.from}</td><td>{fmt(b.v.plays)}</td><td>{fmt(b.v.active)}</td><td>{fmt(b.v.newStudents)}</td><td>{fmt(b.v.newTeachers)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        <section className="card">
          <h2>מורים ומרחבים</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>מורה</th><th>הצטרפה</th><th>כיתות</th><th>תלמידים</th><th>פעילים (30 יום)</th><th>תחנות שהושלמו</th><th>פעילות אחרונה</th></tr>
              </thead>
              <tbody>
                {stats.teachers.map((tr) => (
                  <React.Fragment key={tr.id}>
                    <tr className={tr.classes ? 'clickable' : ''} onClick={() => tr.classes && setOpen(open === tr.id ? null : tr.id)}>
                      <td>
                        <b>{tr.name}</b>
                        <div className="muted" dir="ltr" style={{ fontSize: 12.5, textAlign: 'right' }}>{tr.email}</div>
                      </td>
                      <td>{tr.created_at.slice(0, 10)}</td>
                      <td>{tr.classes ? <span className="drill">{tr.classes} <IconChevronLeft size={13} style={{ transform: open === tr.id ? 'rotate(-90deg)' : undefined }} /></span> : 0}</td>
                      <td>{fmt(tr.students)}</td>
                      <td>{fmt(tr.active30)}</td>
                      <td>{fmt(tr.completed)}</td>
                      <td>{when(tr.last_seen)}</td>
                    </tr>
                    {open === tr.id && classesOf(tr.id).map((c) => (
                      <tr key={'c' + c.id} className="sub-row">
                        <td><IconUsers size={13} /> {c.name}</td>
                        <td>{c.created_at.slice(0, 10)}</td>
                        <td />
                        <td>{fmt(c.students)}</td>
                        <td />
                        <td />
                        <td>{when(c.last_seen)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <PlaysChart units={units} plays={plays} />

        <section className="card">
          <h2>תחנות — בכיתות</h2>
          <p className="muted" style={{ margin: '0 0 10px', fontSize: 13.5 }}>התחילו / סיימו = תלמידים בכיתות (לאורחים אין מעקב בשרת). כניסות — כל האתר.</p>
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>תחנה</th><th>כניסות</th><th>ב-30 יום</th><th>התחילו</th><th>סיימו</th><th>ממוצע כוכבים (מסיימים)</th></tr></thead>
              <tbody>
                {units.map((u) => {
                  const s = stats.units[u.id];
                  return (
                    <tr key={u.id}>
                      <td>{u.n} · <span dir="ltr">{u.title}</span></td>
                      <td>{fmt(s?.plays ?? 0)}</td>
                      <td>{fmt(s?.plays30 ?? 0)}</td>
                      <td>{fmt(s?.started ?? 0)}</td>
                      <td>{fmt(s?.completed ?? 0)}</td>
                      <td>{s?.avgStars ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="muted" style={{ fontSize: 12.5, textAlign: 'center' }}>עודכן: {new Date(stats.generatedAt).toLocaleString('he-IL')}</p>
      </main>
      <Footer />
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="stat-tile card">
      <span className="stat-label">{label}</span>
      <b className="stat-value">{fmt(value)}</b>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

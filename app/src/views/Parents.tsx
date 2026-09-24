import React, { useEffect, useState } from 'react';
import { nav } from '../App';
import { fetchPlays, type ProgressData, type StudentSession } from '../lib/api';
import { loadCatalog, mastery, SKILL_ORDER, type UnitMeta } from '../data/units';
import { ABOUT, RIGHTS, BOOKLET_PDF, BOOKLET_PAGE, pdfPage } from '../data/resources';
import { avatarName } from '../data/avatars';
import { unitStars } from './StarMap';
import { skillLevel } from '../data/stars';
import PlaysChart from '../ui/PlaysChart';
import StarRow from '../ui/StarRow';
import ResourcesPanel from '../ui/Resources';
import Footer from '../ui/Footer';
import { IconArrowRight, IconBook, IconPrint } from '../ui/icons';

// אזור הורים ומורים: דוח התקדמות של הילד (מהמכשיר / מהכיתה), עזרים, אודות

export default function Parents({ session, progress }: { session: StudentSession | null; progress: ProgressData }) {
  const [units, setUnits] = useState<UnitMeta[]>([]);
  const [plays, setPlays] = useState<Record<string, number>>({});
  useEffect(() => { loadCatalog().then(setUnits); fetchPlays().then(setPlays); }, []);

  const totalPlays = units.reduce((n, u) => n + (u.jigziPlays ?? 0) + (plays[u.id] ?? 0), 0);
  const isChild = session && session.token !== 'teacher-preview';

  return (
    <div className="page">
      <header className="teacher-bar">
        <button className="pill" onClick={() => nav(session ? '/map' : '/')}><IconArrowRight size={14} /> {session ? 'חזרה למפה' : 'לדף הבית'}</button>
        <button className="pill" onClick={() => nav('/teacher')}><IconBook size={14} /> כניסת מורים</button>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 1100, margin: '0 auto', padding: '4px 16px 24px' }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>להורים ולמורים</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0, lineHeight: 1.6, maxWidth: 760 }}>{ABOUT}</p>
        {isChild && units.length > 0 && <ChildReport session={session!} progress={progress} units={units} />}


        <section className="card" style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>איך מלווים</h2>
          <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.8, color: 'var(--ink)' }}>
            <li>מדפיסים את <a href={BOOKLET_PDF} target="_blank" rel="noopener noreferrer">החוברת המלווה</a> — אחרי כל תחנה כותבים את האותיות שלה בחוברת. בסוף כל תחנה יש קישור לעמוד המתאים.</li>
            <li>בטאבלט ובטלפון — מסובבים את המסך לרוחב. במחשב אפשר להגדיל למסך מלא (כפתור בפינה).</li>
            <li>כל תחנה מקבלת עד 5 כוכבים: לחיצה על כל הפריטים, הצלחה בניסיון הראשון ובלי דילוגים. אפשר לחזור לתחנה ולשפר — נשמרת התוצאה הטובה ביותר.</li>
            <li>לחיצה ארוכה על מונה השקפים (למעלה) פותחת מעבר לשקף מסוים — ומראה אילו שקפים עוד אפשר לשפר.</li>
          </ul>
        </section>

        <ResourcesPanel audience="parent" />
        {totalPlays > 0 && <PlaysChart units={units} plays={plays} />}
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 20 }}>{RIGHTS}</p>
      </main>
      <Footer />
    </div>
  );
}

function ChildReport({ session, progress, units }: { session: StudentSession; progress: ProgressData; units: UnitMeta[] }) {
  const done = units.filter((u) => progress.positions[u.id]?.completed);
  const visits = units.reduce((n, u) => n + (progress.positions[u.id]?.visits ?? 0), 0);
  const starsTotal = units.reduce((n, u) => n + (progress.positions[u.id] ? unitStars(u, progress) : 0), 0);
  const taught = new Set(units.flatMap((u) => u.skills));
  const known = SKILL_ORDER.filter((s) => taught.has(s) && skillLevel(s, units, progress) === 'known');
  return (
    <section className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 30 }} title={avatarName(session.emoji)}>{session.emoji}</span>
        <h2 style={{ fontSize: 19 }}>ההתקדמות של {session.nickname}</h2>
        <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
          {done.length} מתוך {units.length} תחנות · {starsTotal} כוכבים · {visits} כניסות
          {session.className ? ` · כיתה: ${session.className}` : ' · נשמר במכשיר הזה'}
        </span>
      </div>
      <div className="report-grid">
        {units.map((u) => {
          const p = progress.positions[u.id];
          return (
            <div key={u.id} className={`report-unit${p?.completed ? ' done' : p ? ' started' : ''}`}>
              <div className="ru-top">
                <b>{u.n}</b>
                <span dir="ltr" className="ru-title">{u.title}</span>
              </div>
              {p ? <StarRow stars={unitStars(u, progress)} size={13} /> : <span className="ru-none">עוד לא התחיל</span>}
              <div className="ru-meta">
                {p ? (p.completed ? 'הושלמה' : `בשקף ${p.slide + 1}/${u.slides}`) : ''}
                {p?.visits ? ` · ${p.visits} כניסות` : ''}
              </div>
              <a className="ru-print" href={pdfPage(BOOKLET_PDF, BOOKLET_PAGE[u.n])} target="_blank" rel="noopener noreferrer" title="הדף בחוברת">
                <IconPrint size={13} />
              </a>
            </div>
          );
        })}
      </div>
      {known.length > 0 && (
        <p style={{ margin: '12px 0 0', fontSize: 14 }}>
          <b>אותיות וצלילים שכבר מכיר/ה:</b>{' '}
          <span dir="ltr" style={{ fontFamily: "'Fredoka One', sans-serif", letterSpacing: 1 }}>{known.join(' · ')}</span>
        </p>
      )}
    </section>
  );
}

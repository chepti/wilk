import React, { useEffect, useState } from 'react';
import { nav } from '../App';
import type { ProgressData, StudentSession } from '../lib/api';
import { loadCatalog, type UnitMeta } from '../data/units';
import { unitStars } from '../data/stars';
import { gems as countGems } from '../data/rewards';
import { DEFAULT_LOOK, wearable } from '../data/pirates';
import Pirate from '../ui/Pirate';
import { IconArrowRight, IconPrint } from '../ui/icons';

// תעודת קפטן להדפסה — אחרי 6, 12 ו-18 תחנות. ניסוח בלשון זכר / נקבה לבחירה (נשמר במכשיר).

type G = 'm' | 'f';
const T = {
  m: { title: 'תעודת קפטן', done: 'השלים', got: 'אסף', bravo: 'כל הכבוד, קפטן!' },
  f: { title: 'תעודת קפטנית', done: 'השלימה', got: 'אספה', bravo: 'כל הכבוד, קפטנית!' },
};
const STAGE: Record<number, string> = { 6: 'שלב ראשון במסע', 12: 'שלב שני במסע', 18: 'סוף המסע — כל אותיות ה-ABC!' };

export default function Certificate({ level, session, progress }: { level: number; session: StudentSession; progress: ProgressData }) {
  const key = `wilk_cert_g_${session.nickname}_${session.emoji}`;
  const [g, setG] = useState<G>(() => { try { return (localStorage.getItem(key) as G) || 'm'; } catch { return 'm'; } });
  const [units, setUnits] = useState<UnitMeta[]>([]);
  useEffect(() => { loadCatalog().then(setUnits); }, []);
  const pick = (v: G) => { setG(v); try { localStorage.setItem(key, v); } catch { /* */ } };

  const done = units.filter((u) => progress.positions[u.id]?.completed).length;
  const stars = units.reduce((n, u) => n + (progress.positions[u.id] ? unitStars(u, progress) : 0), 0);
  const gems = countGems(units, progress);
  const look = progress.look ?? DEFAULT_LOOK;
  const t = T[g];
  const ok = done >= level;

  return (
    <div className="cert-page">
      <div className="cert-tools no-print">
        <button className="pill" onClick={() => nav('/map')}><IconArrowRight size={14} /> למפה</button>
        <div className="cert-g" role="group" aria-label="ניסוח">
          <button className={`pill${g === 'm' ? ' on' : ''}`} onClick={() => pick('m')}>קפטן</button>
          <button className={`pill${g === 'f' ? ' on' : ''}`} onClick={() => pick('f')}>קפטנית</button>
        </div>
        <button className="btn star small" onClick={() => window.print()} disabled={!ok}><IconPrint size={15} /> הדפסה</button>
      </div>
      {!ok && <p className="no-print" style={{ textAlign: 'center' }}>התעודה נפתחת אחרי {level} תחנות — עוד {level - done} לסיום!</p>}

      <article className="cert">
        <div className="cert-frame">
          <div className="cert-stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <svg key={i} width="34" height="34" viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" fill="#f5b82e" stroke="#8a5a00" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            ))}
          </div>
          <h1>{t.title}</h1>
          <p className="cert-stage">{STAGE[level] ?? `${level} תחנות`}</p>
          <div className="cert-body">
            <Pirate look={look} items={wearable(look, stars, gems)} size={120} />
            <div>
              <p className="cert-to">מוענקת ל</p>
              <p className="cert-name">{session.nickname}</p>
              <p>
                {t.done} {level} תחנות במסע <span dir="ltr" className="cert-en">English through the Stars</span>
                <br />ו{t.got} {stars} כוכבים ו-{gems} אבני חן בדרך.
              </p>
              <p className="cert-bravo">{t.bravo}</p>
            </div>
          </div>
          <footer className="cert-foot">
            <span>{new Date().toLocaleDateString('he-IL')}</span>
            <span>בשיטה של פנינה וילק · chepti.com/wilk</span>
          </footer>
        </div>
      </article>
    </div>
  );
}

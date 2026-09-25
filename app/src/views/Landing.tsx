import React, { useState } from 'react';
import { nav } from '../App';
import SkyStars from '../ui/Sky';
import Footer from '../ui/Footer';
import { BASE } from '../lib/mediaPaths';
import { IconUsers, IconPlay, IconBook, IconHeart, IconX } from '../ui/icons';

const LS_WELCOMED = 'wilk_welcomed';

function seen(): boolean {
  try { return localStorage.getItem(LS_WELCOMED) === '1'; } catch { return true; }
}

export default function Landing() {
  const [welcome, setWelcome] = useState(!seen());
  const close = () => { setWelcome(false); try { localStorage.setItem(LS_WELCOMED, '1'); } catch { /* */ } };

  return (
    <div className="night-sky">
      <SkyStars />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 580, width: '100%' }} className="float-up">
          {/* התיבות מהעמוד הקודם — משהו מוכר למי שהגיע מהגרסה הישנה */}
          <div className="landing-chests" aria-hidden="true">
            <img src={`${BASE}journey/chest-closed.webp`} alt="" />
            <img src={`${BASE}journey/chest-open.webp`} alt="" className="mid" />
            <img src={`${BASE}journey/chest-closed.webp`} alt="" />
          </div>
          <p style={{ fontSize: 19, margin: '6px 0 0', color: '#9fd4f5', fontWeight: 700 }}>לומדים לקרוא אנגלית — בשיטת וילק</p>
          <h1 dir="ltr" style={{ fontFamily: "'Fredoka One', 'Heebo', sans-serif", fontWeight: 400, fontSize: 'clamp(32px, 7vw, 52px)', margin: '4px 0 22px', letterSpacing: 0.5 }}>
            English through the Stars
          </h1>

          {welcome && (
            <div className="welcome-note pop-in" role="note">
              <button className="icon-btn" onClick={close} aria-label="סגירה"><IconX size={16} /></button>
              <b>ברוכים הבאים לבית החדש!</b>
              <p>
                אלה אותם 18 שיעורים, אותם סרטונים והקלטות — עכשיו כאן, בלי צורך בחשבון גוגל.
                חדש: מסע עם תיבות אוצר, כוכבים לכל שיעור, וממשיכים בדיוק מהמקום שבו עצרתם.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button className="btn star" style={{ minWidth: 270, fontSize: 20 }} onClick={() => { close(); nav('/join/guest'); }}>
              <IconPlay size={19} /> מתחילים כאן!
            </button>
            <button className="btn ghost" style={{ minWidth: 270 }} onClick={() => { close(); nav('/join'); }}>
              <IconUsers size={18} /> יש לי קוד כיתה
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn ghost small" onClick={() => nav('/parents')}>
                <IconHeart size={16} /> להורים · החוברת והעזרים
              </button>
              <button className="btn ghost small" onClick={() => nav('/teacher')}>
                <IconBook size={16} /> כניסת מורים
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer light />
    </div>
  );
}

import React from 'react';
import { nav } from '../App';
import SkyStars, { DrawnStar } from '../ui/Sky';
import Footer from '../ui/Footer';
import { IconUsers, IconPlay, IconBook, IconHeart } from '../ui/icons';

export default function Landing() {
  return (
    <div className="night-sky">
      <SkyStars />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 560 }} className="float-up">
          <DrawnStar size={92} />
          <h1 dir="ltr" style={{ fontFamily: "'Fredoka One', 'Heebo', sans-serif", fontWeight: 400, fontSize: 'clamp(34px, 7vw, 54px)', margin: '8px 0 4px', letterSpacing: 0.5 }}>
            English through the Stars
          </h1>
          <p style={{ fontSize: 20, opacity: 0.9, margin: '0 0 30px' }}>מסע האותיות באנגלית · 18 תחנות</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button className="btn star" style={{ minWidth: 260, fontSize: 19 }} onClick={() => nav('/join')}>
              <IconUsers size={20} /> יש לי קוד כיתה
            </button>
            <button className="btn ghost" style={{ minWidth: 260 }} onClick={() => nav('/join/guest')}>
              <IconPlay size={18} /> לשחק בלי כיתה
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn ghost small" onClick={() => nav('/teacher')}>
                <IconBook size={16} /> כניסת מורים
              </button>
              <button className="btn ghost small" onClick={() => nav('/parents')}>
                <IconHeart size={16} /> להורים · החוברת והעזרים
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer light />
    </div>
  );
}

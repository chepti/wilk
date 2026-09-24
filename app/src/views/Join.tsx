import React, { useState } from 'react';
import { joinClass, guestSession, type StudentSession } from '../lib/api';
import { nav } from '../App';
import { AVATARS } from '../data/avatars';
import SkyStars from '../ui/Sky';
import Footer from '../ui/Footer';
import { IconArrowRight, IconSparkles } from '../ui/icons';

// הזהות של תלמיד = שם פרטי + תמונה. התמונה היא "סיסמה קטנה":
// בכניסה הבאה בוחרים את אותה תמונה — כך כמה תלמידים חולקים מחשב בבטחה.

export default function Join({ onJoined, initialCode = '' }: { onJoined: (s: StudentSession) => void; initialCode?: string }) {
  const isGuest = initialCode === 'guest';
  const linkCode = isGuest ? '' : initialCode.replace(/\D/g, '');
  const [code, setCode] = useState(linkCode);
  const [nick, setNick] = useState('');
  const [emoji, setEmoji] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!isGuest && !code.trim()) { setErr('כתבו את קוד הכיתה שקיבלתם מהמורה'); return; }
    if (!nick.trim()) { setErr('כתבו את השם הפרטי שלכם'); return; }
    if (!emoji) { setErr('בחרו תמונה — היא הסימן הסודי שלכם לכניסה הבאה'); return; }
    if (isGuest) { onJoined(guestSession(nick.trim(), emoji)); return; }
    setBusy(true);
    try {
      onJoined(await joinClass(code.trim(), nick.trim(), emoji));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'שגיאה — נסו שוב');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="night-sky">
      <SkyStars seed={3} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <form className="card pop-in" onSubmit={submit} style={{ width: '100%', maxWidth: 440, textAlign: 'center', color: 'var(--ink)' }}>
          <h2 style={{ margin: '2px 0 4px' }}>{isGuest ? 'משחקים בלי כיתה' : 'הצטרפות לכיתה'}</h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginTop: 0 }}>
            {isGuest ? 'ההתקדמות נשמרת על המכשיר הזה' : linkCode ? 'הקוד כבר מולא — רק שם ותמונה' : 'קוד הכיתה מהמורה, שם פרטי ותמונה'}
          </p>

          {!isGuest && (
            <input
              className="field"
              style={{ textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: 800, marginBottom: 12 }}
              placeholder="קוד כיתה"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6} inputMode="numeric" dir="ltr" autoComplete="off"
            />
          )}
          <input
            className="field" style={{ textAlign: 'center', fontSize: 20 }}
            placeholder="השם הפרטי שלי" value={nick} maxLength={30}
            onChange={(e) => setNick(e.target.value)}
          />

          <p style={{ fontSize: 15, fontWeight: 700, margin: '16px 0 8px' }}>
            <span className="tip-host">
              בחרו את התמונה שלכם
              <span className="tip">בפעם הבאה תבחרו את אותה תמונה בדיוק — זכרו מה בחרתם!</span>
            </span>
          </p>
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a.e} type="button" onClick={() => setEmoji(a.e)}
                className={`avatar-btn${emoji === a.e ? ' on' : ''}`} aria-label={a.name}
              >
                <span className="e">{a.e}</span>
                <span className="n">{a.name}</span>
              </button>
            ))}
          </div>

          {err && <p className="err">{err}</p>}
          <button className="btn star" style={{ width: '100%', marginTop: 18, fontSize: 19 }} disabled={busy}>
            {busy ? 'רגע…' : 'יוצאים לדרך'} <IconSparkles size={19} />
          </button>
          <button type="button" className="pill" style={{ marginTop: 12, border: 'none' }} onClick={() => nav('/')}>
            <IconArrowRight size={15} /> חזרה
          </button>
        </form>
      </main>
      <Footer light />
    </div>
  );
}

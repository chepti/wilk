import React, { useCallback, useEffect, useState } from 'react';
import { loadSession, saveSession, fetchProgress, emptyProgress, type StudentSession, type ProgressData } from './lib/api';
import Landing from './views/Landing';
import Join from './views/Join';
import StarMap from './views/StarMap';
import Journey from './views/Journey';
import PathEdit from './views/PathEdit';
import PlayView from './views/PlayView';
import Teacher from './views/Teacher';
import Parents from './views/Parents';
import { BASE } from './lib/mediaPaths';

// ניתוב מבוסס hash — עובד בכל אחסון סטטי בלי הגדרות שרת.

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const fn = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return hash;
}

export function nav(to: string) {
  window.location.hash = to;
}

declare global { interface Window { gtag?: (...a: unknown[]) => void } }

export default function App() {
  const hash = useHash();
  const [session, setSession] = useState<StudentSession | null>(loadSession());
  const [progress, setProgress] = useState<ProgressData>(emptyProgress());

  useEffect(() => {
    window.gtag?.('event', 'page_view', { page_path: `${BASE}${hash}`, page_title: hash });
  }, [hash]);

  const refresh = useCallback(async () => {
    if (!session) return;
    try { setProgress(await fetchProgress(session)); } catch { /* שרת לא זמין — ממשיכים עם מה שיש */ }
  }, [session]);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const sync = () => setSession(loadSession());
    window.addEventListener('wilk-session', sync);
    return () => window.removeEventListener('wilk-session', sync);
  }, []);

  const logout = () => { saveSession(null); setSession(null); setProgress(emptyProgress()); nav('/'); };

  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const route = parts[0] || '';

  if (route === 'teacher') return <Teacher />;
  if (route === 'path-edit') return <PathEdit />;
  if (route === 'parents') return <Parents session={session} progress={progress} />;
  if (route === 'join') {
    return <Join initialCode={parts[1] || ''} onJoined={(s) => { setSession(s); nav('/map'); }} />;
  }
  if (!session) return <Landing />;
  if (route === 'unit' && parts[1]) {
    const jump = parts[2] && /^\d+$/.test(parts[2]) ? Math.max(0, +parts[2] - 1) : undefined;
    return <PlayView key={parts.slice(1, 3).join('/')} unitId={parts[1]} jump={jump} session={session} progress={progress} onReported={refresh} />;
  }
  if (route === 'stars') return <StarMap session={session} progress={progress} onLogout={logout} />;
  return <Journey session={session} progress={progress} onLogout={logout} />;
}

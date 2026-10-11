import React, { useEffect, useRef, useState } from 'react';
import { DRIVE_VIDEOS, driveEmbed } from '../data/driveVideos';
import { videoSource, chooseVideoSource, markYoutubeBlocked, onVideoSource } from '../lib/videoSource';
import { IconVideo } from '../ui/icons';
import type { CoverContent, PosterContent, VideoContent, EmbedSticker, YoutubeHost } from '../engine/types';
import { Backgrounds, Stickers, W, H, angle } from '../engine/Stage';
import { usePlay } from '../engine/play';
import { playVoice, stopVoice } from '../lib/audio';

// שער / פוסטר: מנגנים את שמע השקף; Auto/AfterAudio → מעבר אוטומטי בסיום.

export function Cover({ c, kind }: { c: CoverContent | PosterContent; kind: 'cover' | 'poster' }) {
  const play = usePlay();
  const next = c.play_settings?.next ?? (kind === 'cover' ? 'Auto' : 'ClickNext');
  useEffect(() => {
    if (!play.active) return;
    let alive = true;
    if (c.audio) {
      playVoice(c.audio.id).then(() => {
        if (alive && (next === 'Auto' || next === 'AfterAudio')) play.finish();
      });
    }
    return () => { alive = false; stopVoice(); };
  }, [play.active]);
  return (
    <>
      <Backgrounds theme={c.base.theme} layers={[c.base.backgrounds.layer_1, c.base.backgrounds.layer_2]} />
      <Stickers list={c.base.stickers} embed={(e) => <YoutubeSticker e={e} />} />
    </>
  );
}

export function VideoSlide({ c }: { c: VideoContent }) {
  return (
    <>
      <Backgrounds theme={c.base.theme} layers={[c.base.backgrounds.layer_1, c.base.backgrounds.layer_2]} />
      <Stickers list={c.base.stickers} embed={(e) => <YoutubeSticker e={e} />} />
    </>
  );
}

// ── יוטיוב (IFrame API) ──

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let ytReady: Promise<void> | null = null;
const YT_TIMEOUT = 7000;
/** נכשל אם הסקריפט חסום (סינון) או לא נטען תוך 7 שניות */
function loadYT(): Promise<void> {
  ytReady ??= new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => reject(new Error('blocked'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('timeout')), YT_TIMEOUT);
  }).catch((e) => { ytReady = null; throw e; }); // ניסיון חוזר אפשרי בשקף הבא
  return ytReady;
}

export function youtubeId(url: string): string | null {
  const u = url.trim();
  const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(u) ? u : null;
}

/** חלק מהסרטון שצפייה בו נחשבת לצפייה מלאה (כוכבים) */
const WATCHED = 0.7;

const EMBED_W = 960;
const EMBED_H = 540;

export function YoutubeSticker({ e }: { e: EmbedSticker['Embed'] }) {
  const yt = e.host.Youtube as YoutubeHost | undefined;
  const t = e.transform;
  const w = EMBED_W * t.scale[0];
  const h = EMBED_H * t.scale[1];
  const box: React.CSSProperties = {
    position: 'absolute', width: w, height: h,
    left: W / 2 + t.translation[0] * W - w / 2, top: H / 2 + t.translation[1] * H - h / 2,
    transform: `rotate(${angle(t)}rad)`, background: '#000', borderRadius: 6, overflow: 'hidden',
  };
  if (!yt) return <div style={box} />;
  return <div style={box}><VideoPlayer yt={yt} /></div>;
}

/** יוטיוב או אותו סרטון מדרייב — לפי המתג / הזיהוי האוטומטי / ברירת המחדל של הכיתה */
function VideoPlayer({ yt }: { yt: YoutubeHost }) {
  const id = youtubeId(yt.url);
  const driveId = id ? DRIVE_VIDEOS[id] : undefined;
  const [src, setSrc] = useState(videoSource());
  const [failed, setFailed] = useState(false);
  useEffect(() => onVideoSource(() => { setSrc(videoSource()); setFailed(false); }), []);
  if (driveId && src === 'drive') return <DrivePlayer id={driveId} />;
  if (failed) {
    return (
      <div className="video-blocked" dir="rtl">
        <IconVideo size={54} />
        <p>הסרטון לא נטען — כנראה שיוטיוב חסום ברשת הזו.</p>
        {driveId && <button className="btn star" onClick={() => chooseVideoSource('drive')}>צפייה מגוגל דרייב</button>}
      </div>
    );
  }
  return (
    <YoutubePlayer
      key={id ?? ''} yt={yt}
      onBlocked={() => { if (driveId) markYoutubeBlocked(); setFailed(true); }}
    />
  );
}

/** נגן דרייב: אין אירועי צפייה — נחשב "נצפה" לפי זמן על השקף */
function DrivePlayer({ id }: { id: string }) {
  const play = usePlay();
  const playRef = useRef(play);
  playRef.current = play;
  useEffect(() => {
    playRef.current.pending('עוד לא צפיתם בסרטון — כדאי לראות אותו, הוא עוזר לזכור את הצליל.');
    if (!play.active) return;
    // הסרטונים 20–60 שניות: 20 שניות על השקף ≈ רוב הסרטון
    const a = setTimeout(() => { playRef.current.progress(0.5); playRef.current.pending(null); }, 5000);
    const b = setTimeout(() => playRef.current.progress(1), 20000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [play.active]);
  return (
    <iframe
      src={driveEmbed(id)} title="סרטון" allow="autoplay; fullscreen" allowFullScreen
      style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#000' }}
    />
  );
}

function YoutubePlayer({ yt, onBlocked }: { yt: YoutubeHost; onBlocked: () => void }) {
  const play = usePlay();
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const activeRef = useRef(play.active);
  activeRef.current = play.active;
  const playRef = useRef(play); // אירועי יוטיוב נרשמים פעם אחת — צריך תמיד את הגרסה העדכנית
  playRef.current = play;
  const blockedRef = useRef(onBlocked);
  blockedRef.current = onBlocked;
  const watchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearInterval(watchTimer.current), []);
  const id = youtubeId(yt.url);

  useEffect(() => { playRef.current.pending('עוד לא צפיתם בסרטון — כדאי לראות אותו, הוא עוזר לזכור את הצליל.'); }, []);

  useEffect(() => {
    if (!id || !host.current) return;
    let alive = true;
    const el = document.createElement('div');
    host.current.appendChild(el);
    loadYT().then(() => {
      if (!alive) return;
      player.current = new window.YT.Player(el, {
        videoId: id, width: '100%', height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 0, rel: 0, modestbranding: 1, playsinline: 1, controls: 1,
          cc_load_policy: yt.captions ? 1 : 0,
          ...(yt.start_at ? { start: yt.start_at } : {}), ...(yt.end_at ? { end: yt.end_at } : {}),
        },
        events: {
          onReady: (ev: any) => {
            if (import.meta.env.DEV) (window as any).__wilkYT = ev.target; // לבדיקות בלבד (לא בבנייה לאתר)
            if (yt.muted) ev.target.mute();
            if (yt.autoplay && activeRef.current) ev.target.playVideo();
          },
          // 100/101/150 = הסרטון לא זמין / חסום להטמעה; 2/5 = מזהה / נגן — גם אז עוברים לדרייב
          onError: () => blockedRef.current(),
          onStateChange: (ev: any) => {
            if (ev.data === 1) {
              playRef.current.progress(0.5); // התחיל לצפות
              playRef.current.pending(null);
              // צפה ברוב הסרטון (70%) = נחשב כמלא, גם אם עבר הלאה לפני הסוף
              clearInterval(watchTimer.current);
              watchTimer.current = window.setInterval(() => {
                try {
                  const d = ev.target.getDuration(), t = ev.target.getCurrentTime();
                  if (d > 0 && t / d >= WATCHED) { playRef.current.progress(1); clearInterval(watchTimer.current); }
                } catch { /* */ }
              }, 1000);
            } else {
              clearInterval(watchTimer.current);
            }
            if (ev.data !== 0) return; // ended
            playRef.current.progress(1); // צפה עד הסוף
            if (yt.done_action === 'Loop') ev.target.playVideo();
            else if (yt.done_action === 'Next') playRef.current.finish();
          },
        },
      });
    }).catch(() => { if (alive) blockedRef.current(); });
    return () => { alive = false; try { player.current?.destroy(); } catch { /* */ } player.current = null; };
  }, [id]);

  // כשההוראות מסתיימות — מתחילים לנגן (אם autoplay)
  useEffect(() => {
    if (play.active && yt.autoplay) { try { player.current?.playVideo?.(); } catch { /* */ } }
  }, [play.active]);

  return <div ref={host} style={{ width: '100%', height: '100%' }} />;
}

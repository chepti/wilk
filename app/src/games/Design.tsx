import React, { useEffect, useRef } from 'react';
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
function loadYT(): Promise<void> {
  ytReady ??= new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytReady;
}

export function youtubeId(url: string): string | null {
  const u = url.trim();
  const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(u) ? u : null;
}

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
  return <div style={box}><YoutubePlayer yt={yt} /></div>;
}

function YoutubePlayer({ yt }: { yt: YoutubeHost }) {
  const play = usePlay();
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const activeRef = useRef(play.active);
  activeRef.current = play.active;
  const id = youtubeId(yt.url);

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
            if (yt.muted) ev.target.mute();
            if (yt.autoplay && activeRef.current) ev.target.playVideo();
          },
          onStateChange: (ev: any) => {
            if (ev.data !== 0) return; // ended
            if (yt.done_action === 'Loop') ev.target.playVideo();
            else if (yt.done_action === 'Next') play.finish();
          },
        },
      });
    });
    return () => { alive = false; try { player.current?.destroy(); } catch { /* */ } player.current = null; };
  }, [id]);

  // כשההוראות מסתיימות — מתחילים לנגן (אם autoplay)
  useEffect(() => {
    if (play.active && yt.autoplay) { try { player.current?.playVideo?.(); } catch { /* */ } }
  }, [play.active]);

  return <div ref={host} style={{ width: '100%', height: '100%' }} />;
}

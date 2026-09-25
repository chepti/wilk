import React, { useEffect, useRef, useState } from 'react';
import { nav } from '../App';
import { loadJourney, saveDraft, defaultStations, bgUrl, type JourneyConfig, type Pt } from '../data/journey';
import JourneyScene from '../ui/JourneyScene';
import { IconArrowRight, IconCopy, IconRotate, IconFile } from '../ui/icons';

// עורך מיקומי התחנות: גוררים את 18 הנקודות על הרקע, מעתיקים JSON ל-public/journey/journey.json.
// אפשר לטעון תמונת רקע מהמחשב לתצוגה מקדימה (לא עולה לשום מקום).

export default function PathEdit() {
  const [cfg, setCfg] = useState<JourneyConfig | null>(null);
  const [pts, setPts] = useState<Pt[]>([]);
  const [localBg, setLocalBg] = useState<{ url: string; name: string; ratio: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  useEffect(() => { loadJourney().then((c) => { setCfg(c); setPts(c.stations); }); }, []);
  if (!cfg) return null;

  const ratio = localBg?.ratio ?? cfg.ratio;
  const bg = localBg?.url ?? bgUrl(cfg);

  const move = (e: React.PointerEvent) => {
    if (drag.current === null || !board.current) return;
    const r = board.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    const i = drag.current;
    setPts((p) => p.map((q, k) => (k === i ? { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : q)));
  };
  const end = () => { if (drag.current !== null) { drag.current = null; saveDraft(pts); } };

  const json = JSON.stringify({ ...(localBg ? { bg: localBg.name } : cfg.bg ? { bg: cfg.bg } : {}), ratio: Math.round(ratio * 1000) / 1000, stations: pts }, null, 1);

  const pickBg = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => setLocalBg({ url, name: f.name, ratio: img.naturalHeight / img.naturalWidth });
    img.src = url;
  };

  return (
    <div className="page" style={{ background: '#0b1330', color: '#fff' }}>
      <header className="teacher-bar" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(11,19,48,0.92)' }}>
        <button className="pill" onClick={() => nav('/teacher')}><IconArrowRight size={14} /> ללוח המורה</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="pill" style={{ cursor: 'pointer' }}>
            <IconFile size={14} /> רקע לתצוגה מקדימה
            <input type="file" accept="image/*" hidden onChange={(e) => pickBg(e.target.files?.[0])} />
          </label>
          <button className="pill" onClick={() => { const d = defaultStations(); setPts(d); saveDraft(null); }}><IconRotate size={14} /> ברירת מחדל</button>
          <button className="pill" onClick={async () => { try { await navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ } }}>
            <IconCopy size={14} /> {copied ? 'הועתק' : 'העתקת JSON'}
          </button>
        </div>
      </header>
      <p style={{ textAlign: 'center', opacity: 0.8, margin: '8px 16px', fontSize: 14 }}>
        גוררים כל תחנה למקומה (1 למטה → 18 למעלה). השינוי נשמר במכשיר הזה ומוצג מיד במפה. לפרסום לכולם — שולחים את ה-JSON ואת קובץ הרקע.
      </p>
      <div
        ref={board} className="journey-board" style={{ height: 'auto', aspectRatio: `1 / ${ratio}`, marginTop: 0, touchAction: 'none' }}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      >
        {bg ? <img className="journey-bg" src={bg} alt="" /> : <JourneyScene ratio={ratio} />}
        <svg className="journey-path" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.4" strokeDasharray="1 1" vectorEffect="non-scaling-stroke" />
        </svg>
        {pts.map((p, i) => (
          <div
            key={i} className="edit-dot" style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onPointerDown={(e) => { drag.current = i; try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* */ } }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <pre dir="ltr" style={{ maxWidth: 760, margin: '16px auto', background: '#16224a', padding: 12, borderRadius: 12, fontSize: 12, overflow: 'auto', maxHeight: 200 }}>{json}</pre>
    </div>
  );
}

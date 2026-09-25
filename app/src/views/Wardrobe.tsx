import React, { useEffect, useState } from 'react';
import { nav } from '../App';
import { saveLook, type ProgressData, type StudentSession } from '../lib/api';
import { loadCatalog, type UnitMeta } from '../data/units';
import { unitStars } from '../data/stars';
import { BASES, ITEMS, DEFAULT_LOOK, nextItem, wearable, isOpen, type PirateLook } from '../data/pirates';
import { gems as countGems } from '../data/rewards';
import { GemGlyph } from '../ui/RewardIcons';
import Pirate from '../ui/Pirate';
import SkyStars from '../ui/Sky';
import { IconArrowRight, IconLock, IconCheck } from '../ui/icons';

// ארון השודד: בוחרים דמות, ועונדים פריטים שנפתחו בזכות הכוכבים שנאספו.

export default function Wardrobe({ session, progress, onSaved }: { session: StudentSession; progress: ProgressData; onSaved: () => void }) {
  const [units, setUnits] = useState<UnitMeta[]>([]);
  const [look, setLook] = useState<PirateLook>(progress.look ?? DEFAULT_LOOK);
  const [saved, setSaved] = useState(false);
  useEffect(() => { loadCatalog().then(setUnits); }, []);
  useEffect(() => { if (progress.look) setLook(progress.look); }, [progress.look]);

  const stars = units.reduce((n, u) => n + (progress.positions[u.id] ? unitStars(u, progress) : 0), 0);
  const gemCount = countGems(units, progress);
  const worn = wearable(look, stars, gemCount);
  const next = nextItem(stars);

  const update = (l: PirateLook) => {
    setLook(l);
    setSaved(false);
    saveLook(session, l).then(() => { setSaved(true); onSaved(); }).catch(() => {});
  };
  const toggle = (id: string) => {
    const it = ITEMS.find((x) => x.id === id)!;
    const others = look.items.filter((x) => x !== id && ITEMS.find((y) => y.id === x)?.slot !== it.slot);
    update({ ...look, items: look.items.includes(id) ? look.items.filter((x) => x !== id) : [...others, id] });
  };

  return (
    <div className="night-sky">
      <SkyStars seed={29} />
      <header className="teacher-bar">
        <button className="pill" onClick={() => nav('/map')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>
          <IconArrowRight size={14} /> למפה
        </button>
        <span style={{ fontSize: 13, opacity: 0.75 }}>{saved ? 'נשמר' : ''}</span>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 16px 30px', textAlign: 'center' }}>
        <div className="wardrobe-hero">
          <Pirate look={look} items={worn} size={150} />
          <div>
            <h1 style={{ fontSize: 26 }}>השודד/ת של {session.nickname}</h1>
            <p style={{ margin: '4px 0 0', opacity: 0.85 }}>
              <b style={{ color: '#ffc93c' }}>{stars}</b> כוכבים · <b style={{ color: '#7fd3ff' }}>{gemCount}</b> אבני חן
              {next ? <> · עוד <b style={{ color: '#ffc93c' }}>{next.stars - stars}</b> כוכבים ל{next.name}</> : ' · כל האוצרות נפתחו!'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.65 }}>אבן חן על כל תחנה עם 5 כוכבים · החברים בכיתה רואים את הדמות הזו — לא את התמונה הסודית שלך</p>
          </div>
        </div>

        <h2 className="wr-h">בוחרים דמות</h2>
        <div className="wr-grid">
          {BASES.map((b, i) => (
            <button key={i} className={`wr-card${look.base === i ? ' on' : ''}`} onClick={() => update({ ...look, base: i })} aria-label={b.name}>
              <Pirate look={{ base: i, items: [] }} size={64} />
            </button>
          ))}
        </div>

        <h2 className="wr-h">אוצרות לדמות</h2>
        <div className="wr-grid items">
          {ITEMS.map((it) => {
            const open = isOpen(it, stars, gemCount);
            const on = worn.includes(it.id);
            return (
              <button key={it.id} className={`wr-card item${on ? ' on' : ''}${open ? '' : ' locked'}`} disabled={!open} onClick={() => toggle(it.id)}>
                <Pirate look={{ base: look.base, items: [it.id] }} size={58} />
                <span className="wr-name">{it.name}</span>
                {open ? (on && <span className="wr-badge"><IconCheck size={12} strokeWidth={3} /></span>) : (
                  <span className="wr-lock"><IconLock size={12} /> {it.gems ? <>{it.gems} <GemGlyph size={11} /></> : it.stars}</span>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

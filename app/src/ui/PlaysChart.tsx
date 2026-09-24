import React, { useMemo, useState } from 'react';
import type { UnitMeta } from '../data/units';

// כניסות לכל תחנה, בכל האתר — סדרה אחת (עמודות), ריחוף עם פירוק: Jigzi (2023–2026) + האתר החדש.
// מפרט: עמודה ≤24px, קצה מעוגל 4px ובסיס ישר, רשת דקה ורצסיבית, תווית רק על הגבוהה, טבלה נגישה.

const BAR = '#3b5bdb'; // עבר validate_palette (light)
const H = 220, PADL = 44, PADB = 34, PADT = 18;

function niceMax(v: number): { max: number; step: number } {
  const raw = v / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return { max: Math.ceil(v / step) * step || step, step };
}

export default function PlaysChart({ units, plays }: { units: UnitMeta[]; plays: Record<string, number> }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = useMemo(() => units.map((u) => {
    const old = u.jigziPlays ?? 0, now = plays[u.id] ?? 0;
    return { u, old, now, total: old + now };
  }), [units, plays]);
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + r.total, 0);
  const top = rows.reduce((a, b) => (b.total > a.total ? b : a));
  const { max, step } = niceMax(top.total);
  const W = 720;
  const band = (W - PADL) / rows.length;
  const bw = Math.min(24, band * 0.6);
  const y = (v: number) => PADT + (H - PADT - PADB) * (1 - v / max);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const fmt = (n: number) => n.toLocaleString('he-IL');
  const h = hover !== null ? rows[hover] : null;

  return (
    <section className="card plays">
      <h2 style={{ fontSize: 18 }}>כניסות לכל תחנה</h2>
      <p className="plays-sub">{fmt(total)} כניסות מאז 2023 · כולל הגרסה הקודמת (Jigzi)</p>
      <div className="plays-wrap" dir="ltr" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`כניסות לכל תחנה. הכי הרבה: תחנה ${top.u.n}, ${fmt(top.total)}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PADL} x2={W} y1={y(t)} y2={y(t)} stroke="#e8ebf3" strokeWidth={1} />
              <text x={PADL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7590">{fmt(t)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = PADL + band * i + band / 2;
            const top0 = y(r.total), base = y(0);
            const hgt = Math.max(0, base - top0);
            const rr = Math.min(4, hgt);
            // קצה עליון מעוגל, בסיס ישר
            const d = `M${cx - bw / 2},${base} V${top0 + rr} Q${cx - bw / 2},${top0} ${cx - bw / 2 + rr},${top0} H${cx + bw / 2 - rr} Q${cx + bw / 2},${top0} ${cx + bw / 2},${top0 + rr} V${base} Z`;
            return (
              <g key={r.u.id} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} style={{ outline: 'none' }}>
                <rect x={PADL + band * i} y={PADT} width={band} height={H - PADT - PADB + 18} fill="transparent" />
                <path d={d} fill={BAR} opacity={hover === null || hover === i ? 1 : 0.45} />
                <text x={cx} y={H - PADB + 16} textAnchor="middle" fontSize="11.5" fill={hover === i ? '#16224a' : '#6b7590'} fontWeight={hover === i ? 800 : 500}>{r.u.n}</text>
                {r === top && <text x={cx} y={top0 - 6} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#16224a">{fmt(r.total)}</text>}
              </g>
            );
          })}
        </svg>
        {h && (
          <div className="plays-tip" style={{ left: `${((PADL + band * hover! + band / 2) / W) * 100}%` }} dir="rtl">
            <b>תחנה {h.u.n} · <span dir="ltr">{h.u.title}</span></b>
            <span>{fmt(h.total)} כניסות</span>
            <span className="muted">Jigzi: {fmt(h.old)} · באתר החדש: {fmt(h.now)}</span>
          </div>
        )}
      </div>
      <details className="plays-table">
        <summary>הצגה כטבלה</summary>
        <table>
          <thead><tr><th>תחנה</th><th>Jigzi (2023–2026)</th><th>האתר החדש</th><th>סה"כ</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u.id}><td>{r.u.n} · <span dir="ltr">{r.u.title}</span></td><td>{fmt(r.old)}</td><td>{fmt(r.now)}</td><td><b>{fmt(r.total)}</b></td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

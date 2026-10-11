import React, { useMemo, useState } from 'react';
import type { UnitMeta } from '../data/units';

// כניסות לכל תחנה, בכל האתר — עמודה מוערמת: Jigzi (2023–2026) למטה, האתר החדש מעליה בצבע משלו,
// ומתג "רק האתר החדש" בסקאלה משלו (ליד אלפי Jigzi הכניסות החדשות הן פס דק).
// מפרט: עמודה ≤24px, קצה עליון מעוגל 4px ובסיס ישר, רווח 2px בין המקטעים, מקרא לשתי סדרות, תווית רק על הגבוהה, טבלה נגישה.

const OLD = '#3b5bdb'; // Jigzi — הזוג עבר validate_palette (light): CVD ΔE 29, רגיל ΔE 37
const NEW = '#eb6834'; // האתר החדש
const H = 220, PADL = 44, PADB = 34, PADT = 18, GAP = 2;

/** עמודה עם קצה עליון מעוגל (r) ובסיס ישר */
function barPath(cx: number, bw: number, top: number, base: number, round: boolean): string {
  const hgt = Math.max(0, base - top);
  const r = round ? Math.min(4, hgt) : 0;
  const l = cx - bw / 2, rr = cx + bw / 2;
  return `M${l},${base} V${top + r} Q${l},${top} ${l + r},${top} H${rr - r} Q${rr},${top} ${rr},${top + r} V${base} Z`;
}

function niceMax(v: number): { max: number; step: number } {
  const raw = v / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return { max: Math.ceil(v / step) * step || step, step };
}

export default function PlaysChart({ units, plays }: { units: UnitMeta[]; plays: Record<string, number> }) {
  const [hover, setHover] = useState<number | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  const rows = useMemo(() => units.map((u) => {
    const old = u.jigziPlays ?? 0, now = plays[u.id] ?? 0;
    return { u, old, now, total: old + now };
  }), [units, plays]);
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + r.total, 0);
  const totalNew = rows.reduce((s, r) => s + r.now, 0);
  const val = (r: (typeof rows)[number]) => (onlyNew ? r.now : r.total);
  const top = rows.reduce((a, b) => (val(b) > val(a) ? b : a));
  const { max, step } = niceMax(Math.max(1, val(top)));
  const W = 720;
  const band = (W - PADL) / rows.length;
  const bw = Math.min(24, band * 0.6);
  const y = (v: number) => PADT + (H - PADT - PADB) * (1 - v / max);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const fmt = (n: number) => n.toLocaleString('he-IL');
  const h = hover !== null ? rows[hover] : null;

  return (
    <section className="card plays">
      <div className="plays-head">
        <h2 style={{ fontSize: 18 }}>כניסות לכל תחנה</h2>
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={!onlyNew} className={`pill${!onlyNew ? ' on' : ''}`} onClick={() => setOnlyNew(false)}>הכול</button>
          <button role="tab" aria-selected={onlyNew} className={`pill${onlyNew ? ' on' : ''}`} onClick={() => setOnlyNew(true)}>רק האתר החדש</button>
        </div>
      </div>
      <p className="plays-sub">
        {onlyNew ? `${fmt(totalNew)} כניסות באתר החדש (מאז המעבר מ-Jigzi, ספטמבר 2026)` : `${fmt(total)} כניסות מאז 2023 · מתוכן ${fmt(totalNew)} באתר החדש`}
      </p>
      {!onlyNew && (
        <div className="plays-legend">
          <span><i style={{ background: OLD }} /> Jigzi (2023–2026)</span>
          <span><i style={{ background: NEW }} /> האתר החדש</span>
        </div>
      )}
      <div className="plays-wrap" dir="ltr" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`כניסות לכל תחנה${onlyNew ? ' באתר החדש' : ''}. הכי הרבה: תחנה ${top.u.n}, ${fmt(val(top))}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PADL} x2={W} y1={y(t)} y2={y(t)} stroke="#e8ebf3" strokeWidth={1} />
              <text x={PADL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7590">{fmt(t)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = PADL + band * i + band / 2;
            const base = y(0);
            const op = hover === null || hover === i ? 1 : 0.45;
            const topY = y(val(r));
            let marks: React.ReactNode;
            if (onlyNew) {
              marks = <path d={barPath(cx, bw, topY, base, true)} fill={NEW} opacity={op} />;
            } else {
              // Jigzi למטה; האתר החדש מעליו, עם רווח 2px (המקטע העליון מקבל את הקצה המעוגל)
              const oldTop = y(r.old);
              const hasNew = r.now > 0 && oldTop - topY >= 1;
              marks = (
                <>
                  <path d={barPath(cx, bw, oldTop, base, !hasNew)} fill={OLD} opacity={op} />
                  {hasNew && <path d={barPath(cx, bw, topY, Math.max(topY, oldTop - GAP), true)} fill={NEW} opacity={op} />}
                </>
              );
            }
            return (
              <g key={r.u.id} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} style={{ outline: 'none' }}>
                <rect x={PADL + band * i} y={PADT} width={band} height={H - PADT - PADB + 18} fill="transparent" />
                {marks}
                <text x={cx} y={H - PADB + 16} textAnchor="middle" fontSize="11.5" fill={hover === i ? '#16224a' : '#6b7590'} fontWeight={hover === i ? 800 : 500}>{r.u.n}</text>
                {r === top && val(r) > 0 && <text x={cx} y={topY - 6} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#16224a">{fmt(val(r))}</text>}
              </g>
            );
          })}
        </svg>
        {h && (
          <div className="plays-tip" style={{ left: `${((PADL + band * hover! + band / 2) / W) * 100}%` }} dir="rtl">
            <b>תחנה {h.u.n} · <span dir="ltr">{h.u.title}</span></b>
            <span>{fmt(onlyNew ? h.now : h.total)} כניסות{onlyNew ? ' באתר החדש' : ''}</span>
            {!onlyNew && (
              <span className="muted">
                <i className="sw" style={{ background: OLD }} /> Jigzi: {fmt(h.old)} · <i className="sw" style={{ background: NEW }} /> באתר החדש: {fmt(h.now)}
              </span>
            )}
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

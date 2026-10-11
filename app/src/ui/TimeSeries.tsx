import React from 'react';

// גרף זמן לסדרה אחת (small multiple): קו 2px עם מילוי בהיר, רשת רצסיבית, קו ריחוף משותף לכל הגרפים
// באותו טווח (hover = אינדקס יום), ותווית ערך רק על המקסימום. טבלה נגישה — בעמוד האדמין.

const LINE = '#3b5bdb'; // אותו כחול של גרף התחנות (עבר validate_palette, light)
const W = 520, H = 170, PADL = 40, PADR = 10, PADT = 16, PADB = 24;

function niceMax(v: number): { max: number; step: number } {
  const raw = Math.max(1, v) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return { max: Math.ceil(Math.max(1, v) / step) * step, step: Math.max(1, Math.round(step)) };
}

export interface SeriesPoint { label: string; value: number }

export default function TimeSeries({ title, total, points, hover, onHover, unit }: {
  title: string;
  total: string;
  points: SeriesPoint[];
  hover: number | null;
  onHover: (i: number | null) => void;
  unit: string;
}) {
  const n = points.length;
  const top = points.reduce((a, p, i) => (p.value > points[a].value ? i : a), 0);
  const { max, step } = niceMax(points[top]?.value ?? 1);
  const x = (i: number) => PADL + (n <= 1 ? (W - PADL - PADR) / 2 : ((W - PADL - PADR) * i) / (n - 1));
  const y = (v: number) => PADT + (H - PADT - PADB) * (1 - v / max);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = n ? `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const fmt = (v: number) => v.toLocaleString('he-IL');
  const h = hover !== null && hover < n ? points[hover] : null;

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = n <= 1 ? 0 : Math.round(((px - PADL) / (W - PADL - PADR)) * (n - 1));
    onHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="ts">
      <div className="ts-head">
        <h3>{title}</h3>
        <b>{h ? `${fmt(h.value)} ${unit}` : total}</b>
        <span className="muted">{h ? h.label : ''}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`} width="100%" direction="ltr" role="img" aria-label={`${title}: ${total}`}
        onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => onHover(null)}
        style={{ touchAction: 'pan-y', display: 'block' }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PADL} x2={W - PADR} y1={y(t)} y2={y(t)} stroke="#e8ebf3" strokeWidth={1} />
            <text x={PADL - 6} y={y(t) + 4} textAnchor="end" fontSize="12.5" fill="#6b7590">{fmt(t)}</text>
          </g>
        ))}
        {points.map((p, i) => (i === n - 1 ? (n - 1) % labelEvery >= labelEvery / 2 || n === 1 : i % labelEvery === 0) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="12.5" fill="#6b7590">{p.label}</text>
        ))}
        <path d={area} fill={LINE} opacity={0.12} />
        <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {n > 0 && points[top].value > 0 && hover === null && (
          <g>
            <circle cx={x(top)} cy={y(points[top].value)} r={4} fill={LINE} stroke="#fff" strokeWidth={2} />
            <text x={x(top)} y={y(points[top].value) - 9} textAnchor="middle" fontSize="13" fontWeight="700" fill="#16224a">{fmt(points[top].value)}</text>
          </g>
        )}
        {h && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={PADT} y2={y(0)} stroke="#16224a" strokeOpacity={0.35} strokeWidth={1} />
            <circle cx={x(hover!)} cy={y(h.value)} r={5} fill={LINE} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  );
}

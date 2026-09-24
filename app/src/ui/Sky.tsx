import React, { useMemo } from 'react';

/** שכבת כוכבים מנצנצים לרקע — SVG, בלי תמונות */
export default function SkyStars({ count = 70, seed = 7 }: { count?: number; seed?: number }) {
  const stars = useMemo(() => {
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: count }, () => ({
      x: rnd() * 100, y: rnd() * 100, r: 0.6 + rnd() * 1.6, d: 2 + rnd() * 4, o: rnd() * 4,
    }));
  }, [count, seed]);
  return (
    <svg className="sky-stars" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      {stars.map((st, i) => (
        <circle
          key={i} cx={`${st.x}%`} cy={`${st.y}%`} r={st.r} fill="#fff"
          style={{ animation: `twinkle ${st.d}s ease-in-out ${st.o}s infinite` }}
        />
      ))}
    </svg>
  );
}

/** כוכב מצויר רב-שכבתי (קו מתאר + מילוי + הדגשה) */
export function DrawnStar({ size = 64, fill = '#f5b82e', glow = true }: { size?: number; fill?: string; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {glow && <circle cx="32" cy="33" r="26" fill={fill} opacity="0.18" />}
      <path
        d="M32 6.5l7.3 15.6 16.9 2-12.5 11.6 3.3 16.8L32 44.1l-14.9 8.4 3.3-16.8L7.8 24.1l16.9-2z"
        fill={fill} stroke="#7a4d00" strokeWidth="2.6" strokeLinejoin="round"
      />
      <path d="M32 13l4.6 9.9 10.7 1.3" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

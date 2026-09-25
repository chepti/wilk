import React, { useMemo } from 'react';

// רקע מצויר למסע (עד שיהיה רקע מאויר): מאי אוצר בים למטה → גבעות → עננים → שמי כוכבים וירח למעלה.
// viewBox 1000×(1000*ratio); כל השכבות SVG עם קו מתאר.

export default function JourneyScene({ ratio }: { ratio: number }) {
  const H = 1000 * ratio;
  const stars = useMemo(() => {
    let s = 17;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    // צפופים למעלה, מתדלדלים לכיוון העננים
    return Array.from({ length: 170 }, () => {
      const t = rnd() ** 1.7;
      return { x: rnd() * 1000, y: t * H * 0.6, r: 1 + rnd() * 2.6, o: 0.4 + rnd() * 0.6, d: 2 + rnd() * 4 };
    });
  }, [H]);
  const Y = (f: number) => f * H; // מיקום יחסי לגובה

  return (
    <svg className="journey-scene" viewBox={`0 0 1000 ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="js-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1330" />
          <stop offset="0.32" stopColor="#1d2c6b" />
          <stop offset="0.55" stopColor="#3f63c9" />
          <stop offset="0.74" stopColor="#8fc8f2" />
          <stop offset="0.86" stopColor="#c9ecff" />
        </linearGradient>
        <linearGradient id="js-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3aa7df" />
          <stop offset="1" stopColor="#1b6fb3" />
        </linearGradient>
        <radialGradient id="js-moon" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="1" stopColor="#f3d98a" />
        </radialGradient>
        <radialGradient id="js-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6c9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff6c9" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1000" height={H} fill="url(#js-sky)" />

      {/* כוכבים */}
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" opacity={st.o}
          style={{ animation: `twinkle ${st.d}s ease-in-out ${(i % 7) * 0.5}s infinite` }} />
      ))}

      {/* ירח */}
      <circle cx="210" cy={Y(0.045)} r="150" fill="url(#js-glow)" />
      <circle cx="210" cy={Y(0.045)} r="62" fill="url(#js-moon)" stroke="#caa54a" strokeWidth="4" />
      <circle cx="190" cy={Y(0.04)} r="11" fill="#e8cf7c" opacity="0.8" />
      <circle cx="228" cy={Y(0.055)} r="7" fill="#e8cf7c" opacity="0.7" />

      {/* כוכב לכת עם טבעת */}
      <g transform={`translate(840 ${Y(0.24)}) rotate(-18)`}>
        <ellipse cx="0" cy="0" rx="92" ry="22" fill="none" stroke="#b8a6ff" strokeWidth="9" opacity="0.8" />
        <circle cx="0" cy="0" r="46" fill="#8f7bf0" stroke="#4a3aa8" strokeWidth="4" />
        <path d="M-38,-12 a46,46 0 0 1 50,-30" stroke="#c9bdff" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M-92,0 a92,22 0 0 0 184,0" fill="none" stroke="#b8a6ff" strokeWidth="9" />
      </g>

      {/* כוכב נופל */}
      <g transform={`translate(560 ${Y(0.12)}) rotate(24)`} opacity="0.9">
        <path d="M0,0 L-150,0" stroke="url(#js-glow)" strokeWidth="6" strokeLinecap="round" />
        <path d="M0,-9 l3,6 6,1 -4.5,4 1,6.5 -5.5,-3 -5.5,3 1,-6.5 -4.5,-4 6,-1z" fill="#fff6c9" stroke="#e0b53a" strokeWidth="1.5" />
      </g>

      {/* עננים */}
      {[
        [120, 0.55, 1.3], [520, 0.585, 1.8], [860, 0.545, 1.1], [300, 0.63, 1.5], [760, 0.655, 1.6], [60, 0.7, 1.2],
      ].map(([x, yf, s], i) => (
        <g key={i} transform={`translate(${x} ${Y(yf)}) scale(${s})`} opacity={0.92}>
          <path d="M-90,20 q-10,-36 26,-40 q10,-40 52,-30 q26,-30 60,-2 q40,-6 42,32 q30,6 22,40 z"
            fill="#ffffff" stroke="#b9d6f2" strokeWidth="3" strokeLinejoin="round" />
          <path d="M-60,4 q20,-10 40,0" stroke="#e3f0fc" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* גבעות */}
      <path d={`M0,${Y(0.8)} C200,${Y(0.765)} 380,${Y(0.79)} 520,${Y(0.775)} S860,${Y(0.755)} 1000,${Y(0.78)} V${Y(0.9)} H0 Z`}
        fill="#7fc97a" stroke="#4f9a4d" strokeWidth="4" />
      <path d={`M0,${Y(0.83)} C180,${Y(0.81)} 360,${Y(0.84)} 560,${Y(0.82)} S880,${Y(0.815)} 1000,${Y(0.835)} V${Y(0.9)} H0 Z`}
        fill="#5fb65c" stroke="#3f8a3e" strokeWidth="4" />
      {/* עצים קטנים על הגבעות */}
      {[[140, 0.79], [700, 0.768], [880, 0.79], [380, 0.815]].map(([x, yf], i) => (
        <g key={i} transform={`translate(${x} ${Y(yf)})`}>
          <rect x="-5" y="0" width="10" height="26" rx="3" fill="#8a5a2b" stroke="#5c3a18" strokeWidth="2.5" />
          <circle cx="0" cy="-8" r="24" fill="#3f9e46" stroke="#2a6e30" strokeWidth="3" />
          <circle cx="-8" cy="-14" r="7" fill="#6cc271" opacity="0.8" />
        </g>
      ))}

      {/* ים */}
      <path d={`M0,${Y(0.865)} q60,-14 125,0 t125,0 t125,0 t125,0 t125,0 t125,0 t125,0 t125,0 V${H} H0 Z`}
        fill="url(#js-sea)" stroke="#1a5f99" strokeWidth="4" />
      {[0.9, 0.935, 0.97].map((yf, i) => (
        <path key={i} d={`M${-40 + i * 30},${Y(yf)} q50,-12 100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0`}
          fill="none" stroke="#bfe7ff" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      ))}

      {/* אי האוצר — נקודת ההתחלה */}
      <g transform={`translate(500 ${Y(0.93)})`}>
        <ellipse cx="0" cy="18" rx="270" ry="58" fill="#1b6fb3" opacity="0.35" />
        <ellipse cx="0" cy="0" rx="250" ry="62" fill="#f4d58d" stroke="#c79a3f" strokeWidth="5" />
        <ellipse cx="-40" cy="-14" rx="120" ry="20" fill="#fae6b0" opacity="0.8" />
        {/* דקל */}
        <g transform="translate(170 -30)">
          <path d="M0,0 C6,-50 -4,-100 12,-150" stroke="#8a5a2b" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M0,0 C6,-50 -4,-100 12,-150" stroke="#b07a3f" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="6 10" />
          {[-150, -100, -40, 20, 70].map((a, i) => (
            <path key={i} transform={`translate(12 -150) rotate(${a})`} d="M0,0 q40,-26 92,-6 q-40,4 -92,6z"
              fill="#43a047" stroke="#2e7d32" strokeWidth="3" strokeLinejoin="round" />
          ))}
        </g>
      </g>
    </svg>
  );
}

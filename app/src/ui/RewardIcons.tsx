import React from 'react';

// אייקונים מצוירים לתגמולים — SVG רב-שכבתי עם קו מתאר

export function GemGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-2px' }}>
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#3aa7df" stroke="#0e4f7a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M2 9h20M8 3l4 18 4-18M6 3l2 6M18 3l-2 6" fill="none" stroke="#bfe7ff" strokeWidth="1.1" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

/** להבת התמדה — דולקת כשעמדו ביעד השבועי */
export function Flame({ lit, size = 22 }: { lit: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.6-4.6 3-6 .3 2 1.3 3 2.3 3-1-3 .2-6.5.7-9z"
        fill={lit ? '#ff8a2a' : 'rgba(255,255,255,0.18)'} stroke={lit ? '#9a3b00' : 'rgba(255,255,255,0.5)'} strokeWidth="1.6" strokeLinejoin="round" />
      {lit && <path d="M12 12c.6 2 3 3 3 5.2a3 3 0 0 1-6 0c0-1.4.8-2.2 1.6-3 .2 1 .8 1.4 1.3 1.4-.4-1.4.1-2.6.1-3.6z" fill="#ffd54a" />}
    </svg>
  );
}

/** בקבוק עם פתק — "האות קוראת לך" */
export function Bottle({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g transform="rotate(-28 24 24)">
        <rect x="19" y="4" width="10" height="7" rx="2" fill="#b07a3f" stroke="#5c3a18" strokeWidth="2" />
        <path d="M20 11h8v5c5 2 8 6 8 12v12a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V28c0-6 3-10 8-12z"
          fill="rgba(160,225,255,0.55)" stroke="#1a5f99" strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="17" y="24" width="14" height="12" rx="2" fill="#fbe7b0" stroke="#8a5a2b" strokeWidth="1.6" />
        <path d="M19.5 28h9M19.5 31.5h6" stroke="#8a5a2b" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M15 20c2-2 4-2.6 6-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" fill="none" />
      </g>
    </svg>
  );
}

import React from 'react';
import { BASES, type PirateLook } from '../data/pirates';

// שודד/ת ים בסיסי ב-SVG עם קו מתאר; האבזרים שכבות מעל. זמני — עד שיגיעו איורים.

export default function Pirate({ look, size = 64, items }: { look: PirateLook; size?: number; items?: string[] }) {
  const b = BASES[look.base] ?? BASES[0];
  const has = (id: string) => (items ?? look.items).includes(id);
  const O = '#2b1d12'; // קו מתאר
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" aria-hidden="true" className="pirate">
      {/* גוף */}
      {has('coat') ? (
        <path d="M18,112 C18,84 30,72 50,72 C70,72 82,84 82,112 Z" fill="#7b1e1e" stroke={O} strokeWidth="3" />
      ) : (
        <path d="M22,112 C22,86 32,74 50,74 C68,74 78,86 78,112 Z" fill={b.shirt} stroke={O} strokeWidth="3" />
      )}
      {!has('coat') && [84, 94, 104].map((y) => <path key={y} d={`M${30 + (y - 84) * 0.2},${y} H${70 - (y - 84) * 0.2}`} stroke="#fff" strokeWidth="3" opacity="0.55" />)}
      {has('coat') && <path d="M50,74 V112 M44,86 h-3 M44,96 h-3 M56,86 h3 M56,96 h3" stroke="#f1c40f" strokeWidth="3" strokeLinecap="round" />}

      {/* ראש */}
      <circle cx="50" cy="46" r="26" fill={b.skin} stroke={O} strokeWidth="3" />
      <circle cx="41" cy="48" r="3.2" fill={O} />
      {has('patch') ? (
        <>
          <path d="M26,38 L74,50" stroke={O} strokeWidth="2.5" />
          <ellipse cx="59" cy="47.5" rx="7" ry="6" fill={O} />
        </>
      ) : <circle cx="59" cy="48" r="3.2" fill={O} />}
      <path d="M42,58 q8,7 16,0" stroke={O} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="35" cy="55" r="4" fill="#ff8a80" opacity="0.5" />
      <circle cx="65" cy="55" r="4" fill="#ff8a80" opacity="0.5" />
      {has('earring') && <circle cx="24" cy="54" r="4.5" fill="none" stroke="#f1c40f" strokeWidth="3" />}

      {/* כיסוי ראש: כתר / כובע / בנדנה */}
      {has('goldhat') ? (
        <>
          <path d="M14,32 C26,8 74,8 86,32 C70,26 30,26 14,32 Z" fill="#f1c40f" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M22,29 C36,24 64,24 78,29" stroke="#fff6c9" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M50,12 l3,6 6,1 -4.5,4 1,6 -5.5,-3 -5.5,3 1,-6 -4.5,-4 6,-1z" fill="#3aa7df" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      ) : has('crown') ? (
        <path d="M28,28 L32,10 L41,22 L50,6 L59,22 L68,10 L72,28 Z" fill="#f1c40f" stroke={O} strokeWidth="3" strokeLinejoin="round" />
      ) : has('hat') ? (
        <>
          <path d="M14,32 C26,10 74,10 86,32 C70,26 30,26 14,32 Z" fill="#2c2c2c" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="50" cy="22" r="4" fill="#fff" stroke={O} strokeWidth="1.5" />
          <path d="M46,20 l8,5 M54,20 l-8,5" stroke={O} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path d="M24,40 C24,18 76,18 76,40 C62,33 38,33 24,40 Z" fill={b.band} stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M75,36 l12,-4 -4,10 z" fill={b.band} stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          {[36, 50, 64].map((x) => <circle key={x} cx={x} cy="29" r="2.4" fill="#fff" opacity="0.8" />)}
        </>
      )}

      {/* כתף: תוכי */}
      {has('parrot') && (
        <g transform="translate(78 64)">
          <ellipse cx="0" cy="0" rx="9" ry="12" fill="#27ae60" stroke={O} strokeWidth="2.5" />
          <circle cx="0" cy="-12" r="7" fill="#e74c3c" stroke={O} strokeWidth="2.5" />
          <path d="M5,-13 l6,2 -6,3 z" fill="#f39c12" stroke={O} strokeWidth="1.5" />
          <circle cx="1" cy="-14" r="1.5" fill={O} />
        </g>
      )}

      {/* יד: דגל / תיבת זהב / חרב / משקפת / מפה (פריט יד אחד) */}
      {has('flag') ? (
        <g transform="translate(16 92)">
          <rect x="-2" y="-52" width="4" height="54" rx="2" fill="#8a5a2b" stroke={O} strokeWidth="2" />
          <path d="M2,-50 h24 l-6,9 6,9 h-24 z" fill="#2c2c2c" stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="-41" r="4" fill="#fff" />
          <path d="M7,-35 l10,0 M8,-37 l8,4 M16,-37 l-8,4" stroke="#fff" strokeWidth="1.5" />
        </g>
      ) : has('goldchest') ? (
        <g transform="translate(15 92)">
          <rect x="-13" y="-14" width="26" height="16" rx="2" fill="#f1c40f" stroke={O} strokeWidth="2.5" />
          <path d="M-13,-14 q13,-12 26,0" fill="#f7dc6f" stroke={O} strokeWidth="2.5" />
          <rect x="-3" y="-11" width="6" height="7" rx="1" fill="#b9770e" stroke={O} strokeWidth="1.5" />
          <circle cx="-7" cy="-20" r="3" fill="#3aa7df" stroke={O} strokeWidth="1" />
          <circle cx="6" cy="-21" r="2.5" fill="#3aa7df" stroke={O} strokeWidth="1" />
        </g>
      ) : has('sword') ? (
        <g transform="translate(16 80) rotate(-35)">
          <rect x="-2.5" y="-30" width="5" height="30" rx="2" fill="#dfe6e9" stroke={O} strokeWidth="2" />
          <rect x="-8" y="0" width="16" height="4" rx="2" fill="#f1c40f" stroke={O} strokeWidth="2" />
        </g>
      ) : has('scope') ? (
        <g transform="translate(14 78) rotate(-25)">
          <rect x="-4" y="-22" width="8" height="24" rx="3" fill="#b9770e" stroke={O} strokeWidth="2.5" />
          <rect x="-5" y="-26" width="10" height="6" rx="2" fill="#f1c40f" stroke={O} strokeWidth="2" />
        </g>
      ) : has('map') ? (
        <g transform="translate(14 84) rotate(-8)">
          <rect x="-11" y="-12" width="22" height="18" rx="2" fill="#fbe7b0" stroke={O} strokeWidth="2.5" />
          <path d="M-6,-6 l4,4 4,-4 4,6" stroke="#c0392b" strokeWidth="2" fill="none" strokeDasharray="2 2" />
          <path d="M5,0 l3,3 M8,0 l-3,3" stroke="#c0392b" strokeWidth="2" />
        </g>
      ) : null}
    </svg>
  );
}

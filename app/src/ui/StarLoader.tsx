import React from 'react';

/** טוען כוכבי: כוכב גדול פועם, וכוכבים קטנים מקיפים אותו */
export default function StarLoader({ label = 'טוענים את התחנה…' }: { label?: string }) {
  return (
    <div className="star-loader" role="status" aria-live="polite">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <g className="sl-orbit">
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <path key={i} transform={`translate(${60 + Math.cos(a) * 46} ${60 + Math.sin(a) * 46}) scale(${0.32 + (i % 2) * 0.12})`}
                d="M0,-12 l3.5,7.4 8.1,1 -6,5.5 1.6,8 -7.2,-4 -7.2,4 1.6,-8 -6,-5.5 8.1,-1z"
                fill="#ffe08a" stroke="#8a5a00" strokeWidth="2.5" strokeLinejoin="round" />
            );
          })}
        </g>
        <g className="sl-core">
          <circle cx="60" cy="61" r="26" fill="#ffc93c" opacity="0.18" />
          <path d="M60 30l8.3 17.7 19.2 2.3-14.2 13.2 3.7 19.1L60 72.9l-17 9.4 3.7-19.1-14.2-13.2 19.2-2.3z"
            fill="#ffc93c" stroke="#8a5a00" strokeWidth="3" strokeLinejoin="round" />
          <path d="M60 37.5l5 10.8 11.7 1.4" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </svg>
      <span>{label}</span>
    </div>
  );
}

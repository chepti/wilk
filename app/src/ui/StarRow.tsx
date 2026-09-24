import React from 'react';

/** 5 כוכבים — מלאים לפי הציון, השאר בשקיפות. SVG מצויר עם קו מתאר */
export default function StarRow({ stars, size = 18, animate = false, light = false }: {
  stars: number; size?: number; animate?: boolean; light?: boolean;
}) {
  return (
    <span className={`star-row${animate ? ' animate' : ''}`} role="img" aria-label={`${stars} מתוך 5 כוכבים`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const on = i < stars;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ animationDelay: `${0.15 + i * 0.18}s`, opacity: on ? 1 : light ? 0.28 : 0.22 }}>
            <path
              d="M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z"
              fill={on ? '#f5b82e' : light ? '#fff' : '#c7cde0'}
              stroke={on ? '#8a5a00' : light ? 'rgba(255,255,255,0.8)' : '#8b93ad'}
              strokeWidth="1.6" strokeLinejoin="round"
            />
            {on && <path d="M12 5.4l1.5 3.2" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.4" strokeLinecap="round" />}
          </svg>
        );
      })}
    </span>
  );
}

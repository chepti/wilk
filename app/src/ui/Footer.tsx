import React from 'react';
import { IconMessage } from './icons';

const FEEDBACK_MAIL = 'chepti@gmail.com';

export function feedbackMailto(subject = 'משוב — English through the Stars') {
  return `mailto:${FEEDBACK_MAIL}?subject=${encodeURIComponent(subject)}`;
}

/** פוטר קבוע: קרדיט לשיטה, קרדיט חולמים תקשוב, כפתור משוב */
export default function Footer({ light = false }: { light?: boolean }) {
  return (
    <footer className={`site-footer${light ? ' light' : ''}`}>
      <span className="credit">
        <span className="tip-host">
          לפי השיטה של <b>פנינה וילק</b>
          <span className="tip">English through the Stars — השיטה האנלוגית והספר של פנינה וילק. הגרסה הדיגיטלית באישורה.</span>
        </span>
        <span className="dot">·</span>
        גרסה דיגיטלית: חפציה בן ארצי ·{' '}
        <a href="https://chepti.com" target="_blank" rel="noopener noreferrer">חולמים תקשוב</a>
      </span>
      <a className="pill feedback" href={feedbackMailto()}>
        <IconMessage size={15} /> משוב
      </a>
    </footer>
  );
}

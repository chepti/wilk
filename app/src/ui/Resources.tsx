import React from 'react';
import { RESOURCES, BOOKLET_PDF, pdfPage, type ResourceIcon } from '../data/resources';
import { BASE } from '../lib/mediaPaths';
import { IconPrint, IconFile, IconPresentation, IconChat, IconClipboard, IconPen, IconVideo, IconMessage } from './icons';

const ICONS: Record<ResourceIcon, (p: { size?: number }) => JSX.Element> = {
  print: IconPrint, book: IconFile, text: IconFile, slides: IconPresentation, chat: IconChat,
  check: IconClipboard, pen: IconPen, video: IconVideo, message: IconMessage,
};

/** עמודי חוברת הכתיבה לפי האותיות שבהם */
const BOOKLET_PAGES: [number, string][] = [
  [1, 't · c · a · s'], [2, 'r · h · f · m'], [3, 'n · o · p · e'], [4, 'k · b · g · l'],
  [5, 'd · i · v · x'], [6, 'j · z · u · q'], [7, 'y · w'],
];

export default function ResourcesPanel({ audience }: { audience: 'teacher' | 'parent' }) {
  const list = RESOURCES.filter((r) => r.audience.includes(audience));
  return (
    <section className="res">
      <h2>{audience === 'teacher' ? 'עזרים למורה' : 'עזרים להורים'}</h2>
      <p>{audience === 'teacher' ? 'כל מה שמלווה את התוכנית בכיתה' : 'כדי ללוות את הילדים גם מחוץ למסך'}</p>
      <div className="res-grid">
        {list.map((r) => {
          const Ic = ICONS[r.icon];
          return (
            <article key={r.id} className={`res-card${r.featured ? ' featured' : ''}`}>
              {r.previews && (
                <a className={`res-preview ${r.previewKind === 'page' ? 'pages' : 'wide'}`} href={r.links[0].href} target="_blank" rel="noopener noreferrer" aria-hidden="true" tabIndex={-1}>
                  {r.previews.map((p) => <img key={p} src={`${BASE}previews/${p}.webp`} alt="" loading="lazy" />)}
                </a>
              )}
              <div className="res-body">
              <h3><span className="ic"><Ic size={18} /></span>{r.title}</h3>
              <p>{r.desc}</p>
              {r.id === 'booklet' && (
                <div className="res-pages" dir="ltr">
                  {BOOKLET_PAGES.map(([pg, letters]) => (
                    <a key={pg} className="pill" href={pdfPage(BOOKLET_PDF, pg)} target="_blank" rel="noopener noreferrer" title={`עמוד ${pg}`}>
                      {letters}
                    </a>
                  ))}
                </div>
              )}
              <div className="res-links">
                {r.links.map((l) => (
                  <a key={l.href} className={`btn small${r.featured ? ' star' : ' secondary'}`} href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                  </a>
                ))}
              </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
